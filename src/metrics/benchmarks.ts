import { DerivedMetrics } from "../models/DerivedMetrics";
import { Product } from "../models/Product";
import { isPeer } from "./peers";

/** A cohort needs at least this many other products with the metric before a percentile is shown. */
export const MIN_COHORT_SIZE = 8;

export const BENCHMARK_METRICS = ["proteinGPer1000kcal", "fatGPer1000kcal", "dmProtein", "pricePerKg", "pricePer1000kcal"] as const;
export type BenchmarkMetric = (typeof BENCHMARK_METRICS)[number];

export type BenchmarkResult =
  | { suppressed: false; value: number; percentile: number; cohortSize: number }
  | { suppressed: true; reason: string; cohortSize: number };

export interface BenchmarkOptions {
  includeAllStages?: boolean;
}

/**
 * Where `product` sits among its peers on `metric`: the share of the other peers that have a
 * strictly lower value. Ties count as not lower. It is a position, not a quality judgement; for
 * price a low percentile is cheap, for protein a high one is protein-rich.
 */
export function benchmarkMetric(
  products: Product[],
  product: Product,
  metric: BenchmarkMetric,
  options: BenchmarkOptions = {}
): BenchmarkResult {
  const value: DerivedMetrics[BenchmarkMetric] = product.derived?.[metric];
  if (value === undefined) {
    return { suppressed: true, reason: "no value for this product", cohortSize: 0 };
  }

  const others = products.filter(
    (p) => p.id !== product.id && isPeer(product, p, options.includeAllStages === true) && p.derived?.[metric] !== undefined
  );
  if (others.length < MIN_COHORT_SIZE) {
    return { suppressed: true, reason: "not enough peers", cohortSize: others.length };
  }

  const lower = others.filter((p) => (p.derived![metric] as number) < value).length;
  return { suppressed: false, value, percentile: (lower / others.length) * 100, cohortSize: others.length };
}

export function computeBenchmarks(
  products: Product[],
  product: Product,
  options: BenchmarkOptions = {}
): Record<BenchmarkMetric, BenchmarkResult> {
  const result = {} as Record<BenchmarkMetric, BenchmarkResult>;
  for (const metric of BENCHMARK_METRICS) {
    result[metric] = benchmarkMetric(products, product, metric, options);
  }
  return result;
}
