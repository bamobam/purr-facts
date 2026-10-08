import { STALE_PRICE_DAYS } from "../etl/validatePrices";
import { DerivedMetrics } from "../models/DerivedMetrics";
import { PriceObservation } from "../models/PriceObservation";
import { Product } from "../models/Product";
import { daysBetween, isValidIsoDate, todayIso } from "../shared/isoDate";

const KCAL_PER_G_PROTEIN = 3.5;
const KCAL_PER_G_FAT = 8.5;
const LB_PER_KG = 0.45359237;

export function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface DeriveOptions {
  /** ISO date treated as "today"; injectable so tests are deterministic. */
  today?: string;
}

/**
 * Derives the comparison metrics for one product. Nothing is guessed: a metric whose inputs are
 * missing is left out, so "no price" never turns into a price of zero.
 */
export function deriveProductMetrics(
  product: Product,
  observations: PriceObservation[],
  options: DeriveOptions = {}
): DerivedMetrics {
  const today = options.today ?? todayIso();
  const derived: DerivedMetrics = { priceObservationCount: 0, completeness: 0, incidentCount: 0, brandIncidentCount: 0 };

  const { proteinPct, fatPct, moisturePct, kcalPerKg } = product;

  if (moisturePct !== undefined && moisturePct < 100) {
    const dryMatterFraction = (100 - moisturePct) / 100;
    if (proteinPct !== undefined) {
      derived.dmProtein = proteinPct / dryMatterFraction;
    }
    if (fatPct !== undefined) {
      derived.dmFat = fatPct / dryMatterFraction;
    }
  }

  if (kcalPerKg !== undefined && kcalPerKg > 0) {
    if (proteinPct !== undefined) {
      derived.proteinGPer1000kcal = (proteinPct * 10000) / kcalPerKg;
      derived.proteinKcalPct = (derived.proteinGPer1000kcal * KCAL_PER_G_PROTEIN) / 10;
    }
    if (fatPct !== undefined) {
      derived.fatGPer1000kcal = (fatPct * 10000) / kcalPerKg;
      derived.fatKcalPct = (derived.fatGPer1000kcal * KCAL_PER_G_FAT) / 10;
    }
  }

  const recent = observations.filter(
    (o) => o.productId === product.id && isValidIsoDate(o.asOf) && daysBetween(o.asOf, today) <= STALE_PRICE_DAYS
  );
  derived.priceObservationCount = recent.length;
  if (recent.length > 0) {
    const perKg = recent.map((o) => o.price / (o.packageSizeG / 1000));
    derived.pricePerKg = median(perKg);
    derived.pricePerLb = median(perKg.map((v) => v * LB_PER_KG));
    derived.priceRangePerKg = [Math.min(...perKg), Math.max(...perKg)];
    if (kcalPerKg !== undefined && kcalPerKg > 0) {
      derived.pricePer1000kcal = median(recent.map((o) => (o.price / ((kcalPerKg * o.packageSizeG) / 1000)) * 1000));
    }
  }

  const present = [proteinPct, fatPct, product.fiberPct, moisturePct, kcalPerKg].filter((v) => v !== undefined).length;
  derived.completeness = (present + (recent.length > 0 ? 1 : 0)) / 6;

  return derived;
}
