export type IncidentType = "recall" | "market-withdrawal" | "safety-alert" | "investigation";

/** The regulator whose territory the notice covers: Canada (CFIA or Health Canada) or the United States (FDA). */
export type Jurisdiction = "CA" | "US";

export const EVIDENCE_TIERS = ["regulator", "company-or-trade", "report"] as const;

/**
 * How well the entry is evidenced, and so how it is shown:
 * - `regulator`: a notice, list or enforcement record published by the CFIA, Health Canada or the FDA.
 * - `company-or-trade`: a dated recall named in the manufacturer's own announcement or reported by the trade or veterinary press.
 * - `report`: a regulator's investigation or adverse-event summary that names the brand. Not a confirmed recall and never counted as one.
 */
export type EvidenceTier = (typeof EVIDENCE_TIERS)[number];

/**
 * A recall, market withdrawal, safety alert or investigation. `productIds` lists the catalog products
 * the notice names, by hand; it may be empty, which makes the incident brand-level context (for
 * example a dog food recall from a brand that also makes cat foods in the catalog). A US notice does
 * not by itself mean a Canadian lot is affected.
 */
export interface Incident {
  id: string;
  /** The brand as printed in the notice. */
  brand: string;
  productIds: string[];
  /** ISO date of the company announcement or the notice. */
  date: string;
  type: IncidentType;
  evidenceTier: EvidenceTier;
  reason: string;
  /** The notice's own hazard class, where it gives one. */
  recallClass?: string;
  jurisdiction: Jurisdiction;
  /** What the notice says is affected, in plain words, including anything it rules out. */
  affects: string;
  sourceUrl: string;
}

/** One search of one source. Without these, an empty incident list would mean nothing. */
export interface IncidentCheck {
  tier: EvidenceTier;
  jurisdiction: Jurisdiction;
  /** For `company-or-trade` checks, the catalog brand whose own pages were searched; blank for a regulator-wide list. */
  brand?: string;
  source: string;
  /** ISO date the source was searched. */
  checkedOn: string;
  /** Earliest date the search covered. */
  coversFrom: string;
  url: string;
}
