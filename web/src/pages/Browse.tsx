import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MAX_COMPARE, useAppData } from "../AppData";
import { LabelBadges } from "../components/Badges";
import { displayName, formatMoney, formatNumber, formatNutrient, SortKey, sortProducts } from "../lib/format";
import type { Product } from "../api";

type Basis = "kcal" | "dm" | "asfed";

const BASIS_LABEL: Record<Basis, string> = { kcal: "Per 1000 kcal", dm: "Dry matter", asfed: "As fed" };

function nutrientCell(p: Product, nutrient: "protein" | "fat", basis: Basis): string {
  const d = p.derived;
  if (basis === "kcal") {
    const v = nutrient === "protein" ? d?.proteinGPer1000kcal : d?.fatGPer1000kcal;
    return v === undefined ? "—" : `${formatNumber(v, 0)} g`;
  }
  if (basis === "dm") {
    const v = nutrient === "protein" ? d?.dmProtein : d?.dmFat;
    return v === undefined ? "—" : `${formatNumber(v, 0)}%`;
  }
  return nutrient === "protein" ? formatNutrient(p.proteinPct, p.proteinBasis) : formatNutrient(p.fatPct, p.fatBasis);
}

function flagText(p: Product): string {
  const n = p.derived?.incidentCount ?? 0;
  const b = p.derived?.brandIncidentCount ?? 0;
  if (n > 0) {
    return `Named in ${n} recall${n === 1 ? "" : "s"}`;
  }
  if (b > 0) {
    return `Brand has ${b} other notice${b === 1 ? "" : "s"}`;
  }
  return "None found";
}

export function Browse() {
  const { products, meta, loading, error, selected, toggleSelected } = useAppData();
  const [query, setQuery] = useState("");
  const [foodType, setFoodType] = useState("");
  const [stage, setStage] = useState("");
  const [brand, setBrand] = useState("");
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [basis, setBasis] = useState<Basis>("kcal");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        (q === "" || `${p.brand} ${p.productName} ${p.variant}`.toLowerCase().includes(q)) &&
        (foodType === "" || p.foodType === foodType) &&
        (stage === "" || p.adequacyStage === stage) &&
        (brand === "" || p.brand === brand) &&
        (!onlyPriced || p.derived?.pricePerLb !== undefined)
    );
    return sortProducts(filtered, sortKey, direction);
  }, [products, query, foodType, stage, brand, onlyPriced, sortKey, direction]);

  function sortBy(key: SortKey, defaultDirection: "asc" | "desc") {
    if (key === sortKey) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection(defaultDirection);
    }
  }

  function header(label: string, key: SortKey, defaultDirection: "asc" | "desc") {
    const active = key === sortKey;
    return (
      <th scope="col" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" className="sort" onClick={() => sortBy(key, defaultDirection)}>
          {label}
          <span aria-hidden="true">{active ? (direction === "asc" ? " ▲" : " ▼") : ""}</span>
        </button>
      </th>
    );
  }

  const proteinKey: SortKey = basis === "dm" ? "dmProtein" : basis === "asfed" ? "proteinPct" : "proteinGPer1000kcal";
  const fatKey: SortKey = basis === "dm" ? "dmFat" : basis === "asfed" ? "fatPct" : "fatGPer1000kcal";

  if (error) {
    return <p role="alert">Couldn't load the catalog: {error}</p>;
  }

  return (
    <>
      <h1>Compare cat foods by what's in them per calorie</h1>
      <p className="lede">
        Canadian foods, ranked on label figures per 1000 kcal so wet and dry foods can be compared fairly. Pick a food to see alternatives, or tick up to {MAX_COMPARE} to compare side by side.
      </p>

      <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Filter foods">
        <label>
          Search
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Brand or name" />
        </label>
        <label>
          Food type
          <select value={foodType} onChange={(e) => setFoodType(e.target.value)}>
            <option value="">All</option>
            <option value="wet">Wet</option>
            <option value="dry">Dry</option>
          </select>
        </label>
        <label>
          Label life stage
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">All</option>
            <option value="adult-maintenance">Adult maintenance</option>
            <option value="all-life-stages">All life stages</option>
            <option value="not-stated">Not stated</option>
          </select>
        </label>
        <label>
          Brand
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          Protein and fat shown
          <select value={basis} onChange={(e) => setBasis(e.target.value as Basis)}>
            {(Object.keys(BASIS_LABEL) as Basis[]).map((b) => (
              <option key={b} value={b}>
                {BASIS_LABEL[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={onlyPriced} onChange={(e) => setOnlyPriced(e.target.checked)} />
          Only foods with a recent price
        </label>
      </form>

      <p role="status" className="muted">
        {loading ? "Loading…" : `${rows.length} of ${products.length} foods`}
      </p>

      <div className="table-wrap" tabIndex={0} role="region" aria-label="Foods table, scrolls sideways on small screens">
        <table>
          <caption className="sr-only">Cat foods with label figures and prices</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Compare</span>
              </th>
              {header("Food", "name", "asc")}
              <th scope="col">Label claim</th>
              {header(basis === "kcal" ? "Protein (g per 1000 kcal)" : basis === "dm" ? "Protein (dry matter)" : "Protein (as fed)", proteinKey, "desc")}
              {header(basis === "kcal" ? "Fat (g per 1000 kcal)" : basis === "dm" ? "Fat (dry matter)" : "Fat (as fed)", fatKey, "desc")}
              {header("Price per lb", "pricePerLb", "asc")}
              {header("Price per 1000 kcal", "pricePer1000kcal", "asc")}
              <th scope="col">Recall flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && selected.length >= MAX_COMPARE}
                      onChange={() => toggleSelected(p.id)}
                      aria-label={`Compare ${displayName(p)}`}
                    />
                  </td>
                  <th scope="row">
                    <Link to={`/product/${p.id}`}>{displayName(p)}</Link>
                    <span className="sub">{p.foodType === "wet" ? "Wet" : "Dry"}</span>
                  </th>
                  <td>
                    <LabelBadges product={p} />
                  </td>
                  <td className="num">{nutrientCell(p, "protein", basis)}</td>
                  <td className="num">{nutrientCell(p, "fat", basis)}</td>
                  <td className="num">{formatMoney(p.derived?.pricePerLb)}</td>
                  <td className="num">{formatMoney(p.derived?.pricePer1000kcal)}</td>
                  <td>{flagText(p)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && <p>No foods match these filters.</p>}

      <p className="muted small">
        Protein and fat come from guaranteed minimums on the label, so the real amounts are at least these. "None found" means no recall or safety alert names the food in the sources checked
        {meta?.incidentsCheckedOn ? ` as of ${meta.incidentsCheckedOn}` : ""}; it is not a safety rating. Prices are CAD, the median of recent listings.
      </p>
    </>
  );
}
