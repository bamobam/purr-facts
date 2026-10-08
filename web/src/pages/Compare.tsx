import { Link, useSearchParams } from "react-router-dom";
import { MAX_COMPARE, useAppData } from "../AppData";
import type { Product } from "../api";
import { bestIndexes, displayName, formatMoney, formatNumber, formatNutrient, stageLabel, standardLabel } from "../lib/format";

interface Row {
  label: string;
  get: (p: Product) => number | undefined;
  show: (p: Product) => string;
  better?: "higher" | "lower";
}

const num = (digits: number, suffix = "") => (v: number | undefined) => (v === undefined ? "—" : `${formatNumber(v, digits)}${suffix}`);

const ROWS: { group: string; rows: Row[] }[] = [
  {
    group: "Per 1000 kcal",
    rows: [
      { label: "Protein (g)", get: (p) => p.derived?.proteinGPer1000kcal, show: (p) => num(1, " g")(p.derived?.proteinGPer1000kcal), better: "higher" },
      { label: "Fat (g)", get: (p) => p.derived?.fatGPer1000kcal, show: (p) => num(1, " g")(p.derived?.fatGPer1000kcal) },
      { label: "Protein, share of calories", get: (p) => p.derived?.proteinKcalPct, show: (p) => num(0, "%")(p.derived?.proteinKcalPct) },
      { label: "Fat, share of calories", get: (p) => p.derived?.fatKcalPct, show: (p) => num(0, "%")(p.derived?.fatKcalPct) },
    ],
  },
  {
    group: "Label figures (as fed)",
    rows: [
      { label: "Protein", get: (p) => p.proteinPct, show: (p) => formatNutrient(p.proteinPct, p.proteinBasis) },
      { label: "Fat", get: (p) => p.fatPct, show: (p) => formatNutrient(p.fatPct, p.fatBasis) },
      { label: "Fibre", get: (p) => p.fiberPct, show: (p) => formatNutrient(p.fiberPct, p.fiberBasis) },
      { label: "Moisture", get: (p) => p.moisturePct, show: (p) => formatNutrient(p.moisturePct, p.moistureBasis) },
      { label: "Dry-matter protein", get: (p) => p.derived?.dmProtein, show: (p) => num(1, "%")(p.derived?.dmProtein) },
      { label: "Dry-matter fat", get: (p) => p.derived?.dmFat, show: (p) => num(1, "%")(p.derived?.dmFat) },
      { label: "Energy (kcal/kg)", get: (p) => p.kcalPerKg, show: (p) => num(0)(p.kcalPerKg) },
    ],
  },
  {
    group: "Price (CAD)",
    rows: [
      { label: "Per lb", get: (p) => p.derived?.pricePerLb, show: (p) => formatMoney(p.derived?.pricePerLb), better: "lower" },
      { label: "Per kg", get: (p) => p.derived?.pricePerKg, show: (p) => formatMoney(p.derived?.pricePerKg), better: "lower" },
      { label: "Per 1000 kcal", get: (p) => p.derived?.pricePer1000kcal, show: (p) => formatMoney(p.derived?.pricePer1000kcal), better: "lower" },
      { label: "Listings behind the price", get: () => undefined, show: (p) => String(p.derived?.priceObservationCount ?? 0) },
    ],
  },
  {
    group: "Recalls and checks",
    rows: [
      {
        label: "Recalls naming this food",
        get: () => undefined,
        show: (p) => ((p.derived?.incidentCount ?? 0) > 0 ? `${p.derived?.incidentCount} (see the food's page)` : "None found"),
      },
      {
        label: "Other notices for the brand",
        get: () => undefined,
        show: (p) => String(Math.max((p.derived?.brandIncidentCount ?? 0) - (p.derived?.incidentCount ?? 0), 0)),
      },
      { label: "Label checked on", get: () => undefined, show: (p) => p.lastVerified },
    ],
  },
];

export function Compare() {
  const { products, loading, selected, toggleSelected, clearSelected, meta } = useAppData();
  const [params] = useSearchParams();
  const fromUrl = (params.get("ids") ?? "").split(",").filter((id) => id !== "");
  const ids = (fromUrl.length > 0 ? fromUrl : selected).slice(0, MAX_COMPARE);
  const chosen = ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => p !== undefined);

  if (loading) {
    return <p role="status">Loading…</p>;
  }
  if (chosen.length < 2) {
    return (
      <>
        <h1>Compare foods</h1>
        <p>Pick at least two foods to compare. Tick the boxes on the catalog, or use "Compare" next to an alternative on a food's page (up to {MAX_COMPARE}).</p>
        <p>
          <Link to="/">Go to the catalog</Link>
        </p>
      </>
    );
  }

  const mixed = new Set(chosen.map((p) => `${p.foodType}/${p.adequacyStage}`)).size > 1;

  return (
    <>
      <h1>Compare foods</h1>
      {mixed && (
        <p className="notice" role="note">
          These foods differ in type or label life stage, so they are not like-for-like. Per-calorie figures are the fairest basis, but check each label before drawing conclusions.
        </p>
      )}
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways on small screens">
        <table className="compare">
          <caption className="sr-only">Side-by-side comparison</caption>
          <thead>
            <tr>
              <td />
              {chosen.map((p) => (
                <th key={p.id} scope="col">
                  <Link to={`/product/${p.id}`}>{displayName(p)}</Link>
                  <span className="sub">
                    {p.foodType === "wet" ? "Wet" : "Dry"} · {stageLabel(p.adequacyStage)} · {standardLabel(p.adequacyStandard)}
                  </span>
                  <button type="button" className="link-button" onClick={() => toggleSelected(p.id)} hidden={!selected.includes(p.id)}>
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          {ROWS.map((group) => (
            <tbody key={group.group}>
              <tr className="group">
                <th colSpan={chosen.length + 1} scope="colgroup">
                  {group.group}
                </th>
              </tr>
              {group.rows.map((row) => {
                const best = row.better ? bestIndexes(chosen.map(row.get), row.better) : [];
                return (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {chosen.map((p, i) => (
                      <td key={p.id} className={best.includes(i) ? "num marked" : "num"}>
                        {row.show(p)}
                        {best.includes(i) && <span className="mark"> {row.better === "higher" ? "highest" : "lowest"}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="muted small">
        "Highest" and "lowest" only mark the extreme value in a row; they are not recommendations. Protein and fat are guaranteed minimums from the label.
        {meta?.incidentsCheckedOn ? ` Recalls were last searched ${meta.incidentsCheckedOn}.` : ""}
      </p>
      <p>
        <button type="button" onClick={clearSelected}>
          Clear selection
        </button>
      </p>
    </>
  );
}
