import { normalizeBrand } from "../shared/normalizeBrand";

export interface OpenFdaRecallRecord {
  recalling_firm: string;
  product_description: string;
  reason_for_recall: string;
  recall_number: string;
  classification: string;
  recall_initiation_date: string;
}

export function joinRecallsByBrand(
  normalizedBrands: string[],
  recalls: OpenFdaRecallRecord[]
): Record<string, OpenFdaRecallRecord[]> {
  const result: Record<string, OpenFdaRecallRecord[]> = {};

  for (const brand of normalizedBrands) {
    const matches = recalls.filter((recall) => {
      const haystack = normalizeBrand(`${recall.recalling_firm} ${recall.product_description}`);
      return haystack.includes(brand);
    });
    if (matches.length > 0) {
      result[brand] = matches;
    }
  }

  return result;
}
