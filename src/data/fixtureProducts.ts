import { Product } from "../models/Product";

/**
 * Placeholder data for the walking skeleton only. Ticket 5's ETL pipeline
 * replaces this with the real merged dataset (Open Pet Food Facts + openFDA
 * + the curated CSV from Ticket 4) — these values are illustrative, not
 * verified nutrition facts.
 */
export const fixtureProducts: Product[] = [
  {
    id: "fixture-1",
    brand: "Purina",
    productName: "Fancy Feast Gravy Lovers Chicken",
    variant: "Chicken",
    foodType: "wet",
    lifeStage: "adult",
    proteinPct: 11,
    fatPct: 3,
    calorieDensity: 900,
    price: 0.58,
    dataSource: "curated",
  },
  {
    id: "fixture-2",
    brand: "Purina",
    productName: "Fancy Feast Gravy Lovers Salmon",
    variant: "Salmon",
    foodType: "wet",
    lifeStage: "adult",
    proteinPct: 10,
    fatPct: 3,
    calorieDensity: 880,
    price: 0.58,
    dataSource: "curated",
  },
  {
    id: "fixture-3",
    brand: "Meow Mix",
    productName: "Meow Mix Original Choice",
    variant: "Original",
    foodType: "dry",
    lifeStage: "adult",
    proteinPct: 32,
    fatPct: 12,
    calorieDensity: 3600,
    price: 0.12,
    dataSource: "curated",
  },
  {
    id: "fixture-4",
    brand: "Blue Buffalo",
    productName: "Blue Buffalo Wilderness Kitten",
    variant: "Chicken",
    foodType: "dry",
    lifeStage: "kitten",
    proteinPct: 40,
    fatPct: 18,
    calorieDensity: 4000,
    price: 0.35,
    dataSource: "curated",
  },
  {
    id: "fixture-5",
    brand: "Blue Buffalo",
    productName: "Blue Buffalo Tastefuls Senior",
    variant: "Turkey",
    foodType: "wet",
    lifeStage: "senior",
    proteinPct: 9,
    fatPct: 2,
    calorieDensity: 820,
    price: 0.62,
    dataSource: "curated",
  },
];
