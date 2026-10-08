/** Metrics computed at build time from a product's label figures and its price observations. */
export interface DerivedMetrics {
  /** Percent of the dry matter (as-fed value / (100 - moisture) * 100). */
  dmProtein?: number;
  dmFat?: number;
  /** Grams of nutrient per 1000 kcal metabolizable energy. */
  proteinGPer1000kcal?: number;
  fatGPer1000kcal?: number;
  /** Percent of calories from the nutrient (protein 3.5 kcal/g, fat 8.5 kcal/g). */
  proteinKcalPct?: number;
  fatKcalPct?: number;
  /** CAD; the median across observations from the last 90 days. */
  pricePerLb?: number;
  pricePerKg?: number;
  pricePer1000kcal?: number;
  /** Recent observations behind the price metrics, and their lowest and highest price per kg. */
  priceObservationCount: number;
  priceRangePerKg?: [number, number];
  /** Share (0..1) of protein, fat, fiber, moisture, kcal/kg and a recent price that are present. */
  completeness: number;
  /** Recalls and alerts (last 10 years) that name this product, and all against its brand, linked or not. Report-tier entries are counted apart. */
  incidentCount?: number;
  brandIncidentCount?: number;
  /** Report-tier entries (regulator investigations) naming this product, and all against its brand. */
  reportCount?: number;
  brandReportCount?: number;
}
