import { FoodType, LifeStage, Product } from "../models/Product";

export interface OpffRawRow {
  code: string;
  product_name: string;
  brands: string;
  categories_en: string;
  countries_en: string;
  proteins_100g: string;
  fat_100g: string;
  fiber_100g: string;
  "energy-kcal_100g": string;
}

function hasCatSpecificTag(categoriesEn: string): boolean {
  // A tag mentioning "cat" isn't enough on its own: Open Pet Food Facts tags some
  // dog-only products with a generic combined parent category like "Dog and cat
  // food" alongside specific dog-only tags ("Dry dog food", "Dog biscuit") and no
  // cat-specific tag at all. Require at least one individual tag that mentions cat
  // without also mentioning dog.
  return categoriesEn
    .toLowerCase()
    .split(",")
    .map((tag) => tag.trim())
    .some((tag) => tag.includes("cat") && !tag.includes("dog"));
}

function inferFoodType(categoriesEn: string): FoodType | undefined {
  const categories = categoriesEn.toLowerCase();
  if (categories.includes("treat")) {
    return "treat";
  }
  if (categories.includes("dry")) {
    return "dry";
  }
  if (categories.includes("wet") || categories.includes("canned") || categories.includes("pouch")) {
    return "wet";
  }
  return undefined;
}

function inferLifeStage(categoriesEn: string): LifeStage {
  const categories = categoriesEn.toLowerCase();
  if (categories.includes("kitten")) {
    return "kitten";
  }
  if (categories.includes("senior") || categories.includes("mature")) {
    return "senior";
  }
  return "all";
}

function parseNumeric100g(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function mapOpenPetFoodFactsRow(row: OpffRawRow): Product | undefined {
  if (!row.product_name.trim() || !row.brands.trim()) {
    return undefined;
  }
  if (!row.countries_en.toLowerCase().includes("united states")) {
    return undefined;
  }
  if (!hasCatSpecificTag(row.categories_en)) {
    return undefined;
  }

  const foodType = inferFoodType(row.categories_en);
  if (foodType === undefined) {
    return undefined;
  }

  const brand = row.brands.split(",")[0].trim();
  const proteinPct = parseNumeric100g(row.proteins_100g);
  const fatPct = parseNumeric100g(row.fat_100g);
  const fiberPct = parseNumeric100g(row.fiber_100g);
  const energyPer100g = parseNumeric100g(row["energy-kcal_100g"]);

  return {
    id: `opff-${row.code}`,
    brand,
    productName: row.product_name.trim(),
    variant: row.product_name.trim(),
    foodType,
    lifeStage: inferLifeStage(row.categories_en),
    proteinPct,
    fatPct,
    fiberPct,
    calorieDensity: energyPer100g === undefined ? undefined : energyPer100g * 10,
    sourceUrl: `https://world.openpetfoodfacts.org/product/${row.code}`,
    dataSource: "open-data",
  };
}
