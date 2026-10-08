import { parse } from "csv-parse/sync";
import { EvidenceTier, Incident, IncidentCheck, IncidentType, Jurisdiction } from "../models/Incident";

export function loadIncidents(csvContent: string): Incident[] {
  const rows: Record<string, string>[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  return rows.map((row) => {
    const incident: Incident = {
      id: row.id,
      brand: row.brand,
      productIds: row.productIds.split(";").map((id) => id.trim()).filter((id) => id !== ""),
      date: row.date,
      type: row.type as IncidentType,
      evidenceTier: row.evidenceTier as EvidenceTier,
      reason: row.reason,
      jurisdiction: row.jurisdiction as Jurisdiction,
      affects: row.affects,
      sourceUrl: row.sourceUrl,
    };
    if (row.recallClass !== "") {
      incident.recallClass = row.recallClass;
    }
    return incident;
  });
}

export function loadIncidentChecks(csvContent: string): IncidentCheck[] {
  const rows: Record<string, string>[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  return rows.map((row) => {
    const check: IncidentCheck = {
      tier: row.tier as EvidenceTier,
      jurisdiction: row.jurisdiction as Jurisdiction,
      source: row.source,
      checkedOn: row.checkedOn,
      coversFrom: row.coversFrom,
      url: row.url,
    };
    if (row.brand !== "") {
      check.brand = row.brand;
    }
    return check;
  });
}
