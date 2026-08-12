import type { TextContent } from "pdfjs-dist/types/src/display/api";
import { parseReport, type ParsedReportItem } from "./reportParser";

export type DocumentKind = "pdf" | "image" | "unsupported";
export type ExtractionSource = "pdf-text" | "pdf-ocr" | "pdf-mixed" | "image-ocr";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_OCR_PAGES = 8;

export interface DocumentExtraction {
  text: string;
  source: ExtractionSource;
  pageCount: number;
  ocrConfidence?: number;
  warnings: string[];
}

export type ExtractionProgress = (message: string, progress: number) => void;

export function classifyDocument(mimeType: string, fileName = ""): DocumentKind {
  const extension = fileName.toLowerCase();
  if (mimeType === "application/pdf" || extension.endsWith(".pdf")) return "pdf";
  if (
    mimeType.startsWith("image/") ||
    /\.(?:jpe?g|png|webp|bmp|tiff?)$/.test(extension)
  ) return "image";
  return "unsupported";
}

export function validateDocumentFile(file: File): void {
  if (classifyDocument(file.type, file.name) === "unsupported") {
    throw new Error("Use uma foto JPG/PNG ou um arquivo PDF.");
  }
  if (file.size === 0) throw new Error("O arquivo está vazio.");
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("O arquivo ultrapassa 15 MB. Reduza o tamanho e tente novamente.");
  }
}

export function shouldOcrPdfPage(
  pageText: string,
  recognizedItemCount?: number,
): boolean {
  const normalizedLength = pageText.replace(/\s+/g, " ").trim().length;
  if (normalizedLength < 30) return true;
  return recognizedItemCount !== undefined && recognizedItemCount === 0;
}

export function isTrustworthyExtraction(
  items: Pick<ParsedReportItem, "confidence">[],
  ocrConfidence?: number
): boolean {
  const parserIsTrustworthy =
    items.length > 0 && items.every((item) => item.confidence >= 0.7);
  const ocrIsTrustworthy = ocrConfidence === undefined || ocrConfidence >= 70;
  return parserIsTrustworthy && ocrIsTrustworthy;
}

async function prepareImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  if (Math.max(bitmap.width, bitmap.height) < 800) {
    bitmap.close();
    throw new Error("A foto está pequena demais. Aproxime a câmera e tente novamente.");
  }

  const maxSide = 2600;
  const scale = Math.min(maxSide / bitmap.width, maxSide / bitmap.height, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Não foi possível preparar a imagem.");

  context.filter = "grayscale(1) contrast(1.55) brightness(1.08)";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

function localAssetPath(relativePath: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return new URL(`${base}${relativePath}`, window.location.href).toString().replace(/\/$/, "");
}

async function recognizeCanvas(
  canvas: HTMLCanvasElement,
  onProgress: ExtractionProgress
): Promise<{ text: string; confidence: number }> {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("por", undefined, {
    workerPath: localAssetPath("tesseract/worker.min.js"),
    corePath: localAssetPath("tesseract/core"),
    langPath: localAssetPath("tessdata"),
    gzip: true,
    logger(message) {
      if (message.status === "recognizing text") {
        onProgress(
          "Lendo produtos e quantidades…",
          35 + Math.round((message.progress ?? 0) * 60)
        );
      }
    }
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1"
    });
    const result = await worker.recognize(canvas);
    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } finally {
    await worker.terminate();
  }
}

function pageTextFromContent(content: TextContent): string {
  const rows = new Map<number, { x: number; text: string }[]>();
  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const y = Math.round(item.transform[5] / 3) * 3;
    const row = rows.get(y) ?? [];
    row.push({ x: item.transform[4], text: item.str });
    rows.set(y, row);
  }
  return [...rows.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, row]) =>
      row.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ")
    )
    .join("\n");
}

async function extractPdf(
  file: File,
  onProgress: ExtractionProgress
): Promise<DocumentExtraction> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  const warnings: string[] = [];
  let ocrPages = 0;
  let textPages = 0;
  let confidenceTotal = 0;
  let skippedScannedPages = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress(
        `Lendo página ${pageNumber} de ${pdf.numPages}…`,
        8 + Math.round((pageNumber / pdf.numPages) * 25)
      );
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = pageTextFromContent(content);

      if (!shouldOcrPdfPage(pageText, parseReport(pageText).items.length)) {
        pages.push(pageText);
        textPages += 1;
        continue;
      }

      if (ocrPages >= MAX_OCR_PAGES) {
        skippedScannedPages += 1;
        continue;
      }

      onProgress(`Página ${pageNumber} é escaneada. Aplicando OCR…`, 35);
      const viewport = page.getViewport({ scale: 2.2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível renderizar o PDF.");
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const result = await recognizeCanvas(canvas, onProgress);
      pages.push(result.text);
      confidenceTotal += result.confidence;
      ocrPages += 1;
    }
  } finally {
    await loadingTask.destroy();
  }

  if (skippedScannedPages > 0) {
    warnings.push(
      `${skippedScannedPages} página(s) escaneada(s) não foram lidas: o limite é ${MAX_OCR_PAGES}.`
    );
  }

  const source: ExtractionSource =
    ocrPages === 0 ? "pdf-text" : textPages === 0 ? "pdf-ocr" : "pdf-mixed";

  return {
    text: pages.join("\n").trim(),
    source,
    pageCount: pdf.numPages,
    ocrConfidence: ocrPages > 0 ? confidenceTotal / ocrPages : undefined,
    warnings
  };
}

export async function extractDocument(
  file: File,
  onProgress: ExtractionProgress = () => undefined
): Promise<DocumentExtraction> {
  validateDocumentFile(file);
  const kind = classifyDocument(file.type, file.name);

  onProgress("Preparando arquivo…", 5);
  if (kind === "pdf") return extractPdf(file, onProgress);

  const canvas = await prepareImage(file);
  const result = await recognizeCanvas(canvas, onProgress);
  onProgress("Leitura concluída. Revise os itens.", 100);
  return {
    text: result.text,
    source: "image-ocr",
    pageCount: 1,
    ocrConfidence: result.confidence,
    warnings: []
  };
}