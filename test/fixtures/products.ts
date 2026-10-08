import { Product } from "../../src/models/Product";

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    brand: "Purina",
    parentCompany: "Purina",
    productName: "Fancy Feast Chicken",
    variant: "Chicken",
    foodType: "wet",
    adequacyStandard: "aafco",
    adequacyStage: "adult-maintenance",
    sourceUrl: "https://example.com/product",
    lastVerified: "2026-10-01",
    ...overrides,
  };
}

/** Small hand-made catalog for REST tests. Values are illustrative, not real nutrition facts. */
export const fixtureProducts: Product[] = [
  makeProduct({ id: "fixture-1", brand: "Purina", variant: "Chicken", foodType: "wet", adequacyStage: "adult-maintenance", proteinPct: 11, fatPct: 3, kcalPerKg: 900 }),
  makeProduct({ id: "fixture-2", brand: "Purina", variant: "Salmon", foodType: "wet", adequacyStage: "adult-maintenance", proteinPct: 10, fatPct: 3, kcalPerKg: 880 }),
  makeProduct({ id: "fixture-3", brand: "Meow Mix", variant: "Original", foodType: "dry", adequacyStage: "all-life-stages", proteinPct: 32, fatPct: 12, kcalPerKg: 3600 }),
  makeProduct({ id: "fixture-4", brand: "Blue Buffalo", variant: "Chicken", foodType: "dry", adequacyStage: "all-life-stages", proteinPct: 40, fatPct: 18, kcalPerKg: 4000 }),
  makeProduct({ id: "fixture-5", brand: "Blue Buffalo", variant: "Turkey", foodType: "wet", adequacyStage: "adult-maintenance", proteinPct: 9, fatPct: 2, kcalPerKg: 820 }),
];
