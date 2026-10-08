import { expect } from "chai";
import { deriveProductMetrics, median } from "../../src/metrics/deriveMetrics";
import { PriceObservation } from "../../src/models/PriceObservation";
import { makeProduct } from "../fixtures/products";

const TODAY = "2026-10-07";

function obs(overrides: Partial<PriceObservation> = {}): PriceObservation {
  return { productId: "p1", retailer: "Amazon.ca", price: 48.42, packageSizeG: 2040, asOf: "2026-10-06", url: "https://example.com/x", ...overrides };
}

// Dry: 32 / 15 / 3 / 10, 3746 kcal/kg.   Wet: 10 / 5 / 1.5 / 78, 1080 kcal/kg.
const dry = makeProduct({ id: "p1", foodType: "dry", proteinPct: 32, fatPct: 15, fiberPct: 3, moisturePct: 10, kcalPerKg: 3746 });
const wet = makeProduct({ id: "p1", foodType: "wet", proteinPct: 10, fatPct: 5, fiberPct: 1.5, moisturePct: 78, kcalPerKg: 1080 });

describe("median", () => {
  it("returns the middle value of an odd list and the mean of the middle two of an even list", () => {
    expect(median([30, 10, 20])).to.equal(20);
    expect(median([10, 30])).to.equal(20);
    expect(median([5])).to.equal(5);
  });

  it("returns undefined for an empty list", () => {
    expect(median([])).to.equal(undefined);
  });
});

describe("deriveProductMetrics: nutrition", () => {
  it("converts a dry food to dry matter", () => {
    const d = deriveProductMetrics(dry, [], { today: TODAY });
    expect(d.dmProtein).to.be.closeTo(35.5556, 0.001); // 32 / 90
    expect(d.dmFat).to.be.closeTo(16.6667, 0.001); // 15 / 90
  });

  it("converts a wet food to dry matter, where the correction is large", () => {
    const d = deriveProductMetrics(wet, [], { today: TODAY });
    expect(d.dmProtein).to.be.closeTo(45.4545, 0.001); // 10 / 22
    expect(d.dmFat).to.be.closeTo(22.7273, 0.001);
  });

  it("computes grams per 1000 kcal", () => {
    const d = deriveProductMetrics(dry, [], { today: TODAY });
    expect(d.proteinGPer1000kcal).to.be.closeTo(85.4244, 0.001); // 32 * 10000 / 3746
    expect(d.fatGPer1000kcal).to.be.closeTo(40.0427, 0.001);
  });

  it("computes the share of calories from protein and fat (3.5 and 8.5 kcal per gram)", () => {
    const d = deriveProductMetrics(wet, [], { today: TODAY });
    expect(d.proteinGPer1000kcal).to.be.closeTo(92.5926, 0.001);
    expect(d.proteinKcalPct).to.be.closeTo(32.4074, 0.001);
    expect(d.fatKcalPct).to.be.closeTo(39.3519, 0.001);
  });

  it("shows why as-fed misleads: the wet and dry foods above are close per 1000 kcal but far apart as-fed", () => {
    const w = deriveProductMetrics(wet, [], { today: TODAY });
    const d = deriveProductMetrics(dry, [], { today: TODAY });
    expect(Math.abs(w.proteinGPer1000kcal! - d.proteinGPer1000kcal!)).to.be.lessThan(10);
    expect(32 - 10).to.be.greaterThan(20);
  });

  it("leaves per-kcal metrics undefined when kcalPerKg is missing", () => {
    const d = deriveProductMetrics(makeProduct({ ...dry, kcalPerKg: undefined }), [obs()], { today: TODAY });
    expect(d.proteinGPer1000kcal).to.equal(undefined);
    expect(d.fatKcalPct).to.equal(undefined);
    expect(d.pricePer1000kcal).to.equal(undefined);
    expect(d.dmProtein).to.not.equal(undefined);
  });

  it("leaves dry-matter metrics undefined when moisture is missing or 100%", () => {
    expect(deriveProductMetrics(makeProduct({ ...dry, moisturePct: undefined }), [], { today: TODAY }).dmProtein).to.equal(undefined);
    expect(deriveProductMetrics(makeProduct({ ...dry, moisturePct: 100 }), [], { today: TODAY }).dmProtein).to.equal(undefined);
  });
});

describe("deriveProductMetrics: price", () => {
  it("computes price per kg, per lb and per 1000 kcal from one observation", () => {
    const d = deriveProductMetrics(wet, [obs()], { today: TODAY });
    expect(d.pricePerKg).to.be.closeTo(23.7353, 0.001); // 48.42 / 2.04 kg
    expect(d.pricePerLb).to.be.closeTo(10.7664, 0.001); // per kg * 0.45359237
    expect(d.pricePer1000kcal).to.be.closeTo(21.9771, 0.001); // 48.42 / (1080 * 2.04) * 1000
    expect(d.priceObservationCount).to.equal(1);
    expect(d.priceRangePerKg).to.deep.equal([d.pricePerKg, d.pricePerKg]);
  });

  it("uses the median across observations and reports the range", () => {
    const observations = [
      obs({ retailer: "A", price: 20, packageSizeG: 1000 }), // 20 / kg
      obs({ retailer: "B", price: 30, packageSizeG: 1000 }), // 30 / kg
      obs({ retailer: "C", price: 100, packageSizeG: 1000 }), // 100 / kg (an outlier)
    ];
    const d = deriveProductMetrics(wet, observations, { today: TODAY });
    expect(d.pricePerKg).to.equal(30);
    expect(d.priceRangePerKg).to.deep.equal([20, 100]);
    expect(d.priceObservationCount).to.equal(3);
  });

  it("ignores observations older than 90 days", () => {
    const observations = [obs({ asOf: "2026-01-01", price: 5, packageSizeG: 1000 }), obs({ retailer: "B", price: 30, packageSizeG: 1000 })];
    const d = deriveProductMetrics(wet, observations, { today: TODAY });
    expect(d.pricePerKg).to.equal(30);
    expect(d.priceObservationCount).to.equal(1);
  });

  it("leaves price metrics undefined, with a count of 0, when there are no recent observations", () => {
    const d = deriveProductMetrics(wet, [obs({ asOf: "2026-01-01" })], { today: TODAY });
    expect(d.pricePerKg).to.equal(undefined);
    expect(d.priceRangePerKg).to.equal(undefined);
    expect(d.priceObservationCount).to.equal(0);
  });

  it("only uses observations for this product", () => {
    const d = deriveProductMetrics(wet, [obs({ productId: "other", price: 1, packageSizeG: 1000 })], { today: TODAY });
    expect(d.priceObservationCount).to.equal(0);
  });
});

describe("deriveProductMetrics: completeness", () => {
  it("is 1 when protein, fat, fiber, moisture, kcal and a recent price are all present", () => {
    expect(deriveProductMetrics(wet, [obs()], { today: TODAY }).completeness).to.equal(1);
  });

  it("drops by one sixth for each missing field", () => {
    const d = deriveProductMetrics(makeProduct({ ...wet, fiberPct: undefined }), [], { today: TODAY });
    expect(d.completeness).to.be.closeTo(4 / 6, 1e-9); // no fiber, no price
  });
});
