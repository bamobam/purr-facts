import { expect } from "chai";
import { loadCuratedProducts } from "../../src/etl/loadCuratedProducts";

const HEADER =
  "id,brand,parentCompany,productName,variant,foodType,adequacyStandard,adequacyStage,proteinPct,proteinBasis,fatPct,fatBasis,fiberPct,fiberBasis,moisturePct,moistureBasis,kcalPerKg,packageSizeG,packageUnits,sourceUrl,lastVerified,reformulatedOn,reformulationSourceUrl";

describe("loadCuratedProducts", () => {
  const csv = [
    HEADER,
    "curated-1,Fancy Feast,Purina,Fancy Feast Chicken,Chicken,wet,aafco,adult-maintenance,10.0,guaranteed-min,5.0,guaranteed-min,1.5,guaranteed-max,78.0,guaranteed-max,1080,1020,12,https://example.com/product-1,2026-10-05,2025-06-01,https://example.com/reformulation",
    'curated-2,"Brand, With Comma",Parent Co,Some Product,"Flavor, Blend",dry,fediaf,all-life-stages,35,guaranteed-min,17,guaranteed-min,,,10,guaranteed-max,,,,https://example.com/product-2,2026-10-05,,',
  ].join("\n");

  it("parses each row into a typed Product with numeric fields as numbers", () => {
    const products = loadCuratedProducts(csv);
    expect(products).to.have.length(2);
    expect(products[0]).to.deep.equal({
      id: "curated-1",
      brand: "Fancy Feast",
      parentCompany: "Purina",
      productName: "Fancy Feast Chicken",
      variant: "Chicken",
      foodType: "wet",
      adequacyStandard: "aafco",
      adequacyStage: "adult-maintenance",
      proteinPct: 10,
      proteinBasis: "guaranteed-min",
      fatPct: 5,
      fatBasis: "guaranteed-min",
      fiberPct: 1.5,
      fiberBasis: "guaranteed-max",
      moisturePct: 78,
      moistureBasis: "guaranteed-max",
      kcalPerKg: 1080,
      packageSizeG: 1020,
      packageUnits: 12,
      sourceUrl: "https://example.com/product-1",
      lastVerified: "2026-10-05",
      reformulatedOn: "2025-06-01",
      reformulationSourceUrl: "https://example.com/reformulation",
    });
  });

  it("omits optional fields that are blank in the CSV instead of setting them to 0 or empty string", () => {
    const second = loadCuratedProducts(csv)[1];
    expect(second).to.not.have.any.keys("fiberPct", "fiberBasis", "kcalPerKg", "packageSizeG", "packageUnits", "reformulatedOn", "reformulationSourceUrl");
    expect(second.proteinPct).to.equal(35);
  });

  it("correctly handles quoted fields containing commas", () => {
    const products = loadCuratedProducts(csv);
    expect(products[1].brand).to.equal("Brand, With Comma");
    expect(products[1].variant).to.equal("Flavor, Blend");
  });

  it("keeps a non-numeric value as NaN so the validator can report it, instead of silently dropping it", () => {
    const bad = [HEADER, "curated-3,B,P,N,V,dry,aafco,all-life-stages,abc,guaranteed-min,,,,,,,,,,https://example.com,2026-10-05,,"].join("\n");
    expect(Number.isNaN(loadCuratedProducts(bad)[0].proteinPct)).to.equal(true);
  });
});
