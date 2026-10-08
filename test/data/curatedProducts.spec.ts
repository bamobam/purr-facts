import { expect } from "chai";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { loadCuratedProducts } from "../../src/etl/loadCuratedProducts";
import { loadPrices } from "../../src/etl/loadPrices";
import { validateProducts } from "../../src/etl/validateProducts";
import { validatePrices } from "../../src/etl/validatePrices";
import { loadIncidents, loadIncidentChecks } from "../../src/etl/loadIncidents";
import { validateIncidents } from "../../src/etl/validateIncidents";

const EXPECTED_PRODUCT_COLUMNS = [
  "id", "brand", "parentCompany", "productName", "variant", "foodType", "adequacyStandard", "adequacyStage",
  "proteinPct", "proteinBasis", "fatPct", "fatBasis", "fiberPct", "fiberBasis", "moisturePct", "moistureBasis",
  "kcalPerKg", "packageSizeG", "packageUnits", "sourceUrl", "lastVerified", "reformulatedOn", "reformulationSourceUrl",
];
const EXPECTED_PRICE_COLUMNS = ["productId", "retailer", "price", "packageSizeG", "asOf", "url"];

const EXPECTED_INCIDENT_COLUMNS = ["id", "brand", "productIds", "date", "type", "evidenceTier", "reason", "recallClass", "jurisdiction", "affects", "sourceUrl"];
const EXPECTED_CHECK_COLUMNS = ["tier", "jurisdiction", "brand", "source", "checkedOn", "coversFrom", "url"];

const dataDir = path.resolve(__dirname, "../../data");
const productsCsv = fs.readFileSync(path.join(dataDir, "curated-products.csv"), "utf-8");
const pricesCsv = fs.readFileSync(path.join(dataDir, "prices.csv"), "utf-8");
const incidentsCsv = fs.readFileSync(path.join(dataDir, "incidents.csv"), "utf-8");
const checksCsv = fs.readFileSync(path.join(dataDir, "incident-checks.csv"), "utf-8");

describe("shipped data files", () => {
  it("curated-products.csv has exactly the documented columns, in order", () => {
    const [header] = parse(productsCsv, { to_line: 1 }) as string[][];
    expect(header).to.deep.equal(EXPECTED_PRODUCT_COLUMNS);
  });

  it("prices.csv has exactly the documented columns, in order", () => {
    const [header] = parse(pricesCsv, { to_line: 1 }) as string[][];
    expect(header).to.deep.equal(EXPECTED_PRICE_COLUMNS);
  });

  describe("curated-products.csv", () => {
    const products = loadCuratedProducts(productsCsv);
    const issues = validateProducts(products);

    it("has at least one product", () => {
      expect(products.length).to.be.greaterThan(0);
    });

    it("passes validation with no errors", () => {
      const errors = issues.filter((i) => i.severity === "error");
      expect(errors, JSON.stringify(errors, null, 2)).to.deep.equal([]);
    });

    it("passes validation with no warnings (a warning means a row to look at again)", () => {
      const warnings = issues.filter((i) => i.severity === "warning");
      expect(warnings, JSON.stringify(warnings, null, 2)).to.deep.equal([]);
    });
  });

  describe("prices.csv", () => {
    const products = loadCuratedProducts(productsCsv);
    const prices = loadPrices(pricesCsv);

    it("has no validation errors against the product list", () => {
      const errors = validatePrices(prices, products).filter((i) => i.severity === "error");
      expect(errors, JSON.stringify(errors, null, 2)).to.deep.equal([]);
    });
  });

  it("incidents.csv and incident-checks.csv have exactly the documented columns", () => {
    expect((parse(incidentsCsv, { to_line: 1 }) as string[][])[0]).to.deep.equal(EXPECTED_INCIDENT_COLUMNS);
    expect((parse(checksCsv, { to_line: 1 }) as string[][])[0]).to.deep.equal(EXPECTED_CHECK_COLUMNS);
  });

  describe("incidents", () => {
    const products = loadCuratedProducts(productsCsv);
    const issues = validateIncidents(loadIncidents(incidentsCsv), loadIncidentChecks(checksCsv), products);

    it("has no validation errors", () => {
      const errors = issues.filter((i) => i.severity === "error");
      expect(errors, JSON.stringify(errors, null, 2)).to.deep.equal([]);
    });

    it("has at least one incident that names a catalog product, and one in each tier that has entries", () => {
      const incidents = loadIncidents(incidentsCsv);
      const ids = new Set(products.map((p) => p.id));
      expect(incidents.some((i) => i.productIds.length > 0 && i.productIds.every((id) => ids.has(id)))).to.equal(true);
      expect(new Set(incidents.map((i) => i.evidenceTier))).to.include.all.keys("regulator", "company-or-trade");
    });
  });
});
