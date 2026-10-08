import { DerivedMetrics } from "../models/DerivedMetrics";
import { Product } from "../models/Product";
import { isPeer } from "./peers";

/** Each goal is one metric and a direction. There is deliberately no combined score. */
export const GOALS = {
  protein: { metric: "proteinGPer1000kcal", better: "higher" },
  price: { metric: "pricePer1000kcal", better: "lower" },
} as const;

export type Goal = keyof typeof GOALS;
export type GoalMetric = (typeof GOALS)[Goal]["metric"];

export interface Alternative {
  product: Product;
  /** The alternative's value for the goal's metric. */
  value: number;
  /** value minus the current food's value; negative means lower. */
  delta: number;
  /** delta as a percentage of the current value; absent when the current value is zero. */
  deltaPct?: number;
}

export interface AlternativesResult {
  goal: Goal;
  metric: GoalMetric;
  better: "higher" | "lower";
  currentValue?: number;
  /** Peers that have a value for the metric, whether or not they beat the current food. */
  peerCount: number;
  alternatives: Alternative[];
  /** Set when no comparison was possible, so an empty list is not mistaken for "nothing better". */
  reason?: string;
}

export interface AlternativesOptions {
  includeAllStages?: boolean;
  limit?: number;
}

export const DEFAULT_ALTERNATIVES_LIMIT = 10;

/**
 * Peers of `current` that beat it on one goal, best first. Peers follow `isPeer`: same food type and
 * same label life stage, with the toggle to merge adult-maintenance and all-life-stages. The values
 * come from label guarantees (protein) and recent retailer prices (price), so a delta is a
 * comparison of those figures, not a verdict on quality.
 */
export function findAlternatives(
  products: Product[],
  current: Product,
  goal: Goal,
  options: AlternativesOptions = {}
): AlternativesResult {
  const { metric, better } = GOALS[goal];
  const read = (p: Product): number | undefined => (p.derived as DerivedMetrics | undefined)?.[metric];
  const currentValue = read(current);
  const base = { goal, metric, better } as const;

  if (currentValue === undefined) {
    return { ...base, peerCount: 0, alternatives: [], reason: "no value for this product" };
  }

  const peers = products.filter(
    (p) => p.id !== current.id && isPeer(current, p, options.includeAllStages === true) && read(p) !== undefined
  );
  const beats = (value: number) => (better === "higher" ? value > currentValue : value < currentValue);

  const alternatives: Alternative[] = peers
    .filter((p) => beats(read(p) as number))
    .map((p) => {
      const value = read(p) as number;
      const alt: Alternative = { product: p, value, delta: value - currentValue };
      if (currentValue !== 0) {
        alt.deltaPct = ((value - currentValue) / currentValue) * 100;
      }
      return alt;
    })
    .sort((a, b) => (better === "higher" ? b.value - a.value : a.value - b.value) || (a.product.id < b.product.id ? -1 : 1))
    .slice(0, options.limit ?? DEFAULT_ALTERNATIVES_LIMIT);

  return { ...base, currentValue, peerCount: peers.length, alternatives };
}
