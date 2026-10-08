import { expect } from "chai";
import { validateProducts, ValidationIssue } from "../../src/etl/validateProducts";
import { Product } from "../../src/models/Product";
import { makeProduct } from "../fixtures/products";

const TODAY = "2026-10-05";

// A wet food whose stated kcal/kg sits close to the estimate: 10/5/78 estimates 966 kcal/kg.
function validWet(overrides: Partial<Product> = {}): Product {
  return makeProduct({
    id: "wet-1",
    productName: "Wet Product",
    foodType: "wet",
    proteinPct: 10,
    proteinBasis: "guaranteed-min",
    fatPct: 5,
    fatBasis: "guaranteed-min",
    fiberPct: 1.5,
    fiberBasis: "guaranteed-max",
    moisturePct: 78,
    moistureBasis: "guaranteed-max",
    kcalPerKg: 1080, // +11.8% over the estimate, a real label we know is correct
    ...overrides,
  });
}

// A dry food: 35/17/10 estimates 3780 kcal/kg.
function validDry(overrides: Partial<Product> = {}): Product {
  return makeProduct({
    id: "dry-1",
    productName: "Dry Product",
    foodType: "dry",
    adequacyStandard: "aafco",
    adequacyStage: "all-life-stages",
    proteinPct: 35,
    proteinBasis: "guaranteed-min",
    fatPct: 17,
    fatBasis: "guaranteed-min",
    fiberPct: 3,
    fiberBasis: "guaranteed-max",
    moisturePct: 10,
    moistureBasis: "guaranteed-max",
    kcalPerKg: 3948, // +4.5%
    ...overrides,
  });
}

function run(products: Product[]): ValidationIssue[] {
  return validateProducts(products, { today: TODAY });
}

function errorsFor(issues: ValidationIssue[], productId: string, field?: string) {
  return issues.filter((i) => i.severity === "error" && i.productId === productId && (field === undefined || i.field === field));
}

