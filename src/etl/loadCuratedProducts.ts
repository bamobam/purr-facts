import { parse } from "csv-parse/sync";
import { AdequacyStage, AdequacyStandard, Basis, FoodType, Product } from "../models/Product";

function optionalString(value: string): string | undefined {
  return value === "" ? undefined : value;
}

/** Blank stays undefined; anything else becomes a number, and a bad value becomes NaN for the validator to report. */
function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

function withoutUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function loadCuratedProducts(csvContent: string): Product[] {
  const rows: Record<string, string>[] = parse(csvContent, { columns: true, skip_empty_lines: true });

  return rows.map((row) =>
    withoutUndefined<Product>({
      id: row.id,
      brand: row.brand,
      parentCompany: row.parentCompany,
      productName: row.productName,
      variant: row.variant,
      foodType: row.foodType as FoodType,
      adequacyStandard: row.adequacyStandard as AdequacyStandard,
      adequacyStage: row.adequacyStage as AdequacyStage,
      proteinPct: optionalNumber(row.proteinPct),
      proteinBasis: optionalString(row.proteinBasis) as Basis | undefined,
      fatPct: optionalNumber(row.fatPct),
      fatBasis: optionalString(row.fatBasis) as Basis | undefined,
      fiberPct: optionalNumber(row.fiberPct),
      fiberBasis: optionalString(row.fiberBasis) as Basis | undefined,
      moisturePct: optionalNumber(row.moisturePct),
      moistureBasis: optionalString(row.moistureBasis) as Basis | undefined,
      kcalPerKg: optionalNumber(row.kcalPerKg),
      packageSizeG: optionalNumber(row.packageSizeG),
      packageUnits: optionalNumber(row.packageUnits),
      sourceUrl: row.sourceUrl,
      lastVerified: row.lastVerified,
      reformulatedOn: optionalString(row.reformulatedOn),
      reformulationSourceUrl: optionalString(row.reformulationSourceUrl),
    })
  );
}
