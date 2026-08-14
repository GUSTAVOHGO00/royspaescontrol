import { describe, expect, test } from "vitest";
import {
  cleanReportFixture,
  noisyOcrReportFixture,
  reportWithoutProductsFixture,
} from "./fixtures/reports";
import { parseReport } from "./reportParser";

describe("parseReport", () => {
  test("reconhece categorias, fatores e linhas com código, quantidade e preços", () => {
    const result = parseReport(cleanReportFixture);

    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(5);
    expect(
      result.items.map(({ productName, category, quantity, breadFactor }) => ({
        productName,
        category,
        quantity,
        breadFactor,
      })),
    ).toEqual([
      {
        productName: "Almôndega",
        category: "smart",
        quantity: 2,
        breadFactor: 0.5,
      },
      {
        productName: "Frango com Cream Cheese",
        category: "smart",
        quantity: 3,
        breadFactor: 0.5,
      },
      {
        productName: "Rosbife",
        category: "super",
        quantity: 1,
        breadFactor: 1,
      },
      {
        productName: "Camarão com Cream Cheese",
        category: "combo-smart",
        quantity: 2,
        breadFactor: 0.5,
      },
      {
        productName: "Choripán",
        category: "combo-super",
        quantity: 1,
        breadFactor: 1,
      },
    ]);
    expect(result.items[0].breadEquivalent).toBe(1);
  });

  test("tolera acentos ausentes, ruído OCR e preços com ponto ou vírgula", () => {
    const result = parseReport(noisyOcrReportFixture);

    expect(result.success).toBe(true);
    expect(result.items.map((item) => item.productName)).toEqual([
      "Almôndega",
      "Frango Crispy Royal",
      "Carne Seca com Cream Cheese",
      "Smash Blend",
    ]);
    expect(result.items[0]).toMatchObject({
      category: "combo-smart",
      quantity: 2,
    });
    expect(result.items[2]).toMatchObject({ category: "super", quantity: 3 });
    expect(result.items.every((item) => item.confidence >= 0)).toBe(true);
    expect(result.items.every((item) => item.confidence <= 1)).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("retorna evidência rastreável em cada item e no resultado", () => {
    const result = parseReport(cleanReportFixture);

    expect(result.items[0].evidence).toMatchObject({
      lineNumber: 3,
      rawLine: "00101 ALMÔNDEGA 2 24,90 49,80",
      matchedAlias: "ALMONDEGA",
    });
    expect(result.evidence).toMatchObject({
      matchedLines: 5,
      candidateLines: 5,
    });
  });

  test("nunca informa sucesso quando nenhum item foi reconhecido", () => {
    const result = parseReport(reportWithoutProductsFixture);

    expect(result.success).toBe(false);
    expect(result.items).toEqual([]);
    expect(result.warnings).toContain(
      "Nenhum item de cardápio foi reconhecido no relatório.",
    );
  });

  test("reconhece os demais sanduíches oficiais por aliases", () => {
    const result = parseReport(`
      SMART
      1 STEAK 1 29,90
      2 CAMARAO C/ CREAM CHEESE 1 34,90
      3 CARNE SECA C CREAM CHEESE 1 32,90
      4 CHORIPAN 1 30,90
      5 FRANGO 1 20,90
      6 FRANGO CRISPY KING 1 25,90
      7 SMASH 1 23,90
    `);

    expect(result.items.map((item) => item.productName)).toEqual([
      "Steak",
      "Camarão com Cream Cheese",
      "Carne Seca com Cream Cheese",
      "Choripán",
      "Frango",
      "Frango Crispy King",
      "Smash Blend",
    ]);
  });
});
