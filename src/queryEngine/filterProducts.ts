import { Product } from "../models/Product";

export interface ProductFilters {
  brand?: string;
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((product) => {
    if (filters.brand !== undefined && product.brand !== filters.brand) {
      return false;
    }
    return true;
  });
}
