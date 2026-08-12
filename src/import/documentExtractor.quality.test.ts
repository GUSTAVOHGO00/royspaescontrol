import { describe, expect, it } from "vitest";

import { shouldOcrPdfPage } from "./documentExtractor";

describe("qualidade da camada textual do PDF", () => {
  it("aciona OCR quando há bastante texto, mas nenhum item operacional reconhecido", () => {
    const scrambledText =
      "RELATORIO DE FECHAMENTO TOTAL LIQUIDO CANCELAMENTOS OPERADOR CAIXA";

    expect(shouldOcrPdfPage(scrambledText, 0)).toBe(true);
  });

  it("preserva a camada textual quando ela contém itens operacionais válidos", () => {
    const usefulText =
      "CARDAPIO REGULAR COMBO SMART 4 COMBO SUPER 3 FECHAMENTO DE VENDAS";

    expect(shouldOcrPdfPage(usefulText, 2)).toBe(false);
  });
});
