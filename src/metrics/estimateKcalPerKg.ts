const KCAL_PER_G_PROTEIN = 3.5;
const KCAL_PER_G_FAT = 8.5;
const KCAL_PER_G_CARB = 3.5;
/** Ash is rarely on the label; assume 7% of dry matter, a typical figure for cat food. */
const ASSUMED_ASH_FRACTION_OF_DRY_MATTER = 0.07;

export interface MacroInputs {
  proteinPct: number;
  fatPct: number;
  moisturePct: number;
}

/**
 * Modified Atwater estimate of metabolizable energy from the guaranteed analysis. Carbohydrate is
 * whatever is left after protein, fat, moisture and assumed ash. Because labels give minimums for
 * protein and fat, this runs low, especially for wet food. It is a plausibility check on data entry,
 * not a substitute for the label's own kcal/kg.
 */
export function estimateKcalPerKg({ proteinPct, fatPct, moisturePct }: MacroInputs): number {
  const ashPct = ASSUMED_ASH_FRACTION_OF_DRY_MATTER * (100 - moisturePct);
  const carbPct = Math.max(0, 100 - proteinPct - fatPct - moisturePct - ashPct);
  const kcalPer100g = KCAL_PER_G_PROTEIN * proteinPct + KCAL_PER_G_FAT * fatPct + KCAL_PER_G_CARB * carbPct;
  return kcalPer100g * 10;
}
