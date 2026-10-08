import { expect } from "chai";
import request from "supertest";
import { createApp } from "../../src/rest/app";
import { DatasetMeta } from "../../src/data/buildDataset";
import { Incident } from "../../src/models/Incident";
import { Product } from "../../src/models/Product";
import { makeProduct } from "../fixtures/products";

function cohort(n: number): Product[] {
  return Array.from({ length: n }, (_, i) =>
    makeProduct({
      id: `w${i + 1}`,
      brand: "Purina",
      foodType: "wet",
      adequacyStage: "adult-maintenance",
      derived: { proteinGPer1000kcal: i + 1, priceObservationCount: 0, completeness: 1 },
    })
  );
}

const meta: DatasetMeta = {
  builtAt: "2026-10-07",
  productCount: 10,
  productsWithPrice: 7,
  priceCoverage: 0.7,
  priceObservationCount: 9,
  oldestLastVerified: "2026-09-01",
  oldestPriceAsOf: "2026-09-20",
  incidentCount: 0,
  reportCount: 0,
  productsWithIncidents: 0,
  incidentChecks: [],
  incidentScope: "scope text",
  incidentTiers: { regulator: "r", "company-or-trade": "c", report: "p" },
};

describe("GET /products/:id", () => {
  const products = cohort(10);
  const app = createApp(products, { meta });

  it("returns the product with its derived metrics and a benchmark for each metric", async () => {
    const res = await request(app).get("/products/w5");
    expect(res.status).to.equal(200);
    expect(res.body.product.id).to.equal("w5");
    expect(res.body.product.derived.proteinGPer1000kcal).to.equal(5);
    expect(res.body.benchmarks.proteinGPer1000kcal).to.deep.include({ suppressed: false, cohortSize: 9, value: 5 });
    expect(res.body.benchmarks.proteinGPer1000kcal.percentile).to.be.closeTo((4 / 9) * 100, 1e-9);
    expect(res.body.benchmarks.fatGPer1000kcal.suppressed).to.equal(true);
  });

  it("returns 404 with a message for an unknown id", async () => {
    const res = await request(app).get("/products/nope");
    expect(res.status).to.equal(404);
    expect(res.body.error).to.include("nope");
  });

  it("accepts includeAllStages=true and rejects other values", async () => {
    expect((await request(app).get("/products/w5").query({ includeAllStages: "true" })).status).to.equal(200);
    const bad = await request(app).get("/products/w5").query({ includeAllStages: "maybe" });
    expect(bad.status).to.equal(400);
    expect(bad.body.error).to.include("includeAllStages");
  });

  it("returns 400 for an unknown query parameter", async () => {
    const res = await request(app).get("/products/w5").query({ colour: "red" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("colour");
  });

  it("does not shadow /products/aggregate", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand", metric: "count" });
    expect(res.status).to.equal(200);
  });
});

describe("GET /meta", () => {
  it("returns the dataset metadata, so the UI can show how fresh the data is", async () => {
    const res = await request(createApp(cohort(10), { meta })).get("/meta");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal(meta);
  });

  it("falls back to a product count when no metadata was built", async () => {
    const res = await request(createApp(cohort(3))).get("/meta");
    expect(res.status).to.equal(200);
    expect(res.body.productCount).to.equal(3);
  });
});

describe("GET /health", () => {
  it("is 200 with the product count when the dataset loaded", async () => {
    const res = await request(createApp(cohort(4))).get("/health");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ status: "ok", products: 4 });
  });

  it("is 503 when the dataset is empty, so a bad deploy can't pass a smoke test", async () => {
    const res = await request(createApp([])).get("/health");
    expect(res.status).to.equal(503);
    expect(res.body.status).to.equal("unavailable");
  });
});

