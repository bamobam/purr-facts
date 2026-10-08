import { expect } from "chai";
import { bestIndexes, cohortLabel, describeBenchmark, displayName, flagText, ALL_STAGES_NOTE, formatMoney, formatNumber, formatNutrient, sortProducts, stageLabel } from "../../web/src/lib/format";
import { makeProduct } from "../fixtures/products";

describe("formatNutrient", () => {
  it("prefixes the basis so a guaranteed minimum is never shown as a measured value", () => {
    expect(formatNutrient(9, "guaranteed-min")).to.equal("≥ 9%");
    expect(formatNutrient(78, "guaranteed-max")).to.equal("≤ 78%");
    expect(formatNutrient(9.5, "typical")).to.equal("9.5%");
  });
  it("shows a dash when there is no value", () => {
    expect(formatNutrient(undefined, "guaranteed-min")).to.equal("—");
  });
  it("drops trailing zeros but keeps one decimal when needed", () => {
    expect(formatNutrient(10, "typical")).to.equal("10%");
    expect(formatNutrient(10.04, "typical")).to.equal("10%");
    expect(formatNutrient(10.46, "typical")).to.equal("10.5%");
  });
});

describe("formatNumber and formatMoney", () => {
  it("formats numbers to the given digits and handles a missing value", () => {
    expect(formatNumber(85.424, 1)).to.equal("85.4");
    expect(formatNumber(undefined)).to.equal("—");
  });
  it("formats Canadian dollars", () => {
    expect(formatMoney(12.5)).to.equal("$12.50");
    expect(formatMoney(undefined)).to.equal("—");
  });
});

describe("describeBenchmark", () => {
  const cohort = "adult-maintenance wet foods";
  it("states the position in words without calling it good or bad", () => {
    const text = describeBenchmark("Protein per 1000 kcal", { suppressed: false, value: 80, percentile: 80, cohortSize: 10 }, cohort);
    expect(text).to.equal("Protein per 1000 kcal is higher than 80% of the 10 other adult-maintenance wet foods.");
  });
  it("handles the extremes", () => {
    expect(describeBenchmark("Fat", { suppressed: false, value: 1, percentile: 100, cohortSize: 9 }, cohort)).to.include("higher than all 9 other");
    expect(describeBenchmark("Fat", { suppressed: false, value: 1, percentile: 0, cohortSize: 9 }, cohort)).to.include("not higher than any of the 9 other");
  });
  it("explains why a comparison is hidden", () => {
    expect(describeBenchmark("Fat", { suppressed: true, reason: "not enough peers", cohortSize: 3 }, cohort)).to.match(/only 3 other adult-maintenance wet foods.*8/i);
    expect(describeBenchmark("Fat", { suppressed: true, reason: "no value for this product", cohortSize: 0 }, cohort)).to.match(/no value/i);
  });
});

describe("stageLabel", () => {
  it("uses plain words", () => {
    expect(stageLabel("adult-maintenance")).to.equal("adult maintenance");
    expect(stageLabel("all-life-stages")).to.equal("all life stages");
    expect(stageLabel("not-stated")).to.equal("stage not stated");
  });
});

describe("bestIndexes", () => {
  it("finds the best value, with all ties", () => {
    expect(bestIndexes([5, 9, 9], "higher")).to.deep.equal([1, 2]);
    expect(bestIndexes([5, 9, 3], "lower")).to.deep.equal([2]);
  });
  it("ignores missing values and says nothing when fewer than two foods have one", () => {
    expect(bestIndexes([undefined, 4, 2], "lower")).to.deep.equal([2]);
    expect(bestIndexes([undefined, 4, undefined], "lower")).to.deep.equal([]);
  });
  it("says nothing when every value is the same", () => {
    expect(bestIndexes([3, 3], "higher")).to.deep.equal([]);
  });
});

