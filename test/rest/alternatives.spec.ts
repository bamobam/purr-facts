import { expect } from "chai";
import request from "supertest";
import { createApp } from "../../src/rest/app";
import { Product } from "../../src/models/Product";
import { makeProduct } from "../fixtures/products";

function food(id: string, protein: number, price: number, overrides: Partial<Product> = {}): Product {
  return makeProduct({
    id,
    foodType: "wet",
    adequacyStage: "adult-maintenance",
    derived: { proteinGPer1000kcal: protein, pricePer1000kcal: price, priceObservationCount: 1, completeness: 1 },
    ...overrides,
  });
}

describe("GET /products/:id/alternatives", () => {
  const products = [
    food("me", 60, 5),
    food("a", 70, 4),
    food("b", 80, 6),
    food("als", 95, 2, { adequacyStage: "all-life-stages" }),
  ];
  const app = createApp(products);

  it("returns peers that beat the food on the chosen goal, with deltas", async () => {
    const res = await request(app).get("/products/me/alternatives").query({ goal: "protein" });
    expect(res.status).to.equal(200);
    expect(res.body).to.include({ goal: "protein", metric: "proteinGPer1000kcal", better: "higher", currentValue: 60, peerCount: 2, includeAllStages: false });
    expect(res.body.alternatives.map((a: { product: Product }) => a.product.id)).to.deep.equal(["b", "a"]);
    expect(res.body.alternatives[0]).to.include({ value: 80, delta: 20 });
  });

  it("supports the price goal, where lower is better", async () => {
    const res = await request(app).get("/products/me/alternatives").query({ goal: "price" });
    expect(res.body.better).to.equal("lower");
    expect(res.body.alternatives.map((a: { product: Product }) => a.product.id)).to.deep.equal(["a"]);
  });

  it("honours includeAllStages and limit", async () => {
    const res = await request(app).get("/products/me/alternatives").query({ goal: "protein", includeAllStages: "true", limit: "2" });
    expect(res.body.includeAllStages).to.equal(true);
    expect(res.body.alternatives.map((a: { product: Product }) => a.product.id)).to.deep.equal(["als", "b"]);
  });

  it("requires a goal, so the caller has to pick one thing to optimise", async () => {
    expect((await request(app).get("/products/me/alternatives")).status).to.equal(400);
  });

  it("rejects an unknown goal, a bad toggle, a bad limit and an unknown parameter", async () => {
    expect((await request(app).get("/products/me/alternatives").query({ goal: "quality" })).status).to.equal(400);
    expect((await request(app).get("/products/me/alternatives").query({ goal: "protein", includeAllStages: "yes" })).status).to.equal(400);
    expect((await request(app).get("/products/me/alternatives").query({ goal: "protein", limit: "0" })).status).to.equal(400);
    expect((await request(app).get("/products/me/alternatives").query({ goal: "protein", limit: "51" })).status).to.equal(400);
    expect((await request(app).get("/products/me/alternatives").query({ goal: "protein", colour: "red" })).status).to.equal(400);
  });

  it("returns 404 for an unknown product", async () => {
    expect((await request(app).get("/products/nope/alternatives").query({ goal: "protein" })).status).to.equal(404);
  });

  it("says why when the food has no value for the goal, instead of an empty list that reads as 'nothing better'", async () => {
    const bare = makeProduct({ id: "bare", derived: { priceObservationCount: 0, completeness: 0.5 } });
    const res = await request(createApp([bare, food("a", 70, 4)])).get("/products/bare/alternatives").query({ goal: "price" });
    expect(res.status).to.equal(200);
    expect(res.body.alternatives).to.deep.equal([]);
    expect(res.body.reason).to.match(/no value/i);
  });
});
