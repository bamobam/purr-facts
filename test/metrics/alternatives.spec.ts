import { expect } from "chai";
import { findAlternatives } from "../../src/metrics/alternatives";
import { Product } from "../../src/models/Product";
import { makeProduct } from "../fixtures/products";

function food(id: string, protein: number | undefined, price: number | undefined, overrides: Partial<Product> = {}): Product {
  const derived: NonNullable<Product["derived"]> = { priceObservationCount: 0, completeness: 1 };
  if (protein !== undefined) {
    derived.proteinGPer1000kcal = protein;
  }
  if (price !== undefined) {
    derived.pricePer1000kcal = price;
  }
  return makeProduct({ id, foodType: "wet", adequacyStage: "adult-maintenance", derived, ...overrides });
}

describe("findAlternatives", () => {
  const current = food("me", 60, 5);
  const catalog = [
    current,
    food("a", 70, 4),
    food("b", 80, 6),
    food("c", 50, 3),
    food("same", 60, 5),
    food("dry", 90, 1, { foodType: "dry" }),
    food("als", 95, 2, { adequacyStage: "all-life-stages" }),
    food("unstated", 99, 1, { adequacyStage: "not-stated" }),
    food("nodata", undefined, undefined),
  ];

  it("returns peers with more protein per 1000 kcal, best first, with the delta against the current food", () => {
    const r = findAlternatives(catalog, current, "protein");
    expect(r.alternatives.map((a) => a.product.id)).to.deep.equal(["b", "a"]);
    expect(r.alternatives[0]).to.include({ value: 80, delta: 20 });
    expect(r.alternatives[0].deltaPct).to.be.closeTo(33.33, 0.01);
    expect(r.currentValue).to.equal(60);
    expect(r.metric).to.equal("proteinGPer1000kcal");
  });

  it("returns peers that cost less per 1000 kcal, cheapest first, with a negative delta", () => {
    const r = findAlternatives(catalog, current, "price");
    expect(r.alternatives.map((a) => a.product.id)).to.deep.equal(["c", "a"]);
    expect(r.alternatives[0]).to.include({ value: 3, delta: -2 });
    expect(r.alternatives[0].deltaPct).to.be.closeTo(-40, 0.01);
  });

  it("never returns the food itself, an equal food, a different food type, or a food with no value", () => {
    const ids = findAlternatives(catalog, current, "protein").alternatives.map((a) => a.product.id);
    for (const excluded of ["me", "same", "dry", "nodata", "unstated"]) {
      expect(ids).to.not.include(excluded);
    }
  });

  it("leaves out all-life-stages foods unless asked, then includes them", () => {
    expect(findAlternatives(catalog, current, "protein").alternatives.map((a) => a.product.id)).to.not.include("als");
    const r = findAlternatives(catalog, current, "protein", { includeAllStages: true });
    expect(r.alternatives.map((a) => a.product.id)).to.deep.equal(["als", "b", "a"]);
  });

  it("only compares a food with no stated stage to other unstated foods, even with the toggle", () => {
    const lone = food("lone", 10, 9, { adequacyStage: "not-stated" });
    const r = findAlternatives([...catalog, lone], lone, "protein", { includeAllStages: true });
    expect(r.alternatives.map((a) => a.product.id)).to.deep.equal(["unstated"]);
  });

  it("limits the list, keeping the best, and reports how many peers were considered", () => {
    const r = findAlternatives(catalog, current, "protein", { limit: 1 });
    expect(r.alternatives.map((a) => a.product.id)).to.deep.equal(["b"]);
    expect(r.peerCount).to.equal(4); // a, b, c and "same" have a protein value; the others are not peers or have none
  });

  it("breaks ties by id so the order is stable", () => {
    const r = findAlternatives([current, food("z", 70, 4), food("m", 70, 4)], current, "protein");
    expect(r.alternatives.map((a) => a.product.id)).to.deep.equal(["m", "z"]);
  });

  it("returns an empty list with a reason when the current food has no value for the goal", () => {
    const r = findAlternatives(catalog, food("x", undefined, undefined), "price");
    expect(r.alternatives).to.deep.equal([]);
    expect(r.reason).to.match(/no value/i);
    expect(r.currentValue).to.equal(undefined);
  });

  it("returns an empty list without a reason when nothing beats the current food", () => {
    const best = food("best", 200, 0.5);
    const r = findAlternatives([best, food("p", 100, 2), food("q", 90, 3)], best, "protein");
    expect(r.alternatives).to.deep.equal([]);
    expect(r.reason).to.equal(undefined);
    expect(r.peerCount).to.equal(2);
  });

  it("omits the percentage change when the current value is zero", () => {
    const zero = food("zero", 0, 0);
    const r = findAlternatives([zero, food("p", 5, 1)], zero, "protein");
    expect(r.alternatives[0].delta).to.equal(5);
    expect(r.alternatives[0]).to.not.have.property("deltaPct");
  });
});
