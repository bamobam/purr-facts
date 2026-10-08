import { estimateKcalPerKg } from "../metrics/estimateKcalPerKg";
import { Basis, FoodType, Product } from "../models/Product";
import { isValidIsoDate, todayIso } from "../shared/isoDate";
import { normalizeBrand } from "../shared/normalizeBrand";
import { ValidationIssue, ValidationOptions } from "./validationTypes";

export { ValidationIssue, ValidationOptions } from "./validationTypes";

const FOOD_TYPES: string[] = ["dry", "wet"];
const ADEQUACY_STANDARDS: string[] = ["aafco", "fediaf", "none"];
const ADEQUACY_STAGES: string[] = ["adult-maintenance", "all-life-stages", "not-stated"];
const BASES: string[] = ["guaranteed-min", "guaranteed-max", "typical"];

const KCAL_PER_KG_RANGE = { min: 500, max: 6000 };

/**
 * Allowed deviation, in percent, of the label's kcal/kg from the Atwater estimate. Calibrated on
 * the 33 migrated rows that state kcal/kg (2026-10-06): dry foods landed between -2.1% and +5.9%,
 * wet foods between -2.5% and +31.5% (label minimums for protein and fat make the estimate run low,
 * most of all for wet food with extra fat or organ meat, such as Orijen Regional Red at +31.5%).
 * Bands are the observed range plus headroom. These produce warnings, not errors: their job is to
 * flag a wrong column or a dropped digit for a second look.
 */
export const KCAL_DEVIATION_BANDS: Record<FoodType, { min: number; max: number }> = {
  dry: { min: -10, max: 10 },
  wet: { min: -10, max: 40 },
};

const NUTRIENTS = [
  { label: "protein", value: "proteinPct", basis: "proteinBasis", max: 100 },
  { label: "fat", value: "fatPct", basis: "fatBasis", max: 100 },
  { label: "fiber", value: "fiberPct", basis: "fiberBasis", max: 100 },
  { label: "moisture", value: "moisturePct", basis: "moistureBasis", max: 95 },
] as const;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

