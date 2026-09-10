import { expect } from "chai";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { FoodType, LifeStage } from "../../src/models/Product";

const FOOD_TYPES: FoodType[] = ["dry", "wet", "treat"];
const LIFE_STAGES: LifeStage[] = ["kitten", "adult", "senior", "all"];
const PCT_FIELDS = ["proteinPct", "fatPct", "fiberPct", "moisturePct"];
const NUMERIC_FIELDS = [...PCT_FIELDS, "calorieDensity", "price"];

describe("data/curated-products.csv", () => {
  const csvPath = path.resolve(__dirname, "../../data/curated-products.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows: Record<string, string>[] = parse(raw, { columns: true, skip_empty_lines: true });

  it("has at least 30 rows", () => {
    expect(rows.length).to.be.at.least(30);
  });

  it("spans at least 5 distinct brands", () => {
    const brands = new Set(rows.map((r) => r.brand));
    expect(brands.size).to.be.at.least(5);
  });

  it("every row has a non-empty id, brand, productName, and variant", () => {
    for (const row of rows) {
      expect(row.id, "id").to.not.be.empty;
      expect(row.brand, "brand").to.not.be.empty;
      expect(row.productName, "productName").to.not.be.empty;
      expect(row.variant, "variant").to.not.be.empty;
    }
  });

  it("every row's ids are unique", () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).to.equal(ids.length);
  });

  it("every row's foodType is a valid enum value", () => {
    for (const row of rows) {
      expect(FOOD_TYPES, `${row.id} foodType "${row.foodType}"`).to.include(row.foodType);
    }
  });

  it("every row's lifeStage is a valid enum value", () => {
    for (const row of rows) {
      expect(LIFE_STAGES, `${row.id} lifeStage "${row.lifeStage}"`).to.include(row.lifeStage);
    }
  });

  it("every row's numeric fields parse as valid, non-negative numbers", () => {
    for (const row of rows) {
      for (const field of NUMERIC_FIELDS) {
        const value = Number(row[field]);
        expect(Number.isNaN(value), `${row.id} ${field} "${row[field]}" should be a number`).to.be.false;
        expect(value, `${row.id} ${field}`).to.be.at.least(0);
      }
    }
  });

  it("every row's percentage fields (protein/fat/fiber/moisture) are at most 100", () => {
    for (const row of rows) {
      for (const field of PCT_FIELDS) {
        expect(Number(row[field]), `${row.id} ${field}`).to.be.at.most(100);
      }
    }
  });

  it("every row has a real-looking http(s) sourceUrl", () => {
    for (const row of rows) {
      expect(row.sourceUrl, row.id).to.match(/^https?:\/\/.+/);
    }
  });

  it("every row's dataSource is 'curated'", () => {
    for (const row of rows) {
      expect(row.dataSource, row.id).to.equal("curated");
    }
  });
});
