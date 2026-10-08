import type { BenchmarkResult } from "../../../src/metrics/benchmarks";
import { MIN_COHORT_SIZE } from "../../../src/metrics/benchmarks";
import type { DerivedMetrics } from "../../../src/models/DerivedMetrics";
import type { Basis, AdequacyStage, Product } from "../../../src/models/Product";

const DASH = "—";

export function formatNumber(value: number | undefined, digits = 0): string {
  return value === undefined ? DASH : value.toFixed(digits);
}

/** Percent with its basis: a guaranteed minimum reads "≥ 9%", a maximum "≤ 78%". */
export function formatNutrient(value: number | undefined, basis: Basis | undefined): string {
  if (value === undefined) {
    return DASH;
  }
  const text = `${Number(value.toFixed(1))}%`;
  if (basis === "guaranteed-min") {
    return `≥ ${text}`;
  }
  if (basis === "guaranteed-max") {
    return `≤ ${text}`;
  }
  return text;
}

export function formatMoney(value: number | undefined): string {
  return value === undefined ? DASH : `$${value.toFixed(2)}`;
}

export function stageLabel(stage: AdequacyStage): string {
  return stage === "adult-maintenance" ? "adult maintenance" : stage === "all-life-stages" ? "all life stages" : "stage not stated";
}

export function standardLabel(standard: Product["adequacyStandard"]): string {
  return standard === "aafco" ? "AAFCO" : standard === "fediaf" ? "FEDIAF" : "No standard cited";
}

/** One sentence about where a food sits among its peers. A position, never a verdict. */
export function describeBenchmark(label: string, result: BenchmarkResult, cohort: string): string {
  if (result.suppressed) {
    if (result.reason === "not enough peers") {
      return `${label}: only ${result.cohortSize} other ${cohort} have a value, and ${MIN_COHORT_SIZE} are needed for a comparison.`;
    }
    return `${label}: no value for this food, so it can't be compared.`;
  }
  const others = `${result.cohortSize} other ${cohort}`;
  if (result.percentile >= 100) {
    return `${label} is higher than all ${others}.`;
  }
  if (result.percentile <= 0) {
    return `${label} is not higher than any of the ${others}.`;
  }
  return `${label} is higher than ${Math.round(result.percentile)}% of the ${others}.`;
}

/** Indexes of the best values in a row, including ties. Empty unless two or more differing values exist. */
export function bestIndexes(values: (number | undefined)[], better: "higher" | "lower"): number[] {
  const present = values.filter((v): v is number => v !== undefined);
  if (present.length < 2 || present.every((v) => v === present[0])) {
    return [];
  }
  const best = better === "higher" ? Math.max(...present) : Math.min(...present);
  return values.flatMap((v, i) => (v === best ? [i] : []));
}

export type SortKey = "name" | "proteinGPer1000kcal" | "fatGPer1000kcal" | "dmProtein" | "dmFat" | "proteinPct" | "fatPct" | "pricePerLb" | "pricePer1000kcal";

function sortValue(p: Product, key: Exclude<SortKey, "name">): number | undefined {
  return key === "proteinPct" || key === "fatPct" ? p[key] : p.derived?.[key];
}

export function sortProducts(products: Product[], key: SortKey, direction: "asc" | "desc"): Product[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    if (key === "name") {
      return sign * `${a.brand} ${a.productName}`.localeCompare(`${b.brand} ${b.productName}`);
    }
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av === undefined && bv === undefined) {
      return 0;
    }
    if (av === undefined) {
      return 1;
    }
    if (bv === undefined) {
      return -1;
    }
    return sign * (av - bv);
  });
}

/** Names the group a benchmark compares against, e.g. "adult maintenance wet foods". */
export function cohortLabel(product: Product, includeAllStages: boolean): string {
  if (product.adequacyStage === "not-stated") {
    return `${product.foodType} foods with no stated life stage`;
  }
  const stage = includeAllStages ? "adult maintenance or all life stages" : stageLabel(product.adequacyStage);
  return `${stage} ${product.foodType} foods`;
}

/**
 * "Brand Product", without repeating words the product name already starts with: "Meow Mix" +
 * "Meow Mix Original Choice" and "Hill's Science Diet" + "Science Diet Adult" both read cleanly.
 */
export function displayName(product: Pick<Product, "brand" | "productName">): string {
  const brandWords = product.brand.split(/\s+/);
  const nameWords = product.productName.split(/\s+/);
  for (let overlap = Math.min(brandWords.length, nameWords.length); overlap > 0; overlap--) {
    const tail = brandWords.slice(brandWords.length - overlap).join(" ").toLowerCase();
    const head = nameWords.slice(0, overlap).join(" ").toLowerCase();
    if (tail === head) {
      return [...brandWords, ...nameWords.slice(overlap)].join(" ");
    }
  }
  return `${product.brand} ${product.productName}`;
}

/** Shown beside the all-life-stages toggle: why those foods are compared separately by default. */
export const ALL_STAGES_NOTE =
  "Foods labelled for all life stages are typically more calorie-dense, which is why they are compared separately unless you include them.";

/**
 * The "recall flags" cell. A regulator investigation is never worded as a recall, and a notice that
 * only involves the brand is shown only when nothing names the food itself.
 */
export function flagText(d: DerivedMetrics | undefined): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const recalls = d?.incidentCount ?? 0;
  const reports = d?.reportCount ?? 0;
  const brandNotices = d?.brandIncidentCount ?? 0;
  const brandReports = d?.brandReportCount ?? 0;
  if (recalls > 0) {
    return `Named in ${plural(recalls, "recall", "recalls")}`;
  }
  if (reports > 0) {
    return `Named in ${plural(reports, "investigation", "investigations")}, not ${reports === 1 ? "a recall" : "recalls"}`;
  }
  if (brandNotices > 0) {
    return `Brand has ${plural(brandNotices, "other notice", "other notices")}`;
  }
  if (brandReports > 0) {
    return `Brand named in ${plural(brandReports, "investigation", "investigations")}, not ${brandReports === 1 ? "a recall" : "recalls"}`;
  }
  return "None found";
}
