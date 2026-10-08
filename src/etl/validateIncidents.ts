import { INCIDENT_SCOPE_DAYS } from "../data/incidentScope";
import { EVIDENCE_TIERS, Incident, IncidentCheck } from "../models/Incident";
import { Product } from "../models/Product";
import { daysBetween, isValidIsoDate, todayIso } from "../shared/isoDate";
import { normalizeBrand } from "../shared/normalizeBrand";
import { ValidationIssue, ValidationOptions } from "./validationTypes";

const RECALL_TYPES: string[] = ["recall", "market-withdrawal", "safety-alert"];
const TYPES: string[] = [...RECALL_TYPES, "investigation"];
const JURISDICTIONS = ["CA", "US"] as const;
/** A source check older than this is flagged, since "no incidents found" ages. */
export const STALE_CHECK_DAYS = 90;

/**
 * For incident issues, `productId` in the result holds the incident id (or the jurisdiction or brand, for checks).
 * Every regulator (CA and US) and every catalog brand must have at least one recorded check, so that an
 * empty incident list always says where and when it was looked for.
 */
export function validateIncidents(
  incidents: Incident[],
  checks: IncidentCheck[],
  products: Product[],
  options: ValidationOptions = {}
): ValidationIssue[] {
  const today = options.today ?? todayIso();
  const issues: ValidationIssue[] = [];
  const productById = new Map(products.map((p) => [p.id, p]));
  const error = (id: string, field: string | undefined, message: string) => issues.push({ severity: "error", productId: id, field, message });
  const warning = (id: string, field: string | undefined, message: string) => issues.push({ severity: "warning", productId: id, field, message });

  const seen = new Map<string, number>();
  for (const i of incidents) {
    seen.set(i.id, (seen.get(i.id) ?? 0) + 1);
  }

  for (const i of incidents) {
    if ((seen.get(i.id) ?? 0) > 1) {
      error(i.id, "id", `Duplicate incident id "${i.id}"`);
    }
    for (const field of ["brand", "reason", "affects"] as const) {
      if (i[field].trim() === "") {
        error(i.id, field, `${field} is required`);
      }
    }
    if (!TYPES.includes(i.type)) {
      error(i.id, "type", `type "${i.type}" must be one of ${TYPES.join(", ")}`);
    }
    if (!(EVIDENCE_TIERS as readonly string[]).includes(i.evidenceTier)) {
      error(i.id, "evidenceTier", `evidenceTier "${i.evidenceTier}" must be one of ${EVIDENCE_TIERS.join(", ")}`);
    } else if (TYPES.includes(i.type)) {
      if (i.evidenceTier === "report" && i.type !== "investigation") {
        error(i.id, "type", `a report-tier entry must have type "investigation", not "${i.type}"`);
      } else if (i.evidenceTier !== "report" && i.type === "investigation") {
        error(i.id, "type", `type "investigation" belongs in the "report" tier, not "${i.evidenceTier}"`);
      }
    }
    if (!(JURISDICTIONS as readonly string[]).includes(i.jurisdiction)) {
      error(i.id, "jurisdiction", `jurisdiction "${i.jurisdiction}" must be one of ${JURISDICTIONS.join(", ")}`);
    }
    if (!/^https?:\/\/.+/.test(i.sourceUrl)) {
      error(i.id, "sourceUrl", `sourceUrl "${i.sourceUrl}" is not an http(s) URL`);
    }
    if (!isValidIsoDate(i.date)) {
      error(i.id, "date", `date "${i.date}" is not a valid YYYY-MM-DD date`);
    } else if (i.date > today) {
      error(i.id, "date", `date ${i.date} is in the future`);
    } else if (daysBetween(i.date, today) > INCIDENT_SCOPE_DAYS) {
      warning(i.id, "date", `date ${i.date} is older than the 10-year scope`);
    }
    for (const productId of i.productIds) {
      const product = productById.get(productId);
      if (product === undefined) {
        error(i.id, "productIds", `productId "${productId}" does not match any product`);
      } else if (normalizeBrand(product.brand) !== normalizeBrand(i.brand)) {
        error(i.id, "productIds", `${productId} is brand "${product.brand}" but the incident is for brand "${i.brand}"`);
      }
    }
  }

  const latestRegulator = new Map<string, string>();
  const latestByBrand = new Map<string, string>();
  for (const c of checks) {
    const label = c.brand ?? c.jurisdiction;
    let usable = true;
    if (!(EVIDENCE_TIERS as readonly string[]).includes(c.tier)) {
      error(label, "tier", `tier "${c.tier}" must be one of ${EVIDENCE_TIERS.join(", ")}`);
      usable = false;
    }
    if (!(JURISDICTIONS as readonly string[]).includes(c.jurisdiction)) {
      error(label, "jurisdiction", `jurisdiction "${c.jurisdiction}" must be one of ${JURISDICTIONS.join(", ")}`);
      usable = false;
    }
    for (const field of ["checkedOn", "coversFrom"] as const) {
      if (!isValidIsoDate(c[field])) {
        error(label, field, `${field} "${c[field]}" is not a valid YYYY-MM-DD date`);
        usable = false;
      }
    }
    if (usable && c.checkedOn > today) {
      error(label, "checkedOn", `checkedOn ${c.checkedOn} is in the future`);
      usable = false;
    }
    if (!/^https?:\/\/.+/.test(c.url)) {
      error(label, "url", `url "${c.url}" is not an http(s) URL`);
    }
    if (!usable) {
      continue;
    }
    if (c.tier === "regulator" && (latestRegulator.get(c.jurisdiction) ?? "") < c.checkedOn) {
      latestRegulator.set(c.jurisdiction, c.checkedOn);
    }
    if (c.tier === "company-or-trade" && c.brand !== undefined) {
      const key = normalizeBrand(c.brand);
      if ((latestByBrand.get(key) ?? "") < c.checkedOn) {
        latestByBrand.set(key, c.checkedOn);
      }
    }
  }

  for (const jurisdiction of JURISDICTIONS) {
    const checkedOn = latestRegulator.get(jurisdiction);
    if (checkedOn === undefined) {
      error(jurisdiction, "checkedOn", `No valid regulator check recorded for jurisdiction ${jurisdiction}; without one, an empty incident list means nothing`);
    } else if (daysBetween(checkedOn, today) > STALE_CHECK_DAYS) {
      warning(jurisdiction, "checkedOn", `The latest ${jurisdiction} regulator check is ${daysBetween(checkedOn, today)} days old (over ${STALE_CHECK_DAYS})`);
    }
  }

  const brands = new Map<string, string>();
  for (const p of products) {
    brands.set(normalizeBrand(p.brand), p.brand);
  }
  for (const [key, brand] of brands) {
    const checkedOn = latestByBrand.get(key);
    if (checkedOn === undefined) {
      error(brand, "checkedOn", `No company-or-trade check recorded for brand ${brand}; its own recall pages and the trade press were never searched`);
    } else if (daysBetween(checkedOn, today) > STALE_CHECK_DAYS) {
      warning(brand, "checkedOn", `The latest company-or-trade check for ${brand} is ${daysBetween(checkedOn, today)} days old (over ${STALE_CHECK_DAYS})`);
    }
  }

  return issues;
}
