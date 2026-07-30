import { OFFICIAL_V5_CATALOG } from "../domain/catalog";
import { calculateItemConfidence } from "./confidence";
import {
  normalizeForMatch,
  parseBrazilianNumber,
} from "./normalize";

export type ReportCategory =
  | "smart"
  | "super"
  | "combo-smart"
  | "combo-super";

export interface ReportItemEvidence {
  lineNumber: number;
  rawLine: string;
  normalizedLine: string;
  matchedAlias: string;
  categorySource: "header" | "inline";
}

export interface ParsedReportItem {
  productId: string;
  productName: string;
  category: ReportCategory;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  breadFactor: number;
  breadEquivalent: number;
  confidence: number;
  warnings: string[];
  evidence: ReportItemEvidence;
}

export interface ReportEvidence {
  totalLines: number;
  candidateLines: number;
  matchedLines: number;
  rejectedLines: string[];
}

export interface ReportParseResult {
  success: boolean;
  items: ParsedReportItem[];
  warnings: string[];
  evidence: ReportEvidence;
}

const PRODUCTS = OFFICIAL_V5_CATALOG;

const CATEGORY_FACTORS: Readonly<Record<ReportCategory, number>> = {
  smart: 0.5,
  super: 1,
  "combo-smart": 0.5,
  "combo-super": 1,
};

const PRICE_PATTERN = /(?:R\$\s*)?([0-9O]{1,3}(?:\.[0-9O]{3})+(?:,[0-9O]{2})|[0-9O]+(?:[.,][0-9O]{2}))/gi;

function findCategory(value: string): ReportCategory | null {
  if (/\bCOMBO\s+SMART\b/.test(value)) return "combo-smart";
  if (/\bCOMBO\s+SUPER\b/.test(value)) return "combo-super";
  if (/\bSMART\b/.test(value)) return "smart";
  if (/\bSUPER\b/.test(value)) return "super";
  return null;
}

function isCategoryHeader(
  normalizedLine: string,
  category: ReportCategory | null,
): category is ReportCategory {
  if (!category) return false;

  const withoutHeadingWords = normalizedLine
    .replace(/\b(?:SANDUICHES|SANDWICHES|VENDAS|CATEGORIA)\b/g, "")
    .trim();

  return /^(?:COMBO )?(?:SMART|SUPER)$/.test(withoutHeadingWords);
}

function findProduct(
  normalizedLine: string,
): { product: (typeof PRODUCTS)[number]; alias: string } | null {
  let bestMatch: { product: (typeof PRODUCTS)[number]; alias: string } | null = null;

  for (const product of PRODUCTS) {
    for (const alias of product.aliases) {
      const normalizedAlias = normalizeForMatch(alias);
      const pattern = new RegExp(`(?:^|\\s)${normalizedAlias}(?:\\s|$)`);
      if (
        pattern.test(normalizedLine) &&
        (!bestMatch || normalizedAlias.length > bestMatch.alias.length)
      ) {
        bestMatch = { product, alias: normalizedAlias };
      }
    }
  }

  return bestMatch;
}

function extractPrices(
  rawLine: string,
): { prices: number[]; firstPriceIndex: number } {
  const prices: number[] = [];
  let firstPriceIndex = -1;

  for (const match of rawLine.matchAll(PRICE_PATTERN)) {
    if (firstPriceIndex < 0) firstPriceIndex = match.index ?? -1;
    const parsed = parseBrazilianNumber(match[1]);
    if (parsed !== null) prices.push(parsed);
  }

  return { prices, firstPriceIndex };
}

function extractQuantity(rawLine: string, firstPriceIndex: number): number | null {
  if (firstPriceIndex < 0) return null;

  const prefix = rawLine.slice(0, firstPriceIndex);
  const integers = [...prefix.matchAll(/\b(\d{1,3})\b/g)];
  const rawQuantity = integers.at(-1)?.[1];
  if (!rawQuantity) return null;

  const quantity = Number(rawQuantity);
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 300
    ? quantity
    : null;
}

function containsOcrCorrections(rawLine: string): boolean {
  return rawLine
    .split(/\s+/)
    .some((word) => /\p{L}[01]|[01]\p{L}/iu.test(word));
}

export function parseReport(reportText: string): ReportParseResult {
  const warnings: string[] = [];
  const rejectedLines: string[] = [];
  const items: ParsedReportItem[] = [];
  let activeCategory: ReportCategory | null = null;
  let candidateLines = 0;

  const rawLines = reportText.replace(/\r\n?/g, "\n").split("\n");

  rawLines.forEach((untrimmedLine, index) => {
    const rawLine = untrimmedLine.trim().replace(/\s+/g, " ");
    if (!rawLine) return;

    const normalizedLine = normalizeForMatch(rawLine);
    const inlineCategory = findCategory(normalizedLine);
    if (isCategoryHeader(normalizedLine, inlineCategory)) {
      activeCategory = inlineCategory;
      return;
    }

    const match = findProduct(normalizedLine);
    if (!match) return;
    candidateLines += 1;

    const category = inlineCategory ?? activeCategory;
    const { prices, firstPriceIndex } = extractPrices(rawLine);
    const quantity = extractQuantity(rawLine, firstPriceIndex);

    if (!category || quantity === null || prices.length === 0) {
      rejectedLines.push(rawLine);
      if (!category) warnings.push(`Categoria não reconhecida: "${rawLine}".`);
      if (quantity === null) warnings.push(`Quantidade não reconhecida: "${rawLine}".`);
      if (prices.length === 0) warnings.push(`Preço não reconhecido: "${rawLine}".`);
      return;
    }

    const itemWarnings: string[] = [];
    const wasOcrCorrected = containsOcrCorrections(rawLine);
    if (wasOcrCorrected) {
      itemWarnings.push(
        `A linha ${index + 1} exigiu correção de caracteres do OCR.`,
      );
    }
    if (prices.length === 1) {
      itemWarnings.push(`A linha ${index + 1} contém somente um preço.`);
    }

    const breadFactor = CATEGORY_FACTORS[category];
    const confidence = calculateItemConfidence({
      aliasQuality: wasOcrCorrected ? 0.9 : 1,
      hasCategory: true,
      hasQuantity: true,
      priceCount: prices.length,
      wasOcrCorrected,
    });

    items.push({
      productId: match.product.id,
      productName: match.product.name,
      category,
      quantity,
      unitPrice: prices[0],
      totalPrice: prices[1],
      breadFactor,
      breadEquivalent: quantity * breadFactor,
      confidence,
      warnings: itemWarnings,
      evidence: {
        lineNumber: index + 1,
        rawLine,
        normalizedLine,
        matchedAlias: match.alias,
        categorySource: inlineCategory ? "inline" : "header",
      },
    });
    warnings.push(...itemWarnings);
  });

  if (items.length === 0) {
    warnings.push("Nenhum item de cardápio foi reconhecido no relatório.");
  }

  return {
    success: items.length > 0,
    items,
    warnings: [...new Set(warnings)],
    evidence: {
      totalLines: rawLines.filter((line) => line.trim()).length,
      candidateLines,
      matchedLines: items.length,
      rejectedLines,
    },
  };
}
