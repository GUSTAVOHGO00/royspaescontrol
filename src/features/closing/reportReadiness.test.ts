import { describe, expect, it } from "vitest";
import { canReviewReport } from "./reportReadiness";

const fileReport = {
  mode: "file" as const,
  documentName: "fechamento.pdf",
  parsedItemCount: 3,
  systemEquivalent: 8.5
};

describe("canReviewReport", () => {
  it("não libera arquivo apenas por ter um nome", () => {
    expect(
      canReviewReport({
        ...fileReport,
        parsedItemCount: 0,
        reviewConfirmed: true
      })
    ).toBe(false);
  });

  it("exige confirmação humana dos itens reconhecidos", () => {
    expect(canReviewReport({ ...fileReport, reviewConfirmed: false })).toBe(false);
    expect(canReviewReport({ ...fileReport, reviewConfirmed: true })).toBe(true);
  });

  it("libera lançamento manual preenchido sem fingir que houve OCR", () => {
    expect(
      canReviewReport({
        mode: "manual",
        documentName: "",
        parsedItemCount: 0,
        systemEquivalent: 8.5,
        reviewConfirmed: false
      })
    ).toBe(true);
  });
});