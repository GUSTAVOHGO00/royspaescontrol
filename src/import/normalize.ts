const OCR_LETTER_CORRECTIONS: Readonly<Record<string, string>> = {
  "0": "O",
  "1": "I",
};

function correctOcrWord(word: string): string {
  if (!/[A-ZÀ-ÖØ-Ý]/i.test(word)) return word;

  return word.replace(/[01]/g, (character) => OCR_LETTER_CORRECTIONS[character]);
}

export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .split(/\s+/)
    .map(correctOcrWord)
    .join(" ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeReportText(value: string): string[] {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

export function parseBrazilianNumber(value: string): number | null {
  const compact = value
    .toUpperCase()
    .replace(/R\$/g, "")
    .replace(/O(?=\s*$)/g, "0")
    .replace(/\s+/g, "")
    .trim();

  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$/.test(compact) &&
      !/^\d+(?:[.,]\d+)?$/.test(compact)) {
    return null;
  }

  let normalized = compact;
  if (compact.includes(",")) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
