import { expect } from "chai";
import { isPeer } from "../../src/metrics/peers";
import { makeProduct } from "../fixtures/products";

const wetAdult = makeProduct({ id: "a", foodType: "wet", adequacyStage: "adult-maintenance" });
const wetAdult2 = makeProduct({ id: "b", foodType: "wet", adequacyStage: "adult-maintenance" });
const wetAll = makeProduct({ id: "c", foodType: "wet", adequacyStage: "all-life-stages" });
const wetNone = makeProduct({ id: "d", foodType: "wet", adequacyStandard: "none", adequacyStage: "not-stated" });
const dryAdult = makeProduct({ id: "e", foodType: "dry", adequacyStage: "adult-maintenance" });

describe("isPeer", () => {
  it("treats same food type and same stage as peers", () => {
    expect(isPeer(wetAdult, wetAdult2)).to.equal(true);
  });

  it("never treats wet and dry foods as peers", () => {
    expect(isPeer(wetAdult, dryAdult)).to.equal(false);
    expect(isPeer(wetAdult, dryAdult, true)).to.equal(false);
  });

  it("keeps adult-maintenance and all-life-stages foods apart by default", () => {
    expect(isPeer(wetAdult, wetAll)).to.equal(false);
    expect(isPeer(wetAll, wetAdult)).to.equal(false);
  });

  it("brings them together when the all-life-stages toggle is on", () => {
    expect(isPeer(wetAdult, wetAll, true)).to.equal(true);
    expect(isPeer(wetAll, wetAdult, true)).to.equal(true);
  });

  it("never mixes foods with no stated stage into another cohort, even with the toggle", () => {
    expect(isPeer(wetAdult, wetNone)).to.equal(false);
    expect(isPeer(wetAdult, wetNone, true)).to.equal(false);
    expect(isPeer(wetNone, wetAll, true)).to.equal(false);
  });

  it("lets foods with no stated stage be peers of each other", () => {
    expect(isPeer(wetNone, makeProduct({ id: "f", foodType: "wet", adequacyStandard: "none", adequacyStage: "not-stated" }))).to.equal(true);
  });

  it("ignores the standard: an AAFCO and a FEDIAF adult-maintenance food are peers", () => {
    const fediaf = makeProduct({ id: "g", foodType: "wet", adequacyStandard: "fediaf", adequacyStage: "adult-maintenance" });
    expect(isPeer(wetAdult, fediaf)).to.equal(true);
  });
});
