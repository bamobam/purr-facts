import type { EvidenceTier, Incident, ProductDetail } from "../api";
import { useAppData } from "../AppData";

const TIER_LABEL: Record<EvidenceTier, string> = {
  regulator: "Regulator notice",
  "company-or-trade": "Company or trade report",
  report: "Regulator investigation, not a recall",
};

function IncidentItem({ incident }: { incident: Incident }) {
  return (
    <li className="incident">
      <p className="incident-head">
        <strong>{incident.date}</strong> · {incident.jurisdiction === "CA" ? "Canada" : "United States"} · {TIER_LABEL[incident.evidenceTier]} · {incident.type.replace("-", " ")}
        {incident.recallClass ? ` · ${incident.recallClass}` : ""}
      </p>
      <p>
        <strong>{incident.brand}:</strong> {incident.reason}.
      </p>
      <p>{incident.affects}</p>
      <p>
        <a href={incident.sourceUrl} target="_blank" rel="noreferrer">
          Read the source
        </a>
        {incident.jurisdiction === "US" && " (a US notice: check the lot numbers and whether it applied in Canada)"}
      </p>
    </li>
  );
}

export function IncidentsSection({ detail }: { detail: ProductDetail }) {
  const { meta } = useAppData();
  const { product, incidents, brandIncidents, incidentStatus } = detail;
  const checkedOn = incidentStatus.checkedOn ?? "an unknown date";
  const brandChecks = (meta?.incidentChecks ?? []).filter((c) => c.tier === "regulator" || c.brand?.toLowerCase() === product.brand.toLowerCase());
  // Investigations are shown apart from recalls and never mixed into one list.
  const recalls = incidents.filter((i) => i.evidenceTier !== "report");
  const reports = incidents.filter((i) => i.evidenceTier === "report");
  const brandRecalls = brandIncidents.filter((i) => i.evidenceTier !== "report");
  const brandReports = brandIncidents.filter((i) => i.evidenceTier === "report");

  return (
    <section aria-labelledby="incidents-heading">
      <h2 id="incidents-heading">Recalls and safety alerts</h2>
      {recalls.length > 0 ? (
        <>
          <p>These notices name this food:</p>
          <IncidentList items={recalls} />
        </>
      ) : (
        <p>
          No recall or safety alert names this food in the sources we checked, as of {checkedOn}. This is not a safety rating: some recalls never appear in these sources.
        </p>
      )}
      {reports.length > 0 && (
        <>
          <h3>Regulator investigations that name this food (not recalls)</h3>
          <p className="muted">{incidentStatus.tiers.report}</p>
          <IncidentList items={reports} />
        </>
      )}
      {brandRecalls.length > 0 && (
        <>
          <h3>Other notices involving {product.brand}</h3>
          <p className="muted">These do not name this food. They are shown because the brand also appears in them.</p>
          <IncidentList items={brandRecalls} />
        </>
      )}
      {brandReports.length > 0 && (
        <>
          <h3>Regulator investigations that name {product.brand} (not recalls)</h3>
          <p className="muted">{incidentStatus.tiers.report}</p>
          <IncidentList items={brandReports} />
        </>
      )}
      <details>
        <summary>What was checked, and what is not covered</summary>
        <p>{incidentStatus.scope}</p>
        <dl>
          {(Object.keys(incidentStatus.tiers) as EvidenceTier[]).map((tier) => (
            <div key={tier}>
              <dt>{TIER_LABEL[tier]}</dt>
              <dd>{incidentStatus.tiers[tier]}</dd>
            </div>
          ))}
        </dl>
        {brandChecks.length > 0 && (
          <>
            <p>Sources searched for this brand:</p>
            <ul>
              {brandChecks.map((c) => (
                <li key={`${c.tier}-${c.source}`}>
                  <a href={c.url} target="_blank" rel="noreferrer">
                    {c.source}
                  </a>{" "}
                  (searched {c.checkedOn}, from {c.coversFrom})
                </li>
              ))}
            </ul>
          </>
        )}
      </details>
    </section>
  );
}

function IncidentList({ items }: { items: Incident[] }) {
  return (
    <ul className="incident-list">
      {items.map((i) => (
        <IncidentItem key={i.id} incident={i} />
      ))}
    </ul>
  );
}
