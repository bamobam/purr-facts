import { PriceObservation } from "../models/PriceObservation";
import { Product } from "../models/Product";
import { daysBetween, isValidIsoDate, todayIso } from "../shared/isoDate";
import { ValidationIssue, ValidationOptions } from "./validationTypes";

/** Prices older than this still load, but are flagged so they get re-checked. */
export const STALE_PRICE_DAYS = 90;

export function validatePrices(
  observations: PriceObservation[],
  products: Product[],
  options: ValidationOptions = {}
): ValidationIssue[] {
  const today = options.today ?? todayIso();
  const productIds = new Set(products.map((p) => p.id));
  const issues: ValidationIssue[] = [];

  const error = (o: PriceObservation, field: string | undefined, message: string) =>
    issues.push({ severity: "error", productId: o.productId, field, message });

  const seen = new Map<string, number>();

  for (const o of observations) {
    if (!productIds.has(o.productId)) {
      error(o, "productId", `productId "${o.productId}" does not match any product`);
    }
    if (o.retailer.trim() === "") {
      error(o, "retailer", "retailer is required");
    }
    if (!(Number.isFinite(o.price) && o.price > 0)) {
      error(o, "price", `price ${o.price} must be a positive number`);
    }
    if (!(Number.isFinite(o.packageSizeG) && o.packageSizeG > 0)) {
      error(o, "packageSizeG", `packageSizeG ${o.packageSizeG} must be a positive number`);
    }
    if (!/^https?:\/\/.+/.test(o.url)) {
      error(o, "url", `url "${o.url}" is not an http(s) URL`);
    }

    if (!isValidIsoDate(o.asOf)) {
      error(o, "asOf", `asOf "${o.asOf}" is not a valid YYYY-MM-DD date`);
    } else if (o.asOf > today) {
      error(o, "asOf", `asOf ${o.asOf} is in the future`);
    } else if (daysBetween(o.asOf, today) > STALE_PRICE_DAYS) {
      issues.push({
        severity: "warning",
        productId: o.productId,
        field: "asOf",
        message: `${o.retailer} price for ${o.productId} is ${daysBetween(o.asOf, today)} days old (over ${STALE_PRICE_DAYS})`,
      });
    }

    const key = `${o.productId}|${o.retailer.trim().toLowerCase()}|${o.asOf}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  for (const o of observations) {
    const key = `${o.productId}|${o.retailer.trim().toLowerCase()}|${o.asOf}`;
    if ((seen.get(key) ?? 0) > 1) {
      error(o, undefined, `Duplicate observation for ${o.productId} at ${o.retailer} on ${o.asOf}`);
    }
  }

  return issues;
}
