import { expect } from "chai";
import { filterProducts } from "../../src/queryEngine/filterProducts";
import { Product } from "../../src/models/Product";

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: "p1",
    brand: "Purina",
    productName: "Fancy Feast Chicken",
    variant: "Chicken",
    foodType: "wet",
    lifeStage: "adult",
    dataSource: "curated",
    ...overrides,
  };
}

describe("filterProducts", () => {
  const products: Product[] = [
    makeProduct({ id: "p1", brand: "Purina", variant: "Chicken", foodType: "wet", lifeStage: "adult", proteinPct: 11, fatPct: 3, price: 0.58 }),
    makeProduct({ id: "p2", brand: "Purina", variant: "Salmon", foodType: "wet", lifeStage: "adult", proteinPct: 10, fatPct: 3, price: 0.58 }),
    makeProduct({ id: "p3", brand: "Meow Mix", variant: "Original", foodType: "dry", lifeStage: "adult", proteinPct: 32, fatPct: 12, price: 0.12 }),
    makeProduct({ id: "p4", brand: "Blue Buffalo", variant: "Chicken", foodType: "dry", lifeStage: "kitten", proteinPct: 40, fatPct: 18, price: 0.35 }),
    makeProduct({ id: "p5", brand: "Blue Buffalo", variant: "Turkey", foodType: "wet", lifeStage: "senior" }),
  ];

  it("returns only products matching the given brand", () => {
    const result = filterProducts(products, { brand: "Purina" });
    expect(result.map((p) => p.id)).to.deep.equal(["p1", "p2"]);
  });

  it("returns all products when no filters are given", () => {
    const result = filterProducts(products, {});
    expect(result).to.have.length(5);
  });

  it("returns an empty array when no product matches the brand", () => {
    const result = filterProducts(products, { brand: "Nonexistent Brand" });
    expect(result).to.deep.equal([]);
  });

  it("matches brand case-insensitively", () => {
    const result = filterProducts(products, { brand: "purina" });
    expect(result.map((p) => p.id)).to.deep.equal(["p1", "p2"]);
  });

  it("matches brand with surrounding/extra whitespace normalized", () => {
    const result = filterProducts(products, { brand: "  Purina  " });
    expect(result.map((p) => p.id)).to.deep.equal(["p1", "p2"]);
  });

  it("filters by variant", () => {
    const result = filterProducts(products, { variant: "Chicken" });
    expect(result.map((p) => p.id)).to.deep.equal(["p1", "p4"]);
  });

  it("filters by foodType", () => {
    const result = filterProducts(products, { foodType: "dry" });
    expect(result.map((p) => p.id)).to.deep.equal(["p3", "p4"]);
  });

  it("filters by lifeStage", () => {
    const result = filterProducts(products, { lifeStage: "kitten" });
    expect(result.map((p) => p.id)).to.deep.equal(["p4"]);
  });

  it("filters by a proteinPct range", () => {
    const result = filterProducts(products, { proteinPctMin: 15, proteinPctMax: 35 });
    expect(result.map((p) => p.id)).to.deep.equal(["p3"]);
  });

  it("filters by a fatPct range", () => {
    const result = filterProducts(products, { fatPctMin: 10 });
    expect(result.map((p) => p.id)).to.deep.equal(["p3", "p4"]);
  });

  it("filters by a price range", () => {
    const result = filterProducts(products, { priceMax: 0.2 });
    expect(result.map((p) => p.id)).to.deep.equal(["p3"]);
  });

  it("excludes products missing the field a numeric range filter targets", () => {
    const result = filterProducts(products, { proteinPctMin: 0 });
    expect(result.map((p) => p.id)).to.deep.equal(["p1", "p2", "p3", "p4"]);
  });

  it("combines multiple filters with AND semantics", () => {
    const result = filterProducts(products, { brand: "Blue Buffalo", foodType: "dry" });
    expect(result.map((p) => p.id)).to.deep.equal(["p4"]);
  });

  it("combines three or more filters together with AND semantics", () => {
    const result = filterProducts(products, { brand: "Blue Buffalo", foodType: "dry", lifeStage: "kitten", proteinPctMin: 20 });
    expect(result.map((p) => p.id)).to.deep.equal(["p4"]);
  });
});
