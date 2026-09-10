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
    makeProduct({ id: "p1", brand: "Purina" }),
    makeProduct({ id: "p2", brand: "Purina", variant: "Salmon" }),
    makeProduct({ id: "p3", brand: "Meow Mix" }),
  ];

  it("returns only products matching the given brand", () => {
    const result = filterProducts(products, { brand: "Purina" });
    expect(result.map((p) => p.id)).to.deep.equal(["p1", "p2"]);
  });

  it("returns all products when no filters are given", () => {
    const result = filterProducts(products, {});
    expect(result).to.have.length(3);
  });

  it("returns an empty array when no product matches the brand", () => {
    const result = filterProducts(products, { brand: "Nonexistent Brand" });
    expect(result).to.deep.equal([]);
  });
});
