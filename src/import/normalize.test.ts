import { describe, expect, test } from "vitest";
import {
  normalizeForMatch,
  normalizeReportText,
  parseBrazilianNumber,
} from "./normalize";

describe("normalizeForMatch", () => {
  test("remove acentos, pontuação e ruído comum de OCR em palavras", () => {
    expect(normalizeForMatch("  Almôndega — FRANG0 CR1SPY  ")).toBe(
      "ALMONDEGA FRANGO CRISPY",
    );
  });
});

describe("normalizeReportText", () => {
  test("preserva linhas úteis e normaliza espaços sem perder evidência textual", () => {
    expect(normalizeReportText("SMART\r\n  001  Frango   2  19,90 \n\n")).toEqual([
      "SMART",
      "001 Frango 2 19,90",
    ]);
  });
});

describe("parseBrazilianNumber", () => {
  test.each([
    ["R$ 1.234,56", 1234.56],
    ["39,90", 39.9],
    ["39.90", 39.9],
    ["34,9O", 34.9],
  ])("converte %s em %s", (raw, expected) => {
    expect(parseBrazilianNumber(raw)).toBe(expected);
  });

  test("rejeita conteúdo que não representa número", () => {
    expect(parseBrazilianNumber("TOTAL")).toBeNull();
  });
});
