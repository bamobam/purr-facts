import { expect } from "chai";
import { loadIncidents, loadIncidentChecks } from "../../src/etl/loadIncidents";
import { validateIncidents } from "../../src/etl/validateIncidents";
import { Incident, IncidentCheck } from "../../src/models/Incident";
import { makeProduct } from "../fixtures/products";

const TODAY = "2026-10-07";
const HEADER = "id,brand,productIds,date,type,evidenceTier,reason,recallClass,jurisdiction,affects,sourceUrl";
const CHECK_HEADER = "tier,jurisdiction,brand,source,checkedOn,coversFrom,url";

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "fda-2026-08-21-fromm",
    brand: "Fromm",
    productIds: [],
    date: "2026-08-21",
    type: "recall",
    evidenceTier: "regulator",
    reason: "Potential metal contamination",
    jurisdiction: "US",
    affects: "Two wet dog foods; no other Fromm products",
    sourceUrl: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/example",
    ...overrides,
  };
}

const checks: IncidentCheck[] = [
  { tier: "regulator", jurisdiction: "US", source: "FDA animal and veterinary recalls list", checkedOn: "2026-10-07", coversFrom: "2016-10-07", url: "https://www.fda.gov/x" },
  { tier: "regulator", jurisdiction: "CA", source: "Health Canada and CFIA recalls open data", checkedOn: "2026-10-07", coversFrom: "2016-10-07", url: "https://recalls-rappels.canada.ca/x" },
  { tier: "company-or-trade", jurisdiction: "US", brand: "Fromm", source: "Fromm recall notices page", checkedOn: "2026-10-07", coversFrom: "2016-10-07", url: "https://frommfamily.com/x" },
  { tier: "company-or-trade", jurisdiction: "US", brand: "Orijen", source: "Orijen FAQ and trade press", checkedOn: "2026-10-07", coversFrom: "2016-10-07", url: "https://orijen.ca/x" },
];

const products = [makeProduct({ id: "p1", brand: "Fromm" }), makeProduct({ id: "p2", brand: "Orijen" })];

function run(incidents: Incident[], c: IncidentCheck[] = checks) {
  return validateIncidents(incidents, c, products, { today: TODAY });
}

describe("loadIncidents", () => {
  it("parses rows, splitting productIds on semicolons and omitting a blank recallClass", () => {
    const csv = [
      HEADER,
      "i1,Fromm,p1;p2,2026-08-21,recall,regulator,Potential metal contamination,,US,Two dog foods,https://example.com/a",
      "i2,Orijen,,2025-01-02,safety-alert,company-or-trade,Possible contamination,Class 2,CA,No catalog products,https://example.com/b",
    ].join("\n");
    const list = loadIncidents(csv);
    expect(list[0].productIds).to.deep.equal(["p1", "p2"]);
    expect(list[0]).to.not.have.property("recallClass");
    expect(list[1].productIds).to.deep.equal([]);
    expect(list[1].recallClass).to.equal("Class 2");
    expect(list[1].jurisdiction).to.equal("CA");
    expect(list.map((i) => i.evidenceTier)).to.deep.equal(["regulator", "company-or-trade"]);
  });

  it("returns an empty list for a header-only file", () => {
    expect(loadIncidents(HEADER + "\n")).to.deep.equal([]);
  });
});

describe("loadIncidentChecks", () => {
  it("parses the sources that were searched, omitting a blank brand", () => {
    const csv = [CHECK_HEADER, "regulator,US,,FDA list,2026-10-07,2016-10-07,https://example.com", "company-or-trade,US,Fromm,Fromm notices,2026-10-07,2016-10-07,https://example.com/f"].join("\n");
    const list = loadIncidentChecks(csv);
    expect(list[0]).to.deep.equal({ tier: "regulator", jurisdiction: "US", source: "FDA list", checkedOn: "2026-10-07", coversFrom: "2016-10-07", url: "https://example.com" });
    expect(list[1]).to.include({ tier: "company-or-trade", brand: "Fromm" });
  });
});

