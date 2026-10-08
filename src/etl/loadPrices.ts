import { parse } from "csv-parse/sync";
import { PriceObservation } from "../models/PriceObservation";

export function loadPrices(csvContent: string): PriceObservation[] {
  const rows: Record<string, string>[] = parse(csvContent, { columns: true, skip_empty_lines: true });

  return rows.map((row) => ({
    productId: row.productId,
    retailer: row.retailer,
    price: Number(row.price),
    packageSizeG: Number(row.packageSizeG),
    asOf: row.asOf,
    url: row.url,
  }));
}
