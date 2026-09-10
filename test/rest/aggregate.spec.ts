import { expect } from "chai";
import request from "supertest";
import { createApp } from "../../src/rest/app";
import { fixtureProducts } from "../../src/data/fixtureProducts";

describe("GET /products/aggregate", () => {
  const app = createApp(fixtureProducts);

  it("groups by brand and computes the average of a numeric field", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand", metric: "avg:proteinPct" });
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
    const purina = res.body.find((r: any) => r.brand === "Purina");
    expect(purina).to.exist;
    expect(purina.metric).to.be.a("number");
    expect(purina.count).to.be.a("number");
  });

  it("groups by multiple comma-separated fields", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand,foodType", metric: "count" });
    expect(res.status).to.equal(200);
    for (const row of res.body) {
      expect(row).to.have.property("brand");
      expect(row).to.have.property("foodType");
    }
  });

  it("supports the count function without a field", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand", metric: "count" });
    expect(res.status).to.equal(200);
    expect(res.body.length).to.be.greaterThan(0);
  });

  it("applies having=below-average to filter groups", async () => {
    const all = await request(app).get("/products/aggregate").query({ groupBy: "brand", metric: "avg:price" });
    const filtered = await request(app)
      .get("/products/aggregate")
      .query({ groupBy: "brand", metric: "avg:price", having: "below-average" });
    expect(filtered.status).to.equal(200);
    expect(filtered.body.length).to.be.lessThan(all.body.length);
  });

  it("sorts by metric with the given order", async () => {
    const res = await request(app)
      .get("/products/aggregate")
      .query({ groupBy: "brand", metric: "avg:proteinPct", sort: "metric", order: "desc" });
    expect(res.status).to.equal(200);
    const metrics = res.body.map((r: any) => r.metric);
    const sorted = [...metrics].sort((a, b) => b - a);
    expect(metrics).to.deep.equal(sorted);
  });

  it("returns 400 when groupBy is missing", async () => {
    const res = await request(app).get("/products/aggregate").query({ metric: "avg:proteinPct" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("groupBy");
  });

  it("returns 400 when metric is missing", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("metric");
  });

  it("returns 400 for an unknown groupBy field", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "color", metric: "count" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("groupBy");
  });

  it("returns 400 for an unknown aggregate function", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand", metric: "median:proteinPct" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("metric");
  });

  it("returns 400 when a non-count function is missing its field", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand", metric: "avg" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("metric");
  });

  it("returns 400 for an invalid having value", async () => {
    const res = await request(app)
      .get("/products/aggregate")
      .query({ groupBy: "brand", metric: "count", having: "highest" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("having");
  });

  it("returns 400 when order is given without sort", async () => {
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand", metric: "count", order: "asc" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("sort");
  });

  it("returns 400 for an unknown query parameter", async () => {
    const res = await request(app)
      .get("/products/aggregate")
      .query({ groupBy: "brand", metric: "count", color: "orange" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("color");
  });

  it("breaks a tie in sort order alphabetically by group key", async () => {
    // Fixture data: lifeStage "kitten" and "senior" both have exactly 1 product, "adult" has 3.
    const res = await request(app)
      .get("/products/aggregate")
      .query({ groupBy: "lifeStage", metric: "count", sort: "metric", order: "asc" });
    expect(res.status).to.equal(200);
    expect(res.body.map((r: any) => r.lifeStage)).to.deep.equal(["kitten", "senior", "adult"]);
  });

  it("omits groups where the metric field has no defined values across the whole fixture set", async () => {
    // No fixture product defines fiberPct at all, so every group is "empty" for this metric.
    const res = await request(app).get("/products/aggregate").query({ groupBy: "brand", metric: "avg:fiberPct" });
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });

  it("returns 400 when groupBy is supplied more than once (parsed as an array)", async () => {
    const res = await request(app).get("/products/aggregate?groupBy=brand&groupBy=variant&metric=count");
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("groupBy");
  });

  it("applying having when no group has a computable metric returns an empty array, not an error", async () => {
    const res = await request(app)
      .get("/products/aggregate")
      .query({ groupBy: "brand", metric: "avg:fiberPct", having: "above-average" });
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });
});
