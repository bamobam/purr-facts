import fs from "fs";
import path from "path";
import { buildDataset } from "../data/buildDataset";
import { loadCuratedProducts } from "./loadCuratedProducts";
import { loadIncidentChecks, loadIncidents } from "./loadIncidents";
import { loadPrices } from "./loadPrices";
import { validateIncidents } from "./validateIncidents";
import { validatePrices } from "./validatePrices";
import { validateProducts } from "./validateProducts";
import { ValidationIssue } from "./validationTypes";

/**
 * `npm run build:data`  validates data/*.csv and writes data/products.json.
 * `npm run validate:data` (--check) validates only, writing nothing.
 * `--strict` also fails on warnings (stale prices, stale source checks, kcal mismatches); the
 * scheduled data-freshness workflow uses it so data that has aged out turns a check red.
 */
function report(label: string, issues: ValidationIssue[]): void {
  for (const issue of issues) {
    const where = issue.field ? `${issue.productId}.${issue.field}` : issue.productId;
    console.log(`${issue.severity.toUpperCase().padEnd(7)} ${label} ${where}: ${issue.message}`);
  }
}

function main(): void {
  const checkOnly = process.argv.includes("--check");
  const strict = process.argv.includes("--strict");
  const dataDir = path.resolve(__dirname, "../../data");

  const products = loadCuratedProducts(fs.readFileSync(path.join(dataDir, "curated-products.csv"), "utf-8"));
  const prices = loadPrices(fs.readFileSync(path.join(dataDir, "prices.csv"), "utf-8"));
  const incidents = loadIncidents(fs.readFileSync(path.join(dataDir, "incidents.csv"), "utf-8"));
  const incidentChecks = loadIncidentChecks(fs.readFileSync(path.join(dataDir, "incident-checks.csv"), "utf-8"));
  console.log(`Loaded ${products.length} products, ${prices.length} price observations and ${incidents.length} incidents`);

  const productIssues = validateProducts(products);
  const priceIssues = validatePrices(prices, products);
  const incidentIssues = validateIncidents(incidents, incidentChecks, products);
  report("products ", productIssues);
  report("prices   ", priceIssues);
  report("incidents", incidentIssues);

  const allIssues = [...productIssues, ...priceIssues, ...incidentIssues];
  const errors = allIssues.filter((i) => i.severity === "error").length;
  const warnings = allIssues.filter((i) => i.severity === "warning").length;
  console.log(`${errors} error(s), ${warnings} warning(s)`);
  if (errors > 0 || (strict && warnings > 0)) {
    process.exit(1);
  }

  if (!checkOnly) {
    const { products: built, meta } = buildDataset(products, prices, { incidents, incidentChecks });
    fs.writeFileSync(path.join(dataDir, "products.json"), JSON.stringify(built, null, 2));
    fs.writeFileSync(path.join(dataDir, "meta.json"), JSON.stringify(meta, null, 2));
    fs.writeFileSync(path.join(dataDir, "incidents.json"), JSON.stringify(incidents, null, 2));
    console.log(`Wrote data/products.json (${built.length} products) and data/meta.json and data/incidents.json (price coverage ${Math.round(meta.priceCoverage * 100)}%)`);
  }
}

main();
