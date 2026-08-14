import { OFFICIAL_V5_CATALOG } from "../domain/catalog";
import {
  OPERATIONAL_REPORT_ITEMS,
  findOperationalItem,
  type OperationalItemId,
  type OperationalSection,
} from "../domain/operationalCatalog";
import { calculateItemConfidence } from "./confidence";
import { normalizeForMatch, parseBrazilianNumber } from "./normalize";

export type ReportCategory = OperationalItemId;
type ReportSection = ReportCategory | OperationalSection;

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

const REGULAR_PRODUCTS = OFFICIAL_V5_CATALOG;
const SPECIAL_ITEMS = OPERATIONAL_REPORT_ITEMS.filter(
  (item) => item.section !== "regular" || item.id === "integrator",
);

const PRICE_PATTERN =
  /(?:R\$\s*)?([0-9O]{1,3}(?:\.[0-9O]{3})+(?:,[0-9O]{2})|[0-9O]+(?:[.,][0-9O]{2}))/gi;

function findRegularCategory(value: string): ReportCategory | null {
  if (/\bCOMBO\s+SMART\b/.test(value)) return "combo-smart";
  if (/\bCOMBO\s+SUPER\b/.test(value)) return "combo-super";
  if (/\bSMART\b/.test(value)) return "smart";
  if (/\bSUPER\b/.test(value)) return "super";
  if (/\bINTEGRADOR(?:\s+PADRAO)?\b/.test(value)) return "integrator";
  return null;
}

function findSectionHeader(normalizedLine: string): ReportSection | null {
  const header = normalizedLine
    .replace(/^\d{1,2}\s+/, "")
    .replace(/\b(?:VENDAS|CATEGORIA)\b/g, "")
    .trim();

  if (
    /^(?:ROY(?:S| S)\s+)?ESSENTIA?L(?:\s+ROYS)?$/.test(header) ||
    /^(?:ROY(?:S| S)\s+)?ESSENCIAL(?:\s+ROYS)?$/.test(header) ||
    /^PROMOCOES?$/.test(header)
  ) {
    return "essential";
  }

  if (
    /^(?:OFERTAS?)(?:\s+(?:ROYS|ESPECIAIS))?$/.test(header) ||
    /^OFERTAS?\s+ESPECIAIS\s+ROYS$/.test(header)
  ) {
    return "offers";
  }

  const category = findRegularCategory(header);
  const withoutHeadingWords = header
    .replace(/\b(?:SANDUICHES|SANDWICHES)\b/g, "")
    .trim();

  if (
    category &&
    /^(?:COMBO )?(?:SMART|SUPER)$|^INTEGRADOR(?: PADRAO)?$/.test(
      withoutHeadingWords,
    )
  ) {
    return category;
  }

  return null;
}

