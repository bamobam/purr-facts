import { Incident } from "../models/Incident";

/** Report-tier entries are investigations, not recalls; they are shown but never counted as incidents. */
export function countsAsIncident(incident: Incident): boolean {
  return incident.evidenceTier !== "report";
}
