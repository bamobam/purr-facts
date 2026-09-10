import { expect } from "chai";
import request from "supertest";
import { createApp } from "../../src/rest/app";

describe("GET /products", () => {
  const app = createApp();

  it("returns all fixture products when no filters are given", async () => {
    const res = await request(app).get("/products");
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
    expect(res.body.length).to.be.greaterThan(0);
  });

  it("returns only products matching the given brand, case-insensitively", async () => {
    const res = await request(app).get("/products").query({ brand: "purina" });
    expect(res.status).to.equal(200);
    expect(res.body.length).to.be.greaterThan(0);
    for (const product of res.body) {
      expect(product.brand).to.equal("Purina");
    }
  });

  it("returns an empty array for a brand with no matches", async () => {
    const res = await request(app).get("/products").query({ brand: "Nonexistent" });
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });

  it("filters by variant", async () => {
    const res = await request(app).get("/products").query({ variant: "Chicken" });
    expect(res.status).to.equal(200);
    for (const product of res.body) {
      expect(product.variant).to.equal("Chicken");
    }
  });

  it("filters by foodType", async () => {
    const res = await request(app).get("/products").query({ foodType: "dry" });
    expect(res.status).to.equal(200);
    expect(res.body.length).to.be.greaterThan(0);
    for (const product of res.body) {
      expect(product.foodType).to.equal("dry");
    }
  });

  it("filters by lifeStage", async () => {
    const res = await request(app).get("/products").query({ lifeStage: "kitten" });
    expect(res.status).to.equal(200);
    for (const product of res.body) {
      expect(product.lifeStage).to.equal("kitten");
    }
  });

  it("filters by a proteinPct range", async () => {
    const res = await request(app).get("/products").query({ proteinPctMin: "15", proteinPctMax: "35" });
    expect(res.status).to.equal(200);
    for (const product of res.body) {
      expect(product.proteinPct).to.be.at.least(15).and.at.most(35);
    }
  });

  it("combines multiple filters with AND semantics", async () => {
    const res = await request(app).get("/products").query({ brand: "Blue Buffalo", foodType: "dry" });
    expect(res.status).to.equal(200);
    expect(res.body.length).to.be.greaterThan(0);
    for (const product of res.body) {
      expect(product.brand).to.equal("Blue Buffalo");
      expect(product.foodType).to.equal("dry");
    }
  });

  it("returns 400 with a descriptive error for an invalid foodType value", async () => {
    const res = await request(app).get("/products").query({ foodType: "kibble" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.be.a("string");
    expect(res.body.error).to.include("foodType");
  });

  it("returns 400 with a descriptive error for an invalid lifeStage value", async () => {
    const res = await request(app).get("/products").query({ lifeStage: "puppy" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("lifeStage");
  });

  it("returns 400 with a descriptive error for a non-numeric range value", async () => {
    const res = await request(app).get("/products").query({ proteinPctMin: "abc" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("proteinPctMin");
  });

  it("returns 400 with a descriptive error for an unknown query parameter", async () => {
    const res = await request(app).get("/products").query({ color: "orange" });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("color");
  });

  it("returns 400 when brand is supplied more than once (parsed as an array)", async () => {
    const res = await request(app).get("/products?brand=a&brand=b");
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("brand");
  });

  it("returns 400 for an empty numeric range value rather than treating it as zero", async () => {
    const res = await request(app).get("/products?priceMin=");
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("priceMin");
  });

  it("combines three or more filters together with AND semantics", async () => {
    const res = await request(app).get("/products").query({ brand: "Blue Buffalo", foodType: "dry", lifeStage: "kitten" });
    expect(res.status).to.equal(200);
    expect(res.body.length).to.be.greaterThan(0);
    for (const product of res.body) {
      expect(product.brand).to.equal("Blue Buffalo");
      expect(product.foodType).to.equal("dry");
      expect(product.lifeStage).to.equal("kitten");
    }
  });
});