describe("validateIncidents", () => {
  it("accepts a brand-level incident that links to no product", () => {
    expect(run([incident()])).to.deep.equal([]);
  });

  it("accepts an incident linked to products of the same brand", () => {
    expect(run([incident({ productIds: ["p1"] })])).to.deep.equal([]);
  });

  it("errors on an unknown product id", () => {
    const issues = run([incident({ productIds: ["nope"] })]);
    expect(issues).to.have.length(1);
    expect(issues[0]).to.include({ severity: "error", field: "productIds" });
  });

  it("errors when a linked product belongs to a different brand", () => {
    const issues = run([incident({ productIds: ["p2"] })]);
    expect(issues.some((i) => i.severity === "error" && /brand/i.test(i.message))).to.equal(true);
  });

  it("errors on a bad type or jurisdiction", () => {
    expect(run([incident({ type: "complaint" as never })])[0]).to.include({ severity: "error", field: "type" });
    expect(run([incident({ jurisdiction: "EU" as never })])[0]).to.include({ severity: "error", field: "jurisdiction" });
  });

  it("errors on missing required text", () => {
    expect(run([incident({ reason: "" })])[0]).to.include({ severity: "error", field: "reason" });
    expect(run([incident({ affects: "" })])[0]).to.include({ severity: "error", field: "affects" });
    expect(run([incident({ brand: "" })])[0]).to.include({ severity: "error", field: "brand" });
  });

  it("errors when the source url is not http(s)", () => {
    expect(run([incident({ sourceUrl: "fda.gov/x" })])[0]).to.include({ severity: "error", field: "sourceUrl" });
  });

  it("errors on a date that is not real or is in the future", () => {
    expect(run([incident({ date: "08/21/2026" })])[0]).to.include({ severity: "error", field: "date" });
    expect(run([incident({ date: "2026-10-08" })])[0]).to.include({ severity: "error", field: "date" });
  });

  it("errors on duplicate ids", () => {
    const issues = run([incident(), incident()]);
    expect(issues.some((i) => i.severity === "error" && /duplicate/i.test(i.message))).to.equal(true);
  });

  it("warns, without failing, when an incident is older than the 10-year scope", () => {
    const issues = run([incident({ date: "2015-11-06" })]);
    expect(issues).to.have.length(1);
    expect(issues[0]).to.include({ severity: "warning", field: "date" });
  });

  describe("evidence tiers", () => {
    it("errors on an unknown evidence tier", () => {
      expect(run([incident({ evidenceTier: "rumour" as never })])[0]).to.include({ severity: "error", field: "evidenceTier" });
    });

    it("accepts a company-or-trade recall", () => {
      expect(run([incident({ evidenceTier: "company-or-trade", jurisdiction: "CA" })])).to.deep.equal([]);
    });

    it("accepts a report-tier investigation, which is not a recall", () => {
      expect(run([incident({ evidenceTier: "report", type: "investigation" })])).to.deep.equal([]);
    });

    it("errors when a report-tier entry is typed as a recall, or an investigation is given a recall tier", () => {
      expect(run([incident({ evidenceTier: "report", type: "recall" })]).some((i) => i.severity === "error" && i.field === "type")).to.equal(true);
      expect(run([incident({ evidenceTier: "regulator", type: "investigation" })]).some((i) => i.severity === "error" && i.field === "type")).to.equal(true);
    });
  });

  describe("10-year scope", () => {
    it("accepts an incident from 2019 without a warning", () => {
      expect(run([incident({ date: "2019-05-21" })])).to.deep.equal([]);
    });
  });

  describe("source checks", () => {
    it("errors when a jurisdiction was never checked, since absence of incidents would mean nothing", () => {
      const issues = run([], [checks[0], checks[2], checks[3]]);
      expect(issues.some((i) => i.severity === "error" && /CA/.test(i.message))).to.equal(true);
    });

    it("errors on a bad checkedOn date", () => {
      expect(run([], [{ ...checks[0], checkedOn: "yesterday" }, ...checks.slice(1)]).some((i) => i.severity === "error")).to.equal(true);
    });

    it("warns when the latest check for a jurisdiction is more than 90 days old", () => {
      const issues = run([], [{ ...checks[0], checkedOn: "2026-05-01" }, ...checks.slice(1)]);
      expect(issues.filter((i) => i.severity === "warning")).to.have.length(1);
      expect(issues.some((i) => i.severity === "error")).to.equal(false);
    });

    it("is satisfied by a recent check even if an older one also exists", () => {
      expect(run([], [{ ...checks[0], checkedOn: "2026-01-01" }, ...checks])).to.deep.equal([]);
    });

    it("errors when a catalog brand has no company-or-trade check, since its own page was never searched", () => {
      const issues = run([], checks.filter((c) => c.brand !== "Orijen"));
      expect(issues.some((i) => i.severity === "error" && /Orijen/.test(i.message))).to.equal(true);
      expect(issues.some((i) => /Fromm/.test(i.message))).to.equal(false);
    });

    it("matches the brand of a company check case-insensitively", () => {
      const lower = checks.map((c) => (c.brand === "Fromm" ? { ...c, brand: "FROMM" } : c));
      expect(run([], lower)).to.deep.equal([]);
    });

    it("warns when a brand's latest company-or-trade check is more than 90 days old", () => {
      const stale = checks.map((c) => (c.brand === "Fromm" ? { ...c, checkedOn: "2026-05-01" } : c));
      const issues = run([], stale);
      expect(issues).to.have.length(1);
      expect(issues[0]).to.include({ severity: "warning" });
      expect(issues[0].message).to.match(/Fromm/);
    });

    it("errors on an unknown check tier", () => {
      expect(run([], [...checks, { ...checks[0], tier: "gossip" as never }]).some((i) => i.severity === "error")).to.equal(true);
    });
  });
});
