import { deriveProductMetrics } from "../metrics/deriveMetrics";
import { EvidenceTier, Incident, IncidentCheck } from "../models/Incident";
import { PriceObservation } from "../models/PriceObservation";
import { Product } from "../models/Product";
import { daysBetween, isValidIsoDate, todayIso } from "../shared/isoDate";
import { countsAsIncident } from "../shared/incidentTiers";
import { normalizeBrand } from "../shared/normalizeBrand";
import { EVIDENCE_TIER_NOTES, INCIDENT_SCOPE_DAYS, INCIDENT_SCOPE_NOTE } from "./incidentScope";

export interface DatasetMeta {
  /** ISO date this dataset was built. */
  builtAt: string;
  productCount: number;
  /** Products with at least one price observation from the last 90 days. */
  productsWithPrice: number;
  /** productsWithPrice / productCount, 0..1. */
  priceCoverage: number;
  priceObservationCount: number;
  oldestLastVerified?: string;
  oldestPriceAsOf?: string;
  /** Recalls and alerts inside the 10-year scope, and the products that one of them names. */
  incidentCount: number;
  productsWithIncidents: number;
  /** Report-tier entries (regulator investigations), counted apart because they are not confirmed recalls. */
  reportCount: number;
  /** Every official source that was searched, so "no incidents found" can say where and when. */
  incidentChecks: IncidentCheck[];
  /** The oldest of the latest check dates per regulator and per catalog brand: how fresh the "none found" claim is. */
  incidentsCheckedOn?: string;
  /** The scope text to show wherever incidents appear. */
  incidentScope: string;
  /** What each evidence tier means, to show beside the label. */
  incidentTiers: Record<EvidenceTier, string>;
}

export interface BuiltDataset {
  products: Product[];
  meta: DatasetMeta;
}

export interface BuildOptions {
  today?: string;
  incidents?: Incident[];
  incidentChecks?: IncidentCheck[];
}

function minIso(values: string[]): string | undefined {
  return values.length === 0 ? undefined : values.reduce((a, b) => (a < b ? a : b));
}

function inScope(incident: Incident, today: string): boolean {
  return isValidIsoDate(incident.date) && daysBetween(incident.date, today) <= INCIDENT_SCOPE_DAYS;
}

/** Attaches derived metrics to every product and summarises the dataset. Inputs are not modified. */
export function buildDataset(products: Product[], prices: PriceObservation[], options: BuildOptions = {}): BuiltDataset {
  const today = options.today ?? todayIso();
  const checks = options.incidentChecks ?? [];
  const incidents = (options.incidents ?? []).filter((i) => inScope(i, today));

  const built = products.map((p) => {
    const derived = deriveProductMetrics(p, prices, { today });
    const ofBrand = incidents.filter((i) => normalizeBrand(i.brand) === normalizeBrand(p.brand));
    derived.incidentCount = incidents.filter((i) => countsAsIncident(i) && i.productIds.includes(p.id)).length;
    derived.brandIncidentCount = ofBrand.filter(countsAsIncident).length;
    derived.reportCount = incidents.filter((i) => !countsAsIncident(i) && i.productIds.includes(p.id)).length;
    derived.brandReportCount = ofBrand.filter((i) => !countsAsIncident(i)).length;
    return { ...p, derived };
  });

  const productsWithPrice = built.filter((p) => p.derived.priceObservationCount > 0).length;
  // One "none found" claim per regulator and per brand; the dataset is only as fresh as the oldest of them.
  const latestPerSource = new Map<string, string>();
  for (const c of checks) {
    const key = c.tier === "company-or-trade" && c.brand !== undefined ? `brand:${normalizeBrand(c.brand)}` : `${c.tier}:${c.jurisdiction}`;
    if ((latestPerSource.get(key) ?? "") < c.checkedOn) {
      latestPerSource.set(key, c.checkedOn);
    }
  }

  const meta: DatasetMeta = {
    builtAt: today,
    productCount: built.length,
    productsWithPrice,
    priceCoverage: built.length === 0 ? 0 : productsWithPrice / built.length,
    priceObservationCount: prices.length,
    incidentCount: incidents.filter(countsAsIncident).length,
    productsWithIncidents: built.filter((p) => (p.derived.incidentCount ?? 0) > 0).length,
    reportCount: incidents.filter((i) => !countsAsIncident(i)).length,
    incidentChecks: checks,
    incidentScope: INCIDENT_SCOPE_NOTE,
    incidentTiers: EVIDENCE_TIER_NOTES,
  };
  const oldestLastVerified = minIso(products.map((p) => p.lastVerified));
  if (oldestLastVerified !== undefined) {
    meta.oldestLastVerified = oldestLastVerified;
  }
  const oldestPriceAsOf = minIso(prices.map((o) => o.asOf));
  if (oldestPriceAsOf !== undefined) {
    meta.oldestPriceAsOf = oldestPriceAsOf;
  }
  const incidentsCheckedOn = minIso([...latestPerSource.values()]);
  if (incidentsCheckedOn !== undefined) {
    meta.incidentsCheckedOn = incidentsCheckedOn;
  }
  return { products: built, meta };
}
