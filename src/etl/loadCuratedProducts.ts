import { parse } from "csv-parse/sync";
import { DataSource, FoodType, LifeStage, Product } from "../models/Product";

export function loadCuratedProducts(csvContent: string): Product[] {
  const rows: Record<string, string>[] = parse(csvContent, { columns: true, skip_empty_lines: true });

  return rows.map((row) => ({
    id: row.id,
    brand: row.brand,
    productName: row.productName,
    variant: row.variant,
    foodType: row.foodType as FoodType,
    lifeStage: row.lifeStage as LifeStage,
    proteinPct: Number(row.proteinPct),
    fatPct: Number(row.fatPct),
    fiberPct: Number(row.fiberPct),
    moisturePct: Number(row.moisturePct),
    calorieDensity: Number(row.calorieDensity),
    price: Number(row.price),
    sourceUrl: row.sourceUrl,
    dataSource: row.dataSource as DataSource,
  }));
}
