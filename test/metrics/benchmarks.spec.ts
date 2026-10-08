import { expect } from "chai";
import { computeBenchmarks, benchmarkMetric, MIN_COHORT_SIZE } from "../../src/metrics/benchmarks";
import { DerivedMetrics } from "../../src/models/DerivedMetrics";
import { Product } from "../../src/models/Product";
import { makeProduct } from "../fixtures/products";

function derived(overrides: Partial<DerivedMetrics> = {}): DerivedMetrics {
  return { priceObservationCount: 0, completeness: 1, ...overrides };
}

/** n adult-maintenance wet foods whose proteinGPer1000kcal is 1..n (id w1..wn). */
function wetCohort(n: number, stage: Product["adequacyStage"] = "adult-maintenance"): Product[] {
  return Array.from({ length: n }, (_, i) =>
    makeProduct({ id: `w${i + 1}`, foodType: "wet", adequacyStage: stage, derived: derived({ proteinGPer1000kcal: i + 1 }) })
  );
}

describe("benchmarkMetric", () => {
  it("uses a minimum cohort of 8 other products", () => {
    expect(MIN_COHORT_SIZE).to.equal(8);
  });

  it("reports the share of other peers with a strictly lower value", () => {
    const products = wetCohort(10); // values 1..10
    const result = benchmarkMetric(products, products[4], "proteinGPer1000kcal"); // value 5: 4 of the 9 others are lower
    expect(result).to.deep.include({ suppressed: false, cohortSize: 9, value: 5 });
    expect((result as any).percentile).to.be.closeTo((4 / 9) * 100, 1e-9);
  });

  it("gives 100 to the top product and 0 to the bottom one", () => {
    const products = wetCohort(10);
    expect((benchmarkMetric(products, products[9], "proteinGPer1000kcal") as any).percentile).to.equal(100);
    expect((benchmarkMetric(products, products[0], "proteinGPer1000kcal") as any).percentile).to.equal(0);
  });

  it("counts ties as not lower", () => {
    const products = wetCohort(10).map((p) => ({ ...p, derived: derived({ proteinGPer1000kcal: 7 }) }));
    expect((benchmarkMetric(products, products[0], "proteinGPer1000kcal") as any).percentile).to.equal(0);
  });

  it("is suppressed when fewer than 8 other products in the cohort have the metric", () => {
    const products = wetCohort(8); // 7 others
    expect(benchmarkMetric(products, products[0], "proteinGPer1000kcal")).to.deep.equal({
      suppressed: true,
      reason: "not enough peers",
      cohortSize: 7,
    });
  });

  it("does not count peers that lack the metric", () => {
    const products = [...wetCohort(9), makeProduct({ id: "blank", foodType: "wet", derived: derived() })]; // 9 with the metric, 1 without
    const result = benchmarkMetric(products, products[0], "proteinGPer1000kcal");
    expect(result).to.deep.include({ suppressed: false, cohortSize: 8 });
  });

  it("is suppressed, with a reason, when the product itself lacks the metric", () => {
    const products = [...wetCohort(10), makeProduct({ id: "blank", foodType: "wet", derived: derived() })];
    expect(benchmarkMetric(products, products[10], "proteinGPer1000kcal")).to.deep.equal({
      suppressed: true,
      reason: "no value for this product",
      cohortSize: 0,
    });
  });

  it("does not compare wet with dry foods", () => {
    const dry = Array.from({ length: 10 }, (_, i) => makeProduct({ id: `d${i}`, foodType: "dry", derived: derived({ proteinGPer1000kcal: 100 + i }) }));
    const products = [...wetCohort(10), ...dry];
    expect((benchmarkMetric(products, products[0], "proteinGPer1000kcal") as any).cohortSize).to.equal(9);
  });

  it("keeps all-life-stages foods out of an adult-maintenance cohort by default, and lets the toggle bring them in", () => {
    const adult = wetCohort(5);
    const all = wetCohort(5, "all-life-stages").map((p, i) => ({ ...p, id: `all${i}` }));
    const products = [...adult, ...all];
    expect((benchmarkMetric(products, adult[0], "proteinGPer1000kcal") as any).suppressed).to.equal(true); // 4 others
    const withToggle = benchmarkMetric(products, adult[0], "proteinGPer1000kcal", { includeAllStages: true }) as any;
    expect(withToggle.suppressed).to.equal(false);
    expect(withToggle.cohortSize).to.equal(9);
  });

  it("is suppressed for an all-life-stages food in a small default cohort", () => {
    const products = [...wetCohort(10), makeProduct({ id: "lone", foodType: "wet", adequacyStage: "all-life-stages", derived: derived({ proteinGPer1000kcal: 50 }) })];
    expect((benchmarkMetric(products, products[10], "proteinGPer1000kcal") as any).suppressed).to.equal(true);
  });
});

describe("computeBenchmarks", () => {
  it("returns a result for every benchmarked metric", () => {
    const products = wetCohort(10);
    const result = computeBenchmarks(products, products[0]);
    expect(Object.keys(result)).to.have.members(["proteinGPer1000kcal", "fatGPer1000kcal", "dmProtein", "pricePerKg", "pricePer1000kcal"]);
    expect(result.proteinGPer1000kcal.suppressed).to.equal(false);
    expect(result.fatGPer1000kcal.suppressed).to.equal(true);
  });
});
