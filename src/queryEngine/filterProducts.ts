import { FoodType, LifeStage, Product } from "../models/Product";

export interface ProductFilters {
  brand?: string;
  variant?: string;
  foodType?: FoodType;
  lifeStage?: LifeStage;
  proteinPctMin?: number;
  proteinPctMax?: number;
  fatPctMin?: number;
  fatPctMax?: number;
  priceMin?: number;
  priceMax?: number;
}

function normalizeBrand(brand: string): string {
  return brand.trim().toLowerCase();
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
    if (filters.lifeStage !== undefined && product.lifeStage !== filters.lifeStage) {
      return false;
    }
    if (!matchesRange(product.proteinPct, filters.proteinPctMin, filters.proteinPctMax)) {
      return false;
    }
    if (!matchesRange(product.fatPct, filters.fatPctMin, filters.fatPctMax)) {
      return false;
    }
    if (!matchesRange(product.price, filters.priceMin, filters.priceMax)) {
      return false;
    }
    return true;
  });
}
