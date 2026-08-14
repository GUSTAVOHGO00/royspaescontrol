import { describe, expect, test } from "vitest";
import { calculateItemConfidence, clampConfidence } from "./confidence";

describe("clampConfidence", () => {
  test.each([
    [-0.4, 0],
    [0.4, 0.4],
    [1.8, 1],
  ])("limita %s ao intervalo 0..1", (value, expected) => {
    expect(clampConfidence(value)).toBe(expected);
  });
});

describe("calculateItemConfidence", () => {
  test("valoriza alias exato, categoria explícita e estrutura completa", () => {
    expect(
      calculateItemConfidence({
        aliasQuality: 1,
        hasCategory: true,
        hasQuantity: true,
        priceCount: 2,
        wasOcrCorrected: false,
      }),
    ).toBeGreaterThanOrEqual(0.9);
  });

  test("reduz confiança quando houve correção OCR e existe só um preço", () => {
    const confidence = calculateItemConfidence({
      aliasQuality: 0.78,
      hasCategory: true,
      hasQuantity: true,
      priceCount: 1,
      wasOcrCorrected: true,
    });

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThan(0.9);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});
