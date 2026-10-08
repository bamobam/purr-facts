import { DerivedMetrics } from "./DerivedMetrics";

export type FoodType = "dry" | "wet";

/**
 * Which nutrient profile the label says the food meets. AAFCO is the US body most Canadian brands
 * follow voluntarily; FEDIAF is the European one, cited by some brands made for Canada (for example
 * Orijen's dry foods). `none` means the label states neither. Shown as a badge, not used for peers.
 */
export type AdequacyStandard = "aafco" | "fediaf" | "none";

/**
 * The life stage the label claims the food is complete and balanced for, under that standard.
 * "Kitten" and "senior" are marketing terms, not profiles: kitten foods are growth-and-reproduction
 * (out of v1 scope) and senior foods carry one of the first two stages. Peers group by this field.
 */
export type AdequacyStage = "adult-maintenance" | "all-life-stages" | "not-stated";

/** Whether a label figure is a floor, a ceiling, or a typical measured value. */
export type Basis = "guaranteed-min" | "guaranteed-max" | "typical";

export interface Product {
  id: string;
  brand: string;
  parentCompany: string;
  productName: string;
  variant: string;
  foodType: FoodType;
  adequacyStandard: AdequacyStandard;
  adequacyStage: AdequacyStage;
  proteinPct?: number;
  proteinBasis?: Basis;
  fatPct?: number;
  fatBasis?: Basis;
  fiberPct?: number;
  fiberBasis?: Basis;
  moisturePct?: number;
  moistureBasis?: Basis;
  kcalPerKg?: number;
  /** Total grams in the package (a 12-pack of 85 g cans is 1020). */
  packageSizeG?: number;
  /** Informational: cans or pouches per package. */
  packageUnits?: number;
  /** Where the nutrition figures were read from. */
  sourceUrl: string;
  /** ISO date a human last checked this row against sourceUrl. */
  lastVerified: string;
  reformulatedOn?: string;
  reformulationSourceUrl?: string;
  /** Written by the build step (`npm run build:data`); never hand-entered. */
  derived?: DerivedMetrics;
}
