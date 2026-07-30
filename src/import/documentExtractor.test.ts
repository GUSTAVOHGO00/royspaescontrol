import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  classifyDocument,
  isTrustworthyExtraction,
  shouldOcrPdfPage,
  validateDocumentFile
} from "./documentExtractor";

describe("segurança da importação", () => {
  it("distingue PDF, imagem e arquivo não suportado", () => {
    expect(classifyDocument("application/pdf")).toBe("pdf");
    expect(classifyDocument("image/jpeg")).toBe("image");
    expect(classifyDocument("text/csv")).toBe("unsupported");
    expect(classifyDocument("", "fechamento.PDF")).toBe("pdf");
    expect(classifyDocument("", "foto.jpeg")).toBe("image");
  });

  it("recusa arquivos vazios, grandes ou incompatíveis", () => {
    expect(() => validateDocumentFile(new File([], "vazio.pdf", { type: "application/pdf" }))).toThrow("vazio");
    expect(() => validateDocumentFile(new File([new Uint8Array(MAX_FILE_BYTES + 1)], "grande.pdf", { type: "application/pdf" }))).toThrow("15 MB");
    expect(() => validateDocumentFile(new File(["x"], "dados.csv", { type: "text/csv" }))).toThrow("JPG/PNG");
  });
});

describe("decisão de OCR", () => {
  it("encaminha uma página sem camada textual suficiente para OCR", () => {
    expect(shouldOcrPdfPage("capa")).toBe(true);
    expect(shouldOcrPdfPage("RELATÓRIO DE VENDAS COM PRODUTOS E QUANTIDADES")).toBe(false);
  });

  it("combina confiança do parser com a confiança global do Tesseract", () => {
    const items = [{ confidence: 0.86 }, { confidence: 0.74 }];
    expect(isTrustworthyExtraction(items, 84)).toBe(true);
    expect(isTrustworthyExtraction(items, 62)).toBe(false);
    expect(isTrustworthyExtraction([{ confidence: 0.62 }], 90)).toBe(false);
    expect(isTrustworthyExtraction([], 90)).toBe(false);
  });
});