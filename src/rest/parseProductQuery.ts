import { AdequacyStage, AdequacyStandard, FoodType } from "../models/Product";
import { ProductFilters } from "../queryEngine/filterProducts";
import { parseEnumParam, parseNumericParam, parseStringParam } from "./queryParamParsing";

const FOOD_TYPES: FoodType[] = ["dry", "wet"];
const ADEQUACY_STANDARDS: AdequacyStandard[] = ["aafco", "fediaf", "none"];
const ADEQUACY_STAGES: AdequacyStage[] = ["adult-maintenance", "all-life-stages", "not-stated"];

const NUMERIC_PARAMS = ["proteinPctMin", "proteinPctMax", "fatPctMin", "fatPctMax"] as const;

const KNOWN_PARAMS: readonly string[] = ["brand", "variant", "foodType", "adequacyStandard", "adequacyStage", ...NUMERIC_PARAMS];

export type ParseProductQueryResult = { ok: true; filters: ProductFilters } | { ok: false; error: string };

export function parseProductQuery(query: Record<string, unknown>): ParseProductQueryResult {
  for (const key of Object.keys(query)) {
    if (!KNOWN_PARAMS.includes(key)) {
      return { ok: false, error: `Unknown query parameter: ${key}` };
    }
  }

  const filters: ProductFilters = {};

  const brand = parseStringParam("brand", query.brand);
  if (!brand.ok) {
    return brand;
  }
  if (brand.value !== undefined) {
    filters.brand = brand.value;
  }

  const variant = parseStringParam("variant", query.variant);
  if (!variant.ok) {
    return variant;
  }
  if (variant.value !== undefined) {
    filters.variant = variant.value;
  }

  const foodType = parseEnumParam("foodType", query.foodType, FOOD_TYPES);
  if (!foodType.ok) {
    return foodType;
  }
  if (foodType.value !== undefined) {
    filters.foodType = foodType.value;
  }

  const adequacyStandard = parseEnumParam("adequacyStandard", query.adequacyStandard, ADEQUACY_STANDARDS);
  if (!adequacyStandard.ok) {
    return adequacyStandard;
  }
  if (adequacyStandard.value !== undefined) {
    filters.adequacyStandard = adequacyStandard.value;
  }

  const adequacyStage = parseEnumParam("adequacyStage", query.adequacyStage, ADEQUACY_STAGES);
  if (!adequacyStage.ok) {
    return adequacyStage;
  }
  if (adequacyStage.value !== undefined) {
    filters.adequacyStage = adequacyStage.value;
  }

  for (const paramName of NUMERIC_PARAMS) {
    const result = parseNumericParam(paramName, query[paramName]);
    if (!result.ok) {
      return result;
    }
    if (result.value !== undefined) {
      filters[paramName] = result.value;
    }
  }

  return { ok: true, filters };
}