function findRegularProduct(
  normalizedLine: string,
): {
  product: (typeof REGULAR_PRODUCTS)[number];
  alias: string;
} | null {
  let bestMatch: {
    product: (typeof REGULAR_PRODUCTS)[number];
    alias: string;
  } | null = null;

  for (const product of REGULAR_PRODUCTS) {
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

function findSpecialItem(normalizedLine: string) {
  let bestMatch: {
    item: (typeof SPECIAL_ITEMS)[number];
    alias: string;
  } | null = null;

  for (const item of SPECIAL_ITEMS) {
    for (const alias of item.aliases) {
      const normalizedAlias = normalizeForMatch(alias);
      const pattern = new RegExp(`(?:^|\\s)${normalizedAlias}(?:\\s|$)`);
      if (
        pattern.test(normalizedLine) &&
        (!bestMatch || normalizedAlias.length > bestMatch.alias.length)
      ) {
        bestMatch = { item, alias: normalizedAlias };
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

function sectionAcceptsItem(
  activeSection: ReportSection | null,
  itemSection: OperationalSection,
): boolean {
  if (activeSection === null) return true;
  if (itemSection === "essential") return activeSection === "essential";
  if (itemSection === "offers") return activeSection === "offers";
  return (
    activeSection === "regular" ||
    activeSection === "integrator" ||
    activeSection === "smart" ||
    activeSection === "super" ||
    activeSection === "combo-smart" ||
    activeSection === "combo-super"
  );
}

export function parseReport(reportText: string): ReportParseResult {
  const warnings: string[] = [];
  const rejectedLines: string[] = [];
  const items: ParsedReportItem[] = [];
  let activeSection: ReportSection | null = null;
  let candidateLines = 0;

  const rawLines = reportText.replace(/\r\n?/g, "\n").split("\n");

  rawLines.forEach((untrimmedLine, index) => {
    const rawLine = untrimmedLine.trim().replace(/\s+/g, " ");
    if (!rawLine) return;

    const normalizedLine = normalizeForMatch(rawLine);
    const sectionHeader = findSectionHeader(normalizedLine);
    if (sectionHeader) {
      activeSection = sectionHeader;
      return;
    }

    const specialMatch = findSpecialItem(normalizedLine);
    if (specialMatch) {
      candidateLines += 1;
      const { item, alias } = specialMatch;

      if (!sectionAcceptsItem(activeSection, item.section)) {
        rejectedLines.push(rawLine);
        warnings.push(
          `"${item.label}" apareceu fora da seção ${item.section === "essential" ? "Roy's Essential" : "Ofertas"}.`,
        );
        return;
      }

      const { prices, firstPriceIndex } = extractPrices(rawLine);
      const quantity = extractQuantity(rawLine, firstPriceIndex);
      if (quantity === null || prices.length === 0) {
        rejectedLines.push(rawLine);
        if (quantity === null) {
          warnings.push(`Quantidade não reconhecida: "${rawLine}".`);
        }
        if (prices.length === 0) {
          warnings.push(`Preço não reconhecido: "${rawLine}".`);
        }
        return;
      }

      const wasOcrCorrected = containsOcrCorrections(rawLine);
      const itemWarnings =
        prices.length === 1
          ? [`A linha ${index + 1} contém somente um preço.`]
          : [];
      const confidence = calculateItemConfidence({
        aliasQuality: wasOcrCorrected ? 0.9 : 1,
        hasCategory: true,
        hasQuantity: true,
        priceCount: prices.length,
        wasOcrCorrected,
      });

      items.push({
        productId: item.id,
        productName: item.label,
        category: item.id,
        quantity,
        unitPrice: prices[0],
        totalPrice: prices[1],
        breadFactor: item.breadFactor,
        breadEquivalent: quantity * item.breadFactor,
        confidence,
        warnings: itemWarnings,
        evidence: {
          lineNumber: index + 1,
          rawLine,
          normalizedLine,
          matchedAlias: alias,
          categorySource: activeSection ? "header" : "inline",
        },
      });
      warnings.push(...itemWarnings);
      return;
    }

    const regularMatch = findRegularProduct(normalizedLine);
    if (!regularMatch) return;
    candidateLines += 1;

    const inlineCategory = findRegularCategory(normalizedLine);
    const category = inlineCategory ?? activeSection;
    const validRegularCategory =
      category === "smart" ||
      category === "super" ||
      category === "combo-smart" ||
      category === "combo-super";
    const { prices, firstPriceIndex } = extractPrices(rawLine);
    const quantity = extractQuantity(rawLine, firstPriceIndex);

    if (!validRegularCategory || quantity === null || prices.length === 0) {
      rejectedLines.push(rawLine);
      if (!validRegularCategory) {
        warnings.push(`Categoria não reconhecida: "${rawLine}".`);
      }
      if (quantity === null) {
        warnings.push(`Quantidade não reconhecida: "${rawLine}".`);
      }
      if (prices.length === 0) {
        warnings.push(`Preço não reconhecido: "${rawLine}".`);
      }
      return;
    }

    const item = findOperationalItem(category);
    if (!item) {
      rejectedLines.push(rawLine);
      warnings.push(`Categoria não reconhecida: "${rawLine}".`);
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

    const confidence = calculateItemConfidence({
      aliasQuality: wasOcrCorrected ? 0.9 : 1,
      hasCategory: true,
      hasQuantity: true,
      priceCount: prices.length,
      wasOcrCorrected,
    });

    items.push({
      productId: regularMatch.product.id,
      productName: regularMatch.product.name,
      category,
      quantity,
      unitPrice: prices[0],
      totalPrice: prices[1],
      breadFactor: item.breadFactor,
      breadEquivalent: quantity * item.breadFactor,
      confidence,
      warnings: itemWarnings,
      evidence: {
        lineNumber: index + 1,
        rawLine,
        normalizedLine,
        matchedAlias: regularMatch.alias,
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