describe("sortProducts", () => {
  const a = makeProduct({ id: "a", derived: { proteinGPer1000kcal: 50, priceObservationCount: 0, completeness: 1 } });
  const b = makeProduct({ id: "b", derived: { proteinGPer1000kcal: 70, priceObservationCount: 0, completeness: 1 } });
  const c = makeProduct({ id: "c", derived: { priceObservationCount: 0, completeness: 1 } });
  it("sorts by a derived value either way and keeps foods with no value last", () => {
    expect(sortProducts([a, c, b], "proteinGPer1000kcal", "desc").map((p) => p.id)).to.deep.equal(["b", "a", "c"]);
    expect(sortProducts([a, c, b], "proteinGPer1000kcal", "asc").map((p) => p.id)).to.deep.equal(["a", "b", "c"]);
  });
  it("sorts by an as-fed label value too", () => {
    const x = makeProduct({ id: "x", proteinPct: 9 });
    const y = makeProduct({ id: "y", proteinPct: 12 });
    const z = makeProduct({ id: "z" });
    expect(sortProducts([x, z, y], "proteinPct", "desc").map((p) => p.id)).to.deep.equal(["y", "x", "z"]);
  });
  it("sorts by brand then name as text", () => {
    const x = makeProduct({ id: "x", brand: "Zed", productName: "A" });
    const y = makeProduct({ id: "y", brand: "Abe", productName: "B" });
    expect(sortProducts([x, y], "name", "asc").map((p) => p.id)).to.deep.equal(["y", "x"]);
  });
  it("does not modify its input", () => {
    const input = [a, b];
    sortProducts(input, "proteinGPer1000kcal", "desc");
    expect(input.map((p) => p.id)).to.deep.equal(["a", "b"]);
  });
});

describe("cohortLabel", () => {
  it("names the peer group, and widens it when the toggle is on", () => {
    const p = makeProduct({ foodType: "wet", adequacyStage: "adult-maintenance" });
    expect(cohortLabel(p, false)).to.equal("adult maintenance wet foods");
    expect(cohortLabel(p, true)).to.equal("adult maintenance or all life stages wet foods");
  });
  it("never widens a food with no stated stage", () => {
    expect(cohortLabel(makeProduct({ adequacyStage: "not-stated", foodType: "dry" }), true)).to.equal("dry foods with no stated life stage");
  });
});

describe("displayName", () => {
  it("does not repeat the brand when the product name already starts with it", () => {
    expect(displayName({ brand: "Meow Mix", productName: "Meow Mix Original Choice" })).to.equal("Meow Mix Original Choice");
    expect(displayName({ brand: "Fromm", productName: "Four-Star Nutritionals Chicken Pate" })).to.equal("Fromm Four-Star Nutritionals Chicken Pate");
  });
  it("collapses a partial overlap between the end of the brand and the start of the name", () => {
    expect(displayName({ brand: "Hill's Science Diet", productName: "Science Diet Adult Multiple Benefit" })).to.equal("Hill's Science Diet Adult Multiple Benefit");
  });
});

describe("flagText", () => {
  const d = (over: Record<string, number>) => ({ priceObservationCount: 0, completeness: 1, ...over });
  it("says none found when nothing names the food or its brand", () => {
    expect(flagText(d({}))).to.equal("None found");
    expect(flagText(undefined)).to.equal("None found");
  });
  it("counts recalls that name the food, with the right plural", () => {
    expect(flagText(d({ incidentCount: 1 }))).to.equal("Named in 1 recall");
    expect(flagText(d({ incidentCount: 2 }))).to.equal("Named in 2 recalls");
  });
  it("never reads a regulator investigation as a recall", () => {
    expect(flagText(d({ reportCount: 1 }))).to.equal("Named in 1 investigation, not a recall");
    expect(flagText(d({ reportCount: 2 }))).to.equal("Named in 2 investigations, not recalls");
    expect(flagText(d({ brandReportCount: 1 }))).to.equal("Brand named in 1 investigation, not a recall");
  });
  it("shows brand-level notices only when none names the food", () => {
    expect(flagText(d({ brandIncidentCount: 2 }))).to.equal("Brand has 2 other notices");
    expect(flagText(d({ incidentCount: 1, brandIncidentCount: 3 }))).to.equal("Named in 1 recall");
  });
});

describe("ALL_STAGES_NOTE", () => {
  it("tells people why all-life-stages foods are kept apart", () => {
    expect(ALL_STAGES_NOTE).to.match(/all life stages/i).and.match(/calorie-dense/i);
  });
});
