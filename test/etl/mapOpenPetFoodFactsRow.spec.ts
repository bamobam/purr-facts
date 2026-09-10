import { expect } from "chai";
import { mapOpenPetFoodFactsRow, OpffRawRow } from "../../src/etl/mapOpenPetFoodFactsRow";

function makeRow(overrides: Partial<OpffRawRow>): OpffRawRow {
  return {
    code: "0001234567890",
    product_name: "Friskies Indoor Delights Dry Cat Food",
    brands: "Friskies",
    categories_en: "Pet food, Cat food, Dry cat food",
    countries_en: "United States",
    "proteins_100g": "32",
    "fat_100g": "14",
    "fiber_100g": "3",
    "energy-kcal_100g": "370",
    ...overrides,
  };
}

describe("mapOpenPetFoodFactsRow", () => {
  it("maps a well-formed US cat dry-food row to a Product", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({}));
    expect(product).to.not.be.undefined;
    expect(product?.brand).to.equal("Friskies");
    expect(product?.productName).to.equal("Friskies Indoor Delights Dry Cat Food");
    expect(product?.foodType).to.equal("dry");
    expect(product?.proteinPct).to.equal(32);
    expect(product?.fatPct).to.equal(14);
    expect(product?.fiberPct).to.equal(3);
    expect(product?.calorieDensity).to.equal(3700); // 370 kcal/100g -> 3700 kcal/kg
    expect(product?.dataSource).to.equal("open-data");
    expect(product?.sourceUrl).to.include("0001234567890");
  });

  it("excludes a row not tagged for the United States", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ countries_en: "France, Germany" }));
    expect(product).to.be.undefined;
  });

  it("excludes a row not tagged as cat food", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ categories_en: "Pet food, Dog food, Dry dog food" }));
    expect(product).to.be.undefined;
  });

  it("excludes a dog-specific product whose only 'cat' mention is a combined parent category", () => {
    // Real Open Pet Food Facts data: a dog treat tagged "Dog and cat food,Dog food,Dry dog food,Dog biscuit" —
    // every specific tag says dog-only; only the generic combined parent tag mentions cat at all.
    const product = mapOpenPetFoodFactsRow(
      makeRow({ categories_en: "Dog and cat food,Dog food,Dry-food,Dry dog food,Dog biscuit" })
    );
    expect(product).to.be.undefined;
  });

  it("excludes a row whose food type can't be confidently determined", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ categories_en: "Pet food, Cat food" }));
    expect(product).to.be.undefined;
  });

  it("excludes a row missing a product name or brand", () => {
    expect(mapOpenPetFoodFactsRow(makeRow({ product_name: "" }))).to.be.undefined;
    expect(mapOpenPetFoodFactsRow(makeRow({ brands: "" }))).to.be.undefined;
  });

  it("maps wet/canned categories to foodType 'wet'", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ categories_en: "Pet food, Cat food, Canned cat food" }));
    expect(product?.foodType).to.equal("wet");
  });

  it("maps treats categories to foodType 'treat'", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ categories_en: "Pet food, Cat food, Cat treats" }));
    expect(product?.foodType).to.equal("treat");
  });

  it("infers kitten life stage from categories", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ categories_en: "Pet food, Cat food, Dry cat food, Kitten food" }));
    expect(product?.lifeStage).to.equal("kitten");
  });

  it("infers senior life stage from categories", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ categories_en: "Pet food, Cat food, Dry cat food, Senior cat food" }));
    expect(product?.lifeStage).to.equal("senior");
  });

  it("defaults life stage to 'all' when no stage is indicated", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({}));
    expect(product?.lifeStage).to.equal("all");
  });

  it("takes the first brand from a multi-brand list", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ brands: "Friskies, Purina" }));
    expect(product?.brand).to.equal("Friskies");
  });

  it("leaves numeric nutrition fields undefined rather than zero when the source value is missing", () => {
    const product = mapOpenPetFoodFactsRow(makeRow({ "proteins_100g": "", "fat_100g": "", "fiber_100g": "", "energy-kcal_100g": "" }));
    expect(product?.proteinPct).to.be.undefined;
    expect(product?.fatPct).to.be.undefined;
    expect(product?.fiberPct).to.be.undefined;
    expect(product?.calorieDensity).to.be.undefined;
  });
});
