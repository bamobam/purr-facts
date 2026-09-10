import { expect } from "chai";
import { loadCuratedProducts } from "../../src/etl/loadCuratedProducts";

describe("loadCuratedProducts", () => {
  const csv = [
    "id,brand,productName,variant,foodType,lifeStage,proteinPct,fatPct,fiberPct,moisturePct,calorieDensity,price,sourceUrl,dataSource",
    'curated-1,Purina,Fancy Feast Chicken,Chicken,wet,adult,10.0,5.0,1.5,78.0,1080,0.33,https://example.com/product-1,curated',
    'curated-2,"Brand, With Comma",Some Product,"Flavor, Blend",dry,kitten,35,17,3,10,3900,0.20,https://example.com/product-2,curated',
  ].join("\n");

  it("parses each row into a typed Product with numeric fields as numbers", () => {
    const products = loadCuratedProducts(csv);
    expect(products).to.have.length(2);
    expect(products[0]).to.deep.equal({
      id: "curated-1",
      brand: "Purina",
      productName: "Fancy Feast Chicken",
      variant: "Chicken",
      foodType: "wet",
      lifeStage: "adult",
      proteinPct: 10.0,
      fatPct: 5.0,
      fiberPct: 1.5,
      moisturePct: 78.0,
      calorieDensity: 1080,
      price: 0.33,
      sourceUrl: "https://example.com/product-1",
      dataSource: "curated",
    });
  });

  it("correctly handles quoted fields containing commas", () => {
    const products = loadCuratedProducts(csv);
    expect(products[1].brand).to.equal("Brand, With Comma");
    expect(products[1].variant).to.equal("Flavor, Blend");
  });
});