export function validateProducts(products: Product[], options: ValidationOptions = {}): ValidationIssue[] {
  const today = options.today ?? todayIso();
  const issues: ValidationIssue[] = [];

  function error(product: Product, field: string | undefined, message: string): void {
    issues.push({ severity: "error", productId: product.id, field, message });
  }
  function warning(product: Product, field: string | undefined, message: string): void {
    issues.push({ severity: "warning", productId: product.id, field, message });
  }

  for (const product of products) {
    for (const field of ["brand", "parentCompany", "productName", "variant"] as const) {
      if (isBlank(product[field])) {
        error(product, field, `${field} is required`);
      }
    }

    if (isBlank(product.sourceUrl)) {
      error(product, "sourceUrl", "sourceUrl is required");
    } else if (!/^https?:\/\/.+/.test(product.sourceUrl)) {
      error(product, "sourceUrl", `sourceUrl "${product.sourceUrl}" is not an http(s) URL`);
    }

    if (isBlank(product.lastVerified)) {
      error(product, "lastVerified", "lastVerified is required");
    } else if (!isValidIsoDate(product.lastVerified)) {
      error(product, "lastVerified", `lastVerified "${product.lastVerified}" is not a valid YYYY-MM-DD date`);
    } else if (product.lastVerified > today) {
      error(product, "lastVerified", `lastVerified ${product.lastVerified} is in the future`);
    }

    if (!FOOD_TYPES.includes(product.foodType)) {
      error(product, "foodType", `foodType "${product.foodType}" must be one of ${FOOD_TYPES.join(", ")}`);
    }
    const standardOk = ADEQUACY_STANDARDS.includes(product.adequacyStandard);
    const stageOk = ADEQUACY_STAGES.includes(product.adequacyStage);
    if (!standardOk) {
      error(product, "adequacyStandard", `adequacyStandard "${product.adequacyStandard}" must be one of ${ADEQUACY_STANDARDS.join(", ")}`);
    }
    if (!stageOk) {
      error(product, "adequacyStage", `adequacyStage "${product.adequacyStage}" must be one of ${ADEQUACY_STAGES.join(", ")}`);
    }
    if (standardOk && stageOk) {
      if (product.adequacyStandard === "none" && product.adequacyStage !== "not-stated") {
        error(product, "adequacyStage", `adequacyStage "${product.adequacyStage}" needs a standard: adequacyStandard is none`);
      } else if (product.adequacyStandard !== "none" && product.adequacyStage === "not-stated") {
        error(product, "adequacyStage", `adequacyStandard "${product.adequacyStandard}" is cited, so adequacyStage cannot be not-stated`);
      }
    }

    let allNutrientsFinite = true;
    let nutrientSum = 0;
    for (const nutrient of NUTRIENTS) {
      const value = product[nutrient.value];
      const basis = product[nutrient.basis];

      if (basis !== undefined && !BASES.includes(basis)) {
        error(product, nutrient.basis, `${nutrient.basis} "${basis}" must be one of ${BASES.join(", ")}`);
      }
      if (value === undefined) {
        if (basis !== undefined) {
          error(product, nutrient.value, `${nutrient.basis} is set but ${nutrient.value} is missing`);
        }
        continue;
      }
      if (basis === undefined) {
        error(product, nutrient.basis, `${nutrient.value} has a value but no ${nutrient.basis}`);
      }
      if (!Number.isFinite(value)) {
        error(product, nutrient.value, `${nutrient.value} is not a number`);
        allNutrientsFinite = false;
      } else if (value < 0 || value > nutrient.max) {
        error(product, nutrient.value, `${nutrient.value} ${value} is outside 0-${nutrient.max}`);
        allNutrientsFinite = false;
      } else {
        nutrientSum += value;
      }
    }
    if (allNutrientsFinite && nutrientSum > 100) {
      error(product, undefined, `protein + fat + fiber + moisture exceed 100 (sum ${nutrientSum.toFixed(1)})`);
    }

    let kcalInRange = false;
    if (product.kcalPerKg !== undefined) {
      if (!Number.isFinite(product.kcalPerKg) || product.kcalPerKg < KCAL_PER_KG_RANGE.min || product.kcalPerKg > KCAL_PER_KG_RANGE.max) {
        error(product, "kcalPerKg", `kcalPerKg ${product.kcalPerKg} is outside ${KCAL_PER_KG_RANGE.min}-${KCAL_PER_KG_RANGE.max}`);
      } else {
        kcalInRange = true;
      }
    }
    for (const field of ["packageSizeG", "packageUnits"] as const) {
      const value = product[field];
      if (value !== undefined && !(Number.isFinite(value) && value > 0)) {
        error(product, field, `${field} ${value} must be a positive number`);
      }
    }

    const { proteinPct, fatPct, moisturePct, kcalPerKg } = product;
    const band = KCAL_DEVIATION_BANDS[product.foodType];
    if (
      band !== undefined &&
      kcalInRange &&
      kcalPerKg !== undefined &&
      proteinPct !== undefined && Number.isFinite(proteinPct) &&
      fatPct !== undefined && Number.isFinite(fatPct) &&
      moisturePct !== undefined && Number.isFinite(moisturePct)
    ) {
      const estimate = estimateKcalPerKg({ proteinPct, fatPct, moisturePct });
      const deviation = ((kcalPerKg - estimate) / estimate) * 100;
      if (deviation < band.min || deviation > band.max) {
        warning(
          product,
          "kcalPerKg",
          `kcalPerKg ${kcalPerKg} is ${deviation.toFixed(1)}% from the ${Math.round(estimate)} estimated from protein, fat and moisture ` +
            `(expected ${band.min}% to +${band.max}% for ${product.foodType} food); check the label and the column`
        );
      }
    }
  }

  const byId = new Map<string, Product[]>();
  const byKey = new Map<string, Product[]>();
  for (const product of products) {
    byId.set(product.id, [...(byId.get(product.id) ?? []), product]);
    const key = `${normalizeBrand(product.brand ?? "")}|${normalizeBrand(product.productName ?? "")}|${product.packageSizeG ?? ""}`;
    byKey.set(key, [...(byKey.get(key) ?? []), product]);
  }
  for (const [id, group] of byId) {
    if (group.length > 1) {
      for (const product of group) {
        error(product, "id", `Duplicate id "${id}" (${group.length} rows)`);
      }
    }
  }
  for (const group of byKey.values()) {
    if (group.length > 1) {
      for (const product of group) {
        error(product, undefined, `Duplicate product: same brand, productName and packageSizeG as ${group.filter((p) => p !== product).map((p) => p.id).join(", ")}`);
      }
    }
  }

  return issues;
}

export type { Basis };
