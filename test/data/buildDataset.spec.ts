import { expect } from "chai";
import { buildDataset } from "../../src/data/buildDataset";
import { Incident, IncidentCheck } from "../../src/models/Incident";
import { PriceObservation } from "../../src/models/PriceObservation";
import { makeProduct } from "../fixtures/products";

const TODAY = "2026-10-07";

function obs(productId: string, overrides: Partial<PriceObservation> = {}): PriceObservation {
  return { productId, retailer: "Amazon.ca", price: 30, packageSizeG: 1000, asOf: "2026-10-01", url: "https://example.com/x", ...overrides };
}

describe("buildDataset", () => {
  const products = [
    makeProduct({ id: "a", foodType: "dry", proteinPct: 32, fatPct: 15, fiberPct: 3, moisturePct: 10, kcalPerKg: 3746, lastVerified: "2026-09-01" }),
    makeProduct({ id: "b", foodType: "wet", proteinPct: 10, fatPct: 5, moisturePct: 78, kcalPerKg: 1080, lastVerified: "2026-10-05" }),
    makeProduct({ id: "c", foodType: "wet", lastVerified: "2026-10-06" }),
  ];
  const prices = [obs("a"), obs("a", { retailer: "PetSmart", asOf: "2026-09-20" }), obs("b", { asOf: "2026-01-01" })];

  it("attaches derived metrics to every product", () => {
    const { products: built } = buildDataset(products, prices, { today: TODAY });
    expect(built).to.have.length(3);
    expect(built[0].derived!.proteinGPer1000kcal).to.be.closeTo(85.4244, 0.001);
    expect(built[0].derived!.pricePerKg).to.equal(30);
    expect(built[0].derived!.priceObservationCount).to.equal(2);
  });

  it("does not modify the input products", () => {
    buildDataset(products, prices, { today: TODAY });
    expect(products[0].derived).to.equal(undefined);
  });

  it("records the build date and product count in the metadata", () => {
    const { meta } = buildDataset(products, prices, { today: TODAY });
    expect(meta.builtAt).to.equal(TODAY);
    expect(meta.productCount).to.equal(3);
  });

  it("computes price coverage as the share of products with at least one recent price", () => {
    const { meta } = buildDataset(products, prices, { today: TODAY });
    expect(meta.productsWithPrice).to.equal(1); // only "a"; b's price is stale, c has none
    expect(meta.priceCoverage).to.be.closeTo(1 / 3, 1e-9);
    expect(meta.priceObservationCount).to.equal(3);
  });

  it("reports the oldest verification and price dates so the UI can say how fresh the data is", () => {
    const { meta } = buildDataset(products, prices, { today: TODAY });
    expect(meta.oldestLastVerified).to.equal("2026-09-01");
    expect(meta.oldestPriceAsOf).to.equal("2026-01-01");
  });

  it("copes with no products and no prices", () => {
    const { products: built, meta } = buildDataset([], [], { today: TODAY });
    expect(built).to.deep.equal([]);
    expect(meta.productCount).to.equal(0);
    expect(meta.priceCoverage).to.equal(0);
    expect(meta.oldestLastVerified).to.equal(undefined);
  });

  describe("incidents", () => {
    const fromm = makeProduct({ id: "f1", brand: "Fromm", foodType: "wet" });
    const fromm2 = makeProduct({ id: "f2", brand: "Fromm", foodType: "dry" });
    const orijen = makeProduct({ id: "o1", brand: "Orijen", foodType: "wet" });
    const inc = (overrides: Partial<Incident>): Incident => ({
      id: "i", brand: "Fromm", productIds: [], date: "2026-08-21", type: "recall", evidenceTier: "regulator", reason: "r", jurisdiction: "US", affects: "a", sourceUrl: "https://example.com", ...overrides,
    });
    const checks: IncidentCheck[] = [
      { tier: "regulator", jurisdiction: "US", source: "FDA", checkedOn: "2026-10-07", coversFrom: "2016-10-07", url: "https://example.com/us" },
      { tier: "regulator", jurisdiction: "CA", source: "CFIA", checkedOn: "2026-10-05", coversFrom: "2016-10-07", url: "https://example.com/ca" },
      { tier: "company-or-trade", jurisdiction: "US", brand: "Fromm", source: "Fromm notices", checkedOn: "2026-10-06", coversFrom: "2016-10-07", url: "https://example.com/f" },
    ];

    it("counts incidents linked to a product separately from incidents against its brand", () => {
      const incidents = [inc({ id: "a", productIds: ["f1"] }), inc({ id: "b", productIds: [] })];
      const { products: built } = buildDataset([fromm, fromm2, orijen], [], { today: TODAY, incidents, incidentChecks: checks });
      expect(built[0].derived!.incidentCount).to.equal(1); // f1 is linked to "a"
      expect(built[0].derived!.brandIncidentCount).to.equal(2); // both incidents are Fromm's
      expect(built[1].derived!.incidentCount).to.equal(0);
      expect(built[1].derived!.brandIncidentCount).to.equal(2);
      expect(built[2].derived!.incidentCount).to.equal(0);
      expect(built[2].derived!.brandIncidentCount).to.equal(0);
    });

    it("matches brands case-insensitively and ignores incidents outside the 10-year scope", () => {
      const incidents = [inc({ brand: "FROMM" }), inc({ id: "old", date: "2015-11-06" })];
      const { products: built } = buildDataset([fromm], [], { today: TODAY, incidents, incidentChecks: checks });
      expect(built[0].derived!.brandIncidentCount).to.equal(1);
    });

    it("keeps a 2019 incident, which the old 5-year scope would have dropped", () => {
      const { products: built } = buildDataset([fromm], [], { today: TODAY, incidents: [inc({ date: "2019-05-21" })], incidentChecks: checks });
      expect(built[0].derived!.brandIncidentCount).to.equal(1);
    });

    it("counts company-or-trade recalls as incidents but keeps report-tier entries out of the incident counts", () => {
      const incidents = [
        inc({ id: "a", productIds: ["f1"], evidenceTier: "company-or-trade" }),
        inc({ id: "b", productIds: ["f1"], evidenceTier: "report", type: "investigation" }),
        inc({ id: "c", evidenceTier: "report", type: "investigation" }),
      ];
      const { products: built, meta } = buildDataset([fromm, fromm2], [], { today: TODAY, incidents, incidentChecks: checks });
      expect(built[0].derived!.incidentCount).to.equal(1);
      expect(built[0].derived!.reportCount).to.equal(1);
      expect(built[0].derived!.brandIncidentCount).to.equal(1); // "a"; the two reports are counted apart
      expect(built[0].derived!.brandReportCount).to.equal(2); // "b" and "c"
      expect(built[1].derived!.incidentCount).to.equal(0);
      expect(built[1].derived!.reportCount).to.equal(0);
      expect(built[1].derived!.brandIncidentCount).to.equal(1); // "a" names f1 only but is still the brand's
      expect(built[1].derived!.brandReportCount).to.equal(2);
      expect(meta.incidentCount).to.equal(1);
      expect(meta.reportCount).to.equal(2);
    });

    it("summarises incidents and the sources checked in the metadata", () => {
      const incidents = [inc({ productIds: ["f1"] })];
      const { meta } = buildDataset([fromm, orijen], [], { today: TODAY, incidents, incidentChecks: checks });
      expect(meta.incidentCount).to.equal(1);
      expect(meta.productsWithIncidents).to.equal(1);
      expect(meta.incidentChecks).to.deep.equal(checks);
      expect(meta.incidentsCheckedOn).to.equal("2026-10-05"); // the oldest of the latest checks per regulator and per brand
      expect(meta.incidentScope).to.be.a("string").and.include("CFIA").and.include("FDA");
      expect(meta.incidentTiers).to.have.all.keys("regulator", "company-or-trade", "report");
    });

    it("works with no incident inputs at all", () => {
      const { products: built, meta } = buildDataset([fromm], [], { today: TODAY });
      expect(built[0].derived!.incidentCount).to.equal(0);
      expect(meta.incidentCount).to.equal(0);
      expect(meta.reportCount).to.equal(0);
      expect(meta.incidentChecks).to.deep.equal([]);
      expect(meta.incidentsCheckedOn).to.equal(undefined);
    });
  });
});
