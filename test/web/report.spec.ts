import { expect } from "chai";
import { fillReportUrl } from "../../web/src/lib/report";

describe("fillReportUrl", () => {
  it("inserts the food, URL-encoded, so a form field can be prefilled", () => {
    expect(fillReportUrl("https://f.example/x?entry.1={food}", "Hill's Science Diet (curated-17)")).to.equal(
      "https://f.example/x?entry.1=Hill's%20Science%20Diet%20(curated-17)"
    );
  });
  it("leaves the field empty when no food is given, and fills every placeholder", () => {
    expect(fillReportUrl("https://f.example/x?a={food}&b={food}")).to.equal("https://f.example/x?a=&b=");
  });
  it("leaves a link with no placeholder unchanged", () => {
    expect(fillReportUrl("https://f.example/x")).to.equal("https://f.example/x");
  });
});
