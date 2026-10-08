import { expect } from "chai";
import request from "supertest";
import { createApp } from "../../src/rest/app";
import { fixtureProducts } from "../fixtures/products";

describe("GET /config", () => {
  it("returns the report-an-error link when one is configured", async () => {
    const app = createApp(fixtureProducts, { reportUrl: "https://forms.example.com/report?food={food}" });
    const res = await request(app).get("/config");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ reportUrl: "https://forms.example.com/report?food={food}" });
  });

  it("returns no link when none is configured, so the site hides the button", async () => {
    const res = await request(createApp(fixtureProducts)).get("/config");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({});
  });

  it("ignores a link that is not http(s), rather than serving it to the browser", async () => {
    for (const bad of ["javascript:alert(1)", "forms.example.com/x", "", "  "]) {
      const res = await request(createApp(fixtureProducts, { reportUrl: bad })).get("/config");
      expect(res.body, bad).to.deep.equal({});
    }
  });
});
