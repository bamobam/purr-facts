import { expect } from "chai";
import { aggregateProducts, GroupableField } from "../../src/queryEngine/aggregateProducts";
import { Product } from "../../src/models/Product";
import { makeProduct as makeBaseProduct } from "../fixtures/products";

function makeProduct(overrides: Partial<Product>): Product {
  return makeBaseProduct({ id: "p", brand: "A", productName: "Product", variant: "Original", foodType: "dry", ...overrides });
}

describe("aggregateProducts", () => {
  // A: proteinPct 10, 20 -> avg 15, count 2
  // B: proteinPct 30, undefined -> avg 30 (over 1 defined value), count 2
  // C: undefined, undefined -> avg uncomputable, count 2
  // D: proteinPct 15 -> avg 15, count 1
  const products: Product[] = [
    makeProduct({ id: "p1", brand: "A", foodType: "dry", proteinPct: 10 }),
    makeProduct({ id: "p2", brand: "A", foodType: "wet", proteinPct: 20 }),
    makeProduct({ id: "p3", brand: "B", foodType: "dry", proteinPct: 30 }),
    makeProduct({ id: "p4", brand: "B", foodType: "dry", proteinPct: undefined }),
    makeProduct({ id: "p5", brand: "C", foodType: "wet", proteinPct: undefined }),
    makeProduct({ id: "p6", brand: "C", foodType: "wet", proteinPct: undefined }),
    makeProduct({ id: "p7", brand: "D", foodType: "dry", proteinPct: 15 }),
  ];

  function byBrand(rows: Record<string, string | number>[]) {
    return Object.fromEntries(rows.map((r) => [r.brand, { metric: r.metric, count: r.count }]));
  }

  it("groups by a single field and averages, treating groups with no defined metric values as absent", () => {
    const result = aggregateProducts(products, { groupBy: ["brand"], function: "avg", field: "proteinPct" });
    const grouped = byBrand(result);
    expect(grouped.A).to.deep.equal({ metric: 15, count: 2 });
    expect(grouped.B).to.deep.equal({ metric: 30, count: 2 });
    expect(grouped.D).to.deep.equal({ metric: 15, count: 1 });
    expect(grouped.C).to.be.undefined;
  });

  it("count includes groups that have no defined metric values, since it doesn't depend on the field", () => {
    const result = aggregateProducts(products, { groupBy: ["brand"], function: "count" });
    const grouped = byBrand(result);
    expect(grouped.A).to.deep.equal({ metric: 2, count: 2 });
    expect(grouped.B).to.deep.equal({ metric: 2, count: 2 });
    expect(grouped.C).to.deep.equal({ metric: 2, count: 2 });
    expect(grouped.D).to.deep.equal({ metric: 1, count: 1 });
  });

  it("groups by multiple fields together as a composite key", () => {
    const result = aggregateProducts(products, { groupBy: ["brand", "foodType"], function: "avg", field: "proteinPct" });
    const adRow = result.find((r) => r.brand === "A" && r.foodType === "dry");
    const awRow = result.find((r) => r.brand === "A" && r.foodType === "wet");
    const bdRow = result.find((r) => r.brand === "B" && r.foodType === "dry");
    const cwRow = result.find((r) => r.brand === "C" && r.foodType === "wet");
    expect(adRow).to.deep.include({ metric: 10, count: 1 });
    expect(awRow).to.deep.include({ metric: 20, count: 1 });
    expect(bdRow).to.deep.include({ metric: 30, count: 2 });
    expect(cwRow).to.be.undefined;
  });

  it("computes min, max, and sum correctly", () => {
    const groupBy: GroupableField[] = ["brand"];
    const min = aggregateProducts(products, { groupBy, field: "proteinPct", function: "min" }).find((r) => r.brand === "A");
    const max = aggregateProducts(products, { groupBy, field: "proteinPct", function: "max" }).find((r) => r.brand === "A");
    const sum = aggregateProducts(products, { groupBy, field: "proteinPct", function: "sum" }).find((r) => r.brand === "A");
    expect(min?.metric).to.equal(10);
    expect(max?.metric).to.equal(20);
    expect(sum?.metric).to.equal(30);
  });

  it("having above-average keeps only groups whose metric exceeds the average of all group metrics", () => {
    // group metrics (excluding uncomputable C): A=15, B=30, D=15 -> average = 20
    const result = aggregateProducts(products, {
      groupBy: ["brand"],
      function: "avg",
      field: "proteinPct",
      having: "above-average",
    });
    expect(result.map((r) => r.brand)).to.deep.equal(["B"]);
  });

  it("having below-average keeps only groups whose metric is under the average of all group metrics", () => {
    const result = aggregateProducts(products, {
      groupBy: ["brand"],
      function: "avg",
      field: "proteinPct",
      having: "below-average",
    });
    expect(result.map((r) => r.brand).sort()).to.deep.equal(["A", "D"]);
  });

  it("sorts by metric ascending, breaking ties alphabetically by group key", () => {
    // A=15, D=15 (tie), B=30
    const result = aggregateProducts(products, {
      groupBy: ["brand"],
      function: "avg",
      field: "proteinPct",
      sort: "metric",
      order: "asc",
    });
    expect(result.map((r) => r.brand)).to.deep.equal(["A", "D", "B"]);
  });

  it("sorts by metric descending", () => {
    const result = aggregateProducts(products, {
      groupBy: ["brand"],
      function: "avg",
      field: "proteinPct",
      sort: "metric",
      order: "desc",
    });
    expect(result.map((r) => r.brand)).to.deep.equal(["B", "A", "D"]);
  });

  it("sorts by group key alphabetically", () => {
    const result = aggregateProducts(products, { groupBy: ["brand"], function: "count", sort: "group", order: "asc" });
    expect(result.map((r) => r.brand)).to.deep.equal(["A", "B", "C", "D"]);

    const desc = aggregateProducts(products, { groupBy: ["brand"], function: "count", sort: "group", order: "desc" });
    expect(desc.map((r) => r.brand)).to.deep.equal(["D", "C", "B", "A"]);
  });
});
