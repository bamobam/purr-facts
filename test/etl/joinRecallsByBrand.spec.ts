import { expect } from "chai";
import { joinRecallsByBrand, OpenFdaRecallRecord } from "../../src/etl/joinRecallsByBrand";

function makeRecall(overrides: Partial<OpenFdaRecallRecord>): OpenFdaRecallRecord {
  return {
    recalling_firm: "Acme Pet Foods Inc",
    product_description: "ACME DRY CAT FOOD, 5LB BAG",
    reason_for_recall: "Possible salmonella contamination",
    recall_number: "F-0001-2025",
    classification: "Class II",
    recall_initiation_date: "20250101",
    ...overrides,
  };
}

describe("joinRecallsByBrand", () => {
  it("matches a recall whose recalling_firm contains the brand as a substring", () => {
    const recall = makeRecall({ recalling_firm: "Nestle Purina Petcare Company" });
    const result = joinRecallsByBrand(["purina"], [recall]);
    expect(result.purina).to.deep.equal([recall]);
  });

  it("matches a recall whose product_description contains the brand", () => {
    const recall = makeRecall({ recalling_firm: "Some Manufacturer LLC", product_description: "PURINA CAT CHOW, 10LB BAG" });
    const result = joinRecallsByBrand(["purina"], [recall]);
    expect(result.purina).to.deep.equal([recall]);
  });

  it("does not match a recall unrelated to the brand", () => {
    const recall = makeRecall({ recalling_firm: "Unrelated Co", product_description: "GENERIC DOG TREATS" });
    const result = joinRecallsByBrand(["purina"], [recall]);
    expect(result.purina).to.be.undefined;
  });

  it("matches case-insensitively regardless of the normalized brand's casing", () => {
    const recall = makeRecall({ recalling_firm: "PURINA PETCARE" });
    const result = joinRecallsByBrand(["purina"], [recall]);
    expect(result.purina).to.deep.equal([recall]);
  });

  it("collects multiple recalls under the same brand", () => {
    const recallA = makeRecall({ recall_number: "F-0001-2025", recalling_firm: "Purina Co" });
    const recallB = makeRecall({ recall_number: "F-0002-2025", recalling_firm: "Purina Co" });
    const result = joinRecallsByBrand(["purina"], [recallA, recallB]);
    expect(result.purina).to.deep.equal([recallA, recallB]);
  });

  it("matches a single recall under every brand it mentions", () => {
    const recall = makeRecall({ product_description: "MIXED CASE LOT: PURINA AND MEOW MIX BRANDED CAT FOOD" });
    const result = joinRecallsByBrand(["purina", "meow mix"], [recall]);
    expect(result.purina).to.deep.equal([recall]);
    expect(result["meow mix"]).to.deep.equal([recall]);
  });

  it("omits brands from the result entirely when they have no matching recalls", () => {
    const recall = makeRecall({ recalling_firm: "Purina Co" });
    const result = joinRecallsByBrand(["purina", "no-recalls-brand"], [recall]);
    expect(Object.keys(result)).to.deep.equal(["purina"]);
  });
});
