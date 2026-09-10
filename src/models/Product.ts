export type FoodType = "dry" | "wet" | "treat";

export type LifeStage = "kitten" | "adult" | "senior" | "all";

export type DataSource = "curated" | "open-data";

export interface Product {
  id: string;
  brand: string;
  productName: string;
  variant: string;
  foodType: FoodType;
  lifeStage: LifeStage;
  proteinPct?: number;
  fatPct?: number;
  fiberPct?: number;
  moisturePct?: number;
  calorieDensity?: number;
  price?: number;
  sourceUrl?: string;
  dataSource: DataSource;
}
