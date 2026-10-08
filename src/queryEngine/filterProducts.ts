import { AdequacyStage, AdequacyStandard, FoodType, Product } from "../models/Product";
import { normalizeBrand } from "../shared/normalizeBrand";

export interface ProductFilters {
  brand?: string;
  variant?: string;
  foodType?: FoodType;
  adequacyStandard?: AdequacyStandard;
  adequacyStage?: AdequacyStage;
  proteinPctMin?: number;
  proteinPctMax?: number;
  fatPctMin?: number;
  fatPctMax?: number;
}

function matchesRange(value: number | undefined, min: number | undefined, max: number | undefined): boolean {
  if (min === undefined && max === undefined) {
    return true;
  }
  if (value === undefined) {
    return false;
  }
  if (min !== undefined && value < min) {
    return false;
  }
  if (max !== undefined && value > max) {
    return false;
  }
  return true;
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((product) => {
    if (filters.brand !== undefined && normalizeBrand(product.brand) !== normalizeBrand(filters.brand)) {
      return false;
    }
    if (filters.variant !== undefined && product.variant !== filters.variant) {
      return false;
    }
    if (filters.foodType !== undefined && product.foodType !== filters.foodType) {
      return false;
    }
    if (filters.adequacyStandard !== undefined && product.adequacyStandard !== filters.adequacyStandard) {
      return false;
    }
    if (filters.adequacyStage !== undefined && product.adequacyStage !== filters.adequacyStage) {
      return false;
    }
    if (!matchesRange(product.proteinPct, filters.proteinPctMin, filters.proteinPctMax)) {
      return false;
    }
    if (!matchesRange(product.fatPct, filters.fatPctMin, filters.fatPctMax)) {
      return false;
    }
    return true;
  });
}