describe("validateProducts", () => {
  it("reports nothing for valid products", () => {
    expect(run([validWet(), validDry()])).to.deep.equal([]);
  });

  describe("required fields", () => {
    for (const field of ["brand", "parentCompany", "productName", "variant", "sourceUrl", "lastVerified"] as const) {
      it(`errors when ${field} is empty`, () => {
        const issues = run([validDry({ [field]: "" })]);
        expect(errorsFor(issues, "dry-1", field)).to.have.length(1);
      });
    }

    it("errors when sourceUrl is not an http(s) URL", () => {
      expect(errorsFor(run([validDry({ sourceUrl: "purina.com/x" })]), "dry-1", "sourceUrl")).to.have.length(1);
    });

    it("errors when lastVerified is not a real ISO date", () => {
      expect(errorsFor(run([validDry({ lastVerified: "10/05/2026" })]), "dry-1", "lastVerified")).to.have.length(1);
      expect(errorsFor(run([validDry({ lastVerified: "2026-02-30" })]), "dry-1", "lastVerified")).to.have.length(1);
    });

    it("errors when lastVerified is in the future", () => {
      expect(errorsFor(run([validDry({ lastVerified: "2026-10-06" })]), "dry-1", "lastVerified")).to.have.length(1);
    });

    it("accepts lastVerified equal to today", () => {
      expect(run([validDry({ lastVerified: TODAY })])).to.deep.equal([]);
    });
  });

  describe("enums", () => {
    it("errors on a foodType outside dry/wet (treats are out of scope for v1)", () => {
      const issues = run([validDry({ foodType: "treat" as never })]);
      expect(errorsFor(issues, "dry-1", "foodType")).to.have.length(1);
    });

    it("accepts a label with no adequacy statement (voluntary on Canadian labels)", () => {
      expect(run([validDry({ adequacyStandard: "none", adequacyStage: "not-stated" })])).to.deep.equal([]);
    });

    it("accepts the European FEDIAF standard", () => {
      expect(run([validDry({ adequacyStandard: "fediaf", adequacyStage: "adult-maintenance" })])).to.deep.equal([]);
    });

    it("errors on an adequacyStage outside adult-maintenance/all-life-stages/not-stated", () => {
      const issues = run([validDry({ adequacyStage: "kitten" as never })]);
      expect(errorsFor(issues, "dry-1", "adequacyStage")).to.have.length(1);
    });

    it("errors on an adequacyStandard outside aafco/fediaf/none", () => {
      const issues = run([validDry({ adequacyStandard: "nrc" as never })]);
      expect(errorsFor(issues, "dry-1", "adequacyStandard")).to.have.length(1);
    });

    it("errors when the standard is none but a stage is claimed", () => {
      const issues = run([validDry({ adequacyStandard: "none", adequacyStage: "all-life-stages" })]);
      expect(errorsFor(issues, "dry-1", "adequacyStage")).to.have.length(1);
    });

    it("errors when a standard is cited but the stage is not-stated", () => {
      const issues = run([validDry({ adequacyStandard: "aafco", adequacyStage: "not-stated" })]);
      expect(errorsFor(issues, "dry-1", "adequacyStage")).to.have.length(1);
    });
  });

  describe("nutrient basis", () => {
    it("errors when a nutrient has a value but no basis", () => {
      const issues = run([validDry({ proteinBasis: undefined })]);
      expect(errorsFor(issues, "dry-1", "proteinBasis")).to.have.length(1);
    });

    it("errors when a nutrient has a basis but no value", () => {
      const issues = run([validDry({ fiberPct: undefined })]);
      expect(errorsFor(issues, "dry-1", "fiberPct")).to.have.length(1);
    });

    it("errors on an unknown basis", () => {
      const issues = run([validDry({ fatBasis: "about" as never })]);
      expect(errorsFor(issues, "dry-1", "fatBasis")).to.have.length(1);
    });

    it("accepts guaranteed-min, guaranteed-max and typical", () => {
      const issues = run([validDry({ proteinBasis: "typical", fatBasis: "guaranteed-max", fiberBasis: "guaranteed-min" })]);
      expect(issues).to.deep.equal([]);
    });
  });

  describe("ranges", () => {
    it("errors on a non-numeric value (NaN)", () => {
      expect(errorsFor(run([validDry({ proteinPct: NaN })]), "dry-1", "proteinPct")).to.have.length(1);
    });

    it("errors when protein or fat is outside 0-100", () => {
      expect(errorsFor(run([validDry({ proteinPct: 101 })]), "dry-1", "proteinPct")).to.have.length(1);
      expect(errorsFor(run([validDry({ fatPct: -1 })]), "dry-1", "fatPct")).to.have.length(1);
    });

    it("errors when moisture is above 95", () => {
      expect(errorsFor(run([validWet({ moisturePct: 96 })]), "wet-1", "moisturePct")).to.have.length(1);
    });

    it("errors when protein + fat + fiber + moisture exceed 100", () => {
      const issues = run([validDry({ proteinPct: 50, fatPct: 30, fiberPct: 10, moisturePct: 12 })]);
      expect(issues.some((i) => i.severity === "error" && i.productId === "dry-1" && /exceed 100/.test(i.message))).to.equal(true);
    });

    it("errors when kcalPerKg is outside 500-6000", () => {
      expect(errorsFor(run([validDry({ kcalPerKg: 394.8 })]), "dry-1", "kcalPerKg")).to.have.length(1);
      expect(errorsFor(run([validDry({ kcalPerKg: 39480 })]), "dry-1", "kcalPerKg")).to.have.length(1);
    });

    it("errors when packageSizeG or packageUnits is not positive", () => {
      expect(errorsFor(run([validDry({ packageSizeG: 0 })]), "dry-1", "packageSizeG")).to.have.length(1);
      expect(errorsFor(run([validDry({ packageUnits: -2 })]), "dry-1", "packageUnits")).to.have.length(1);
    });
  });

  describe("uniqueness", () => {
    it("errors on duplicate ids", () => {
      const issues = run([validDry({ id: "same" }), validWet({ id: "same" })]);
      expect(issues.filter((i) => i.severity === "error" && /duplicate id/i.test(i.message))).to.have.length.at.least(1);
    });

    it("errors on the same brand + productName + packageSizeG under two ids", () => {
      const a = validDry({ id: "a", packageSizeG: 160 });
      const b = validDry({ id: "b", packageSizeG: 160 });
      const issues = run([a, b]);
      expect(issues.filter((i) => i.severity === "error" && /duplicate product/i.test(i.message))).to.have.length.at.least(1);
    });

    it("allows the same product in two package sizes", () => {
      const issues = run([validDry({ id: "a", packageSizeG: 160 }), validDry({ id: "b", packageSizeG: 48 })]);
      expect(issues).to.deep.equal([]);
    });
  });

  describe("kcal plausibility (warning, per food type)", () => {
    it("does not warn for a correct wet label 11.8% above the estimate", () => {
      expect(run([validWet()])).to.deep.equal([]);
    });

    it("does not warn for a wet label up to +40% above the estimate", () => {
      expect(run([validWet({ kcalPerKg: 1200 })])).to.deep.equal([]); // +24.2%
      expect(run([validWet({ kcalPerKg: 1330 })])).to.deep.equal([]); // +37.7%
    });

    it("warns for a wet label more than 40% above the estimate", () => {
      const issues = run([validWet({ kcalPerKg: 1400 })]); // +44.9%
      expect(issues).to.have.length(1);
      expect(issues[0]).to.include({ severity: "warning", productId: "wet-1", field: "kcalPerKg" });
    });

    it("warns for a wet label more than 10% below the estimate", () => {
      const issues = run([validWet({ kcalPerKg: 850 })]); // -12.0%
      expect(issues).to.have.length(1);
      expect(issues[0].severity).to.equal("warning");
    });

    it("warns for a dry label more than 10% away from the estimate", () => {
      expect(run([validDry({ kcalPerKg: 4300 })])).to.have.length(1); // +13.8%
      expect(run([validDry({ kcalPerKg: 3300 })])).to.have.length(1); // -12.7%
    });

    it("does not warn for a dry label within 10% of the estimate", () => {
      expect(run([validDry({ kcalPerKg: 3500 })])).to.deep.equal([]); // -7.4%
    });

    it("catches a per-can figure typed into the per-kg column", () => {
      // 3 oz can ~ 85 g: 1080 kcal/kg is about 92 kcal per can
      const issues = run([validWet({ kcalPerKg: 92 })]);
      expect(errorsFor(issues, "wet-1", "kcalPerKg")).to.have.length(1); // out of 500-6000 range
    });

    it("skips the check when protein, fat, moisture or kcal is missing", () => {
      expect(run([validDry({ kcalPerKg: undefined })])).to.deep.equal([]);
      expect(run([validDry({ fatPct: undefined, fatBasis: undefined })])).to.deep.equal([]);
    });
  });
});
