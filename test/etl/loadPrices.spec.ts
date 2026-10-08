import { expect } from "chai";
import { loadPrices } from "../../src/etl/loadPrices";
import { validatePrices } from "../../src/etl/validatePrices";
import { PriceObservation } from "../../src/models/PriceObservation";
import { makeProduct } from "../fixtures/products";

const HEADER = "productId,retailer,price,packageSizeG,asOf,url";
const TODAY = "2026-10-05";

function obs(overrides: Partial<PriceObservation> = {}): PriceObservation {
  return {
    productId: "p1",
    retailer: "Chewy",
    price: 18.99,
    packageSizeG: 160,
    asOf: "2026-09-20",
    url: "https://www.chewy.com/example",
    ...overrides,
  };
}

describe("loadPrices", () => {
  it("parses rows into typed observations", () => {
    const csv = [HEADER, "p1,Chewy,18.99,160,2026-09-20,https://www.chewy.com/example"].join("\n");
    expect(loadPrices(csv)).to.deep.equal([obs()]);
  });

  it("returns an empty list for a header-only file", () => {
    expect(loadPrices(HEADER + "\n")).to.deep.equal([]);
  });

  it("keeps non-numeric values as NaN so the validator can report them", () => {
    const csv = [HEADER, "p1,Chewy,abc,160,2026-09-20,https://www.chewy.com/example"].join("\n");
    expect(Number.isNaN(loadPrices(csv)[0].price)).to.equal(true);
  });
});

describe("validatePrices", () => {
  const products = [makeProduct({ id: "p1" })];

  function run(observations: PriceObservation[]) {
    return validatePrices(observations, products, { today: TODAY });
  }

  it("reports nothing for a valid, recent observation", () => {
    expect(run([obs()])).to.deep.equal([]);
  });

  it("errors on an unknown productId", () => {
    const issues = run([obs({ productId: "nope" })]);
    expect(issues).to.have.length(1);
    expect(issues[0]).to.include({ severity: "error", field: "productId" });
  });

  it("errors on an empty retailer", () => {
    expect(run([obs({ retailer: "" })])[0]).to.include({ severity: "error", field: "retailer" });
  });

  it("errors when price or packageSizeG is not a positive number", () => {
    expect(run([obs({ price: 0 })])[0]).to.include({ severity: "error", field: "price" });
    expect(run([obs({ price: NaN })])[0]).to.include({ severity: "error", field: "price" });
    expect(run([obs({ packageSizeG: -1 })])[0]).to.include({ severity: "error", field: "packageSizeG" });
  });

  it("errors when asOf is not a real date or is in the future", () => {
    expect(run([obs({ asOf: "yesterday" })])[0]).to.include({ severity: "error", field: "asOf" });
    expect(run([obs({ asOf: "2026-10-06" })])[0]).to.include({ severity: "error", field: "asOf" });
  });

  it("errors when the listing url is not http(s)", () => {
    expect(run([obs({ url: "chewy.com/x" })])[0]).to.include({ severity: "error", field: "url" });
  });

  it("errors on two observations for the same product, retailer and date", () => {
    const issues = run([obs(), obs({ price: 19.5 })]);
    expect(issues.some((i) => i.severity === "error" && /duplicate/i.test(i.message))).to.equal(true);
  });

  it("warns, without failing, when an observation is older than 90 days", () => {
    const issues = run([obs({ asOf: "2026-06-01" })]);
    expect(issues).to.have.length(1);
    expect(issues[0]).to.include({ severity: "warning", field: "asOf" });
  });
});
