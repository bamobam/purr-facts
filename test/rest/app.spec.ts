import { expect } from "chai";
import request from "supertest";
import { createApp } from "../../src/rest/app";

describe("GET /products", () => {
  const app = createApp();

  it("returns all fixture products when no brand filter is given", async () => {
    const res = await request(app).get("/products");
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
    expect(res.body.length).to.be.greaterThan(0);
  });

  it("returns only products matching the given brand", async () => {
    const res = await request(app).get("/products").query({ brand: "Purina" });
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
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
});
