import { EvidenceTier } from "../models/Incident";

/** The text shown wherever incidents appear; kept in one place so every screen says the same thing. */
export const INCIDENT_SCOPE_NOTE =
  "Incidents are recalls, market withdrawals and safety alerts from the last 10 years, drawn from three kinds of source, each labelled. " +
  "Regulator notices come from the CFIA or Health Canada, or from the FDA. Company or trade entries come from a manufacturer's own announcement " +
  "or from the trade and veterinary press, and name a dated recall. Reports are regulator investigations that name a brand; they are not " +
  "confirmed recalls and are not counted as incidents. A US notice does not by itself mean a Canadian lot is affected, so check the notice " +
  "for lot numbers. Recalls that cover only dog food are not included, because dogs and cats have different nutrient needs. Consumer complaints, " +
  "social media posts and lawsuits are not included. Pet food recall reporting in Canada is largely " +
  "voluntary, so a food with no entry here has not necessarily never been recalled.";

export const EVIDENCE_TIER_NOTES: Record<EvidenceTier, string> = {
  regulator: "Published by the CFIA, Health Canada or the FDA.",
  "company-or-trade": "From the manufacturer's own announcement or the trade and veterinary press. A dated recall that names the product or line.",
  report: "A regulator investigation or adverse-event summary that names the brand. Not a confirmed recall, and no cause has been established.",
};

/** Incidents older than this many days fall outside the scope (10 years, with leeway for leap days). */
export const INCIDENT_SCOPE_DAYS = 10 * 365 + 3;
