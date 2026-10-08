import { expect } from "chai";
import { estimateKcalPerKg } from "../../src/metrics/estimateKcalPerKg";

describe("estimateKcalPerKg", () => {
  it("estimates a dry food (35% protein, 17% fat, 10% moisture) at about 3780 kcal/kg", () => {
    // ash = 7% of dry matter = 6.3; carbs by difference = 31.7
    // kcal/100g = 3.5*35 + 8.5*17 + 3.5*31.7 = 377.95
    expect(estimateKcalPerKg({ proteinPct: 35, fatPct: 17, moisturePct: 10 })).to.be.closeTo(3779.5, 0.01);
  });

  it("estimates a wet food (10% protein, 5% fat, 78% moisture) at about 966 kcal/kg", () => {
    // ash = 1.54; carbs = 5.46; kcal/100g = 35 + 42.5 + 19.11
    expect(estimateKcalPerKg({ proteinPct: 10, fatPct: 5, moisturePct: 78 })).to.be.closeTo(966.1, 0.01);
  });

  it("never lets carbohydrate go negative when the inputs leave no room for it", () => {
    // protein + fat + moisture already exceeds 100 - ash, so carbs clamp to 0
    expect(estimateKcalPerKg({ proteinPct: 60, fatPct: 25, moisturePct: 10 })).to.be.closeTo(10 * (3.5 * 60 + 8.5 * 25), 0.01);
  });
});