describe("incidents over the API", () => {
  const fromm = makeProduct({ id: "f1", brand: "Fromm" });
  const orijen = makeProduct({ id: "o1", brand: "Orijen" });
  const linked: Incident = { id: "linked", brand: "Fromm", productIds: ["f1"], date: "2026-01-01", type: "recall", evidenceTier: "regulator", reason: "r1", jurisdiction: "US", affects: "a1", sourceUrl: "https://example.com/1" };
  const brandOnly: Incident = { id: "brand-only", brand: "Fromm", productIds: [], date: "2026-08-21", type: "recall", evidenceTier: "company-or-trade", reason: "r2", jurisdiction: "US", affects: "a2", sourceUrl: "https://example.com/2" };
  const ca: Incident = { id: "ca", brand: "Orijen", productIds: [], date: "2025-05-05", type: "safety-alert", evidenceTier: "regulator", reason: "r3", jurisdiction: "CA", affects: "a3", sourceUrl: "https://example.com/3" };
  const metaWithChecks: DatasetMeta = { ...meta, incidentsCheckedOn: "2026-10-07", incidentCount: 3, productsWithIncidents: 1 };
  const app = createApp([fromm, orijen], { meta: metaWithChecks, incidents: [linked, brandOnly, ca] });

  it("lists the incidents linked to a product, and the brand's other incidents separately", async () => {
    const res = await request(app).get("/products/f1");
    expect(res.status).to.equal(200);
    expect(res.body.incidents.map((i: Incident) => i.id)).to.deep.equal(["linked"]);
    expect(res.body.brandIncidents.map((i: Incident) => i.id)).to.deep.equal(["brand-only"]);
  });

  it("states what was checked and when, so an empty list is never read as 'safe'", async () => {
    const res = await request(app).get("/products/o1");
    expect(res.body.incidents).to.deep.equal([]);
    expect(res.body.incidentStatus).to.deep.equal({ checkedOn: "2026-10-07", scope: "scope text", tiers: { regulator: "r", "company-or-trade": "c", report: "p" } });
    expect(res.body.brandIncidents.map((i: Incident) => i.id)).to.deep.equal(["ca"]);
  });

  it("sorts incidents newest first", async () => {
    const both = createApp([fromm], { incidents: [linked, brandOnly] });
    const res = await request(both).get("/incidents").query({ brand: "Fromm" });
    expect(res.body.map((i: Incident) => i.id)).to.deep.equal(["brand-only", "linked"]);
  });

  it("filters /incidents by productId, brand and jurisdiction", async () => {
    expect((await request(app).get("/incidents").query({ productId: "f1" })).body.map((i: Incident) => i.id)).to.deep.equal(["linked"]);
    expect((await request(app).get("/incidents").query({ jurisdiction: "CA" })).body.map((i: Incident) => i.id)).to.deep.equal(["ca"]);
    expect((await request(app).get("/incidents").query({ brand: "orijen" })).body.map((i: Incident) => i.id)).to.deep.equal(["ca"]);
  });

  it("filters /incidents by evidenceTier", async () => {
    expect((await request(app).get("/incidents").query({ evidenceTier: "company-or-trade" })).body.map((i: Incident) => i.id)).to.deep.equal(["brand-only"]);
    expect((await request(app).get("/incidents").query({ evidenceTier: "regulator" })).body.map((i: Incident) => i.id)).to.deep.equal(["linked", "ca"]);
    expect((await request(app).get("/incidents").query({ evidenceTier: "report" })).body).to.deep.equal([]);
    expect((await request(app).get("/incidents").query({ evidenceTier: "rumour" })).status).to.equal(400);
  });

  it("returns every incident when no filter is given, and an empty list when none match", async () => {
    expect((await request(app).get("/incidents")).body).to.have.length(3);
    expect((await request(app).get("/incidents").query({ brand: "nobody" })).body).to.deep.equal([]);
  });

  it("returns 400 for a bad jurisdiction or an unknown parameter", async () => {
    expect((await request(app).get("/incidents").query({ jurisdiction: "EU" })).status).to.equal(400);
    expect((await request(app).get("/incidents").query({ colour: "red" })).status).to.equal(400);
  });
});
