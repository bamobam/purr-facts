import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MAX_COMPARE, useAppData } from "../AppData";
import { BenchmarkMetric, ProductDetail, useApi } from "../api";
import { Alternatives } from "../components/Alternatives";
import { LabelBadges } from "../components/Badges";
import { ReportLink } from "../components/ReportLink";
import { IncidentsSection } from "../components/Incidents";
import { cohortLabel, describeBenchmark, displayName, formatMoney, formatNumber, formatNutrient } from "../lib/format";

const BENCHMARK_LABEL: Record<BenchmarkMetric, string> = {
  proteinGPer1000kcal: "Protein per 1000 kcal",
  fatGPer1000kcal: "Fat per 1000 kcal",
  dmProtein: "Dry-matter protein",
  pricePerKg: "Price per kg",
  pricePer1000kcal: "Price per 1000 kcal",
};

export function ProductPage() {
  const { id = "" } = useParams();
  const { selected, toggleSelected } = useAppData();
  const [includeAllStages, setIncludeAllStages] = useState(false);
  const { data, error, loading } = useApi<ProductDetail>(`/products/${encodeURIComponent(id)}?includeAllStages=${includeAllStages}`);

  if (error) {
    return (
      <p role="alert">
        Couldn't load this food: {error}. <Link to="/">Back to the catalog</Link>.
      </p>
    );
  }
  if (!data) {
    return <p role="status">{loading ? "Loading…" : ""}</p>;
  }

  const { product: p, benchmarks } = data;
  const d = p.derived;
  const inCompare = selected.includes(p.id);
  const cohort = cohortLabel(p, includeAllStages);

  return (
    <>
      <p className="crumbs">
        <Link to="/">← All foods</Link>
      </p>
      <h1>{displayName(p)}</h1>
      <p className="meta-line">
        {p.foodType === "wet" ? "Wet food" : "Dry food"} · {p.variant} · <LabelBadges product={p} /> · made by {p.parentCompany}
      </p>
      <p>
        <button type="button" onClick={() => toggleSelected(p.id)} disabled={!inCompare && selected.length >= MAX_COMPARE}>
          {inCompare ? "Remove from compare" : "Add to compare"}
        </button>{" "}
        {selected.length > 0 && <Link to={`/compare?ids=${selected.join(",")}`}>Compare {selected.length} selected</Link>}{" "}
        <ReportLink food={`${displayName(p)} (${p.id})`} label="Report an error with this food" />
      </p>

      <section aria-labelledby="label-heading">
        <h2 id="label-heading">What the label says</h2>
        <table className="kv">
          <thead>
            <tr>
              <th scope="col">Nutrient</th>
              <th scope="col">As fed</th>
              <th scope="col">What the figure means</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Protein</th>
              <td>{formatNutrient(p.proteinPct, p.proteinBasis)}</td>
              <td>{basisText(p.proteinBasis)}</td>
            </tr>
            <tr>
              <th scope="row">Fat</th>
              <td>{formatNutrient(p.fatPct, p.fatBasis)}</td>
              <td>{basisText(p.fatBasis)}</td>
            </tr>
            <tr>
              <th scope="row">Fibre</th>
              <td>{formatNutrient(p.fiberPct, p.fiberBasis)}</td>
              <td>{basisText(p.fiberBasis)}</td>
            </tr>
            <tr>
              <th scope="row">Moisture</th>
              <td>{formatNutrient(p.moisturePct, p.moistureBasis)}</td>
              <td>{basisText(p.moistureBasis)}</td>
            </tr>
            <tr>
              <th scope="row">Energy</th>
              <td>{p.kcalPerKg === undefined ? "—" : `${formatNumber(p.kcalPerKg)} kcal/kg`}</td>
              <td>As stated on the label{p.packageSizeG ? `; package ${p.packageSizeG} g${p.packageUnits ? ` (${p.packageUnits} units)` : ""}` : ""}</td>
            </tr>
          </tbody>
        </table>
        <p className="muted small">
          Source:{" "}
          <a href={p.sourceUrl} target="_blank" rel="noreferrer">
            manufacturer or retailer page
          </a>
          , last checked {p.lastVerified}.{p.reformulatedOn ? ` Reformulated ${p.reformulatedOn}.` : ""}
        </p>
      </section>

      <section aria-labelledby="derived-heading">
        <h2 id="derived-heading">Per calorie and per dollar</h2>
        <p className="muted">Computed from the label figures above. Because those are minimums, the real amounts are at least this much.</p>
        <table className="kv">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Protein</th>
              <th scope="col">Fat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Grams per 1000 kcal</th>
              <td>{formatNumber(d?.proteinGPer1000kcal, 1)}</td>
              <td>{formatNumber(d?.fatGPer1000kcal, 1)}</td>
            </tr>
            <tr>
              <th scope="row">Dry matter</th>
              <td>{d?.dmProtein === undefined ? "—" : `${formatNumber(d.dmProtein, 1)}%`}</td>
              <td>{d?.dmFat === undefined ? "—" : `${formatNumber(d.dmFat, 1)}%`}</td>
            </tr>
            <tr>
              <th scope="row">Share of calories</th>
              <td>{d?.proteinKcalPct === undefined ? "—" : `${formatNumber(d.proteinKcalPct, 0)}%`}</td>
              <td>{d?.fatKcalPct === undefined ? "—" : `${formatNumber(d.fatKcalPct, 0)}%`}</td>
            </tr>
          </tbody>
        </table>
        <h3>Price (CAD)</h3>
        {d && d.priceObservationCount > 0 ? (
          <p>
            {formatMoney(d.pricePerLb)} per lb · {formatMoney(d.pricePerKg)} per kg · {formatMoney(d.pricePer1000kcal)} per 1000 kcal. Median of {d.priceObservationCount} listing
            {d.priceObservationCount === 1 ? "" : "s"} from the last 90 days
            {d.priceRangePerKg && d.priceRangePerKg[0] !== d.priceRangePerKg[1] ? `, ranging ${formatMoney(d.priceRangePerKg[0])} to ${formatMoney(d.priceRangePerKg[1])} per kg` : ""}.
          </p>
        ) : (
          <p>No recent price on file, so this food is left out of price comparisons.</p>
        )}
      </section>

      <section aria-labelledby="bench-heading">
        <h2 id="bench-heading">How it compares</h2>
        <p>
          <label className="check">
            <input
              type="checkbox"
              checked={includeAllStages}
              disabled={p.adequacyStage === "not-stated"}
              onChange={(e) => setIncludeAllStages(e.target.checked)}
            />
            Also compare with foods labelled for all life stages
          </label>
        </p>
        {p.adequacyStage === "not-stated" && <p className="muted">This label doesn't state a life stage, so it can only be compared with other foods that don't either.</p>}
        <ul className="plain">
          {(Object.keys(BENCHMARK_LABEL) as BenchmarkMetric[]).map((metric) => (
            <li key={metric}>{describeBenchmark(BENCHMARK_LABEL[metric], benchmarks[metric], cohort)}</li>
          ))}
        </ul>
        <p className="muted small">A position among similar foods, not a quality score. Higher protein per calorie is not better for every cat.</p>
      </section>

      <Alternatives productId={p.id} stage={p.adequacyStage} includeAllStages={includeAllStages} />

      <IncidentsSection detail={data} />
    </>
  );
}

function basisText(basis: string | undefined): string {
  return basis === "guaranteed-min" ? "Guaranteed minimum: at least this much" : basis === "guaranteed-max" ? "Guaranteed maximum: at most this much" : basis === "typical" ? "Typical value" : "Basis not recorded";
}
