import { FoodType, LifeStage } from "../models/Product";
import { ProductFilters } from "../queryEngine/filterProducts";

const FOOD_TYPES: FoodType[] = ["dry", "wet", "treat"];
const LIFE_STAGES: LifeStage[] = ["kitten", "adult", "senior", "all"];

const NUMERIC_PARAMS = ["proteinPctMin", "proteinPctMax", "fatPctMin", "fatPctMax", "priceMin", "priceMax"] as const;

const KNOWN_PARAMS: readonly string[] = ["brand", "variant", "foodType", "lifeStage", ...NUMERIC_PARAMS];

export type ParseProductQueryResult = { ok: true; filters: ProductFilters } | { ok: false; error: string };

type FieldResult<T> = { ok: true; value?: T } | { ok: false; error: string };

function parseStringParam(paramName: string, value: unknown): FieldResult<string> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `Invalid query parameter: ${paramName} must be provided once` };
  }
  return { ok: true, value };
}

function parseEnumParam<T extends string>(paramName: string, value: unknown, allowed: readonly T[]): FieldResult<T> {
  const stringResult = parseStringParam(paramName, value);
  if (!stringResult.ok) {
    return stringResult;
  }
  if (stringResult.value === undefined) {
    return { ok: true, value: undefined };
  }
  if (!allowed.includes(stringResult.value as T)) {
    return { ok: false, error: `Invalid query parameter: ${paramName} must be one of ${allowed.join(", ")}` };
  }
  return { ok: true, value: stringResult.value as T };
}

function parseNumericParam(paramName: string, value: unknown): FieldResult<number> {
  const stringResult = parseStringParam(paramName, value);
  if (!stringResult.ok) {
    return stringResult;
  }
  if (stringResult.value === undefined) {
    return { ok: true, value: undefined };
  }
  if (stringResult.value.trim() === "") {
    return { ok: false, error: `Invalid query parameter: ${paramName} must be a number` };
  }
  const parsed = Number(stringResult.value);
  if (Number.isNaN(parsed)) {
    return { ok: false, error: `Invalid query parameter: ${paramName} must be a number` };
  }
  return { ok: true, value: parsed };
}

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

  const lifeStage = parseEnumParam("lifeStage", query.lifeStage, LIFE_STAGES);
  if (!lifeStage.ok) {
    return lifeStage;
  }
  if (lifeStage.value !== undefined) {
    filters.lifeStage = lifeStage.value;
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
