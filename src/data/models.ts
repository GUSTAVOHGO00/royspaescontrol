import type { ParsedReportItem } from "../import/reportParser";

export type ClosingStep = "identity" | "physical" | "report" | "review";
export type ClosingStatus = "balanced" | "attention" | "critical";
export type CountKey = "opening" | "produced" | "waste" | "courtesy" | "leftover";

export interface BreadCount {
  q30: number;
  q15: number;
}

export type ClosingCounts = Record<CountKey, BreadCount>;

export interface StoredDocument {
  name: string;
  type: string;
  size: number;
  blob: Blob;
  source?: "pdf-text" | "pdf-ocr" | "pdf-mixed" | "image-ocr";
  pageCount?: number;
  ocrConfidence?: number;
  warnings: string[];
}

export interface ClosingDraft {
  id: "active";
  closingId: string;
  revision: number;
  correctsId?: string;
  step: ClosingStep;
  responsible: string;
  employeeId?: string;
  unit: string;
  shift: string;
  date: string;
  counts: ClosingCounts;
  report: Record<string, number>;
  reportMode: "file" | "manual";
  documentName: string;
  document?: StoredDocument;
  parsedItems: ParsedReportItem[];
  reviewConfirmed: boolean;
  justification: string;
  updatedAt: string;
}

export interface StoredClosing {
  id: string;
  revision: number;
  correctsId?: string;
  catalogVersion: "V5" | "V2-LEGACY";
  date: string;
  shift: string;
  unit: string;
  responsible: string;
  createdByRole: "employee" | "admin";
  counts: ClosingCounts;
  report: Record<string, number>;
  reportMode: "file" | "manual";
  parsedItems: ParsedReportItem[];
  document?: StoredDocument;
  physical: number;
  system: number;
  difference: number;
  status: ClosingStatus;
  justification: string;
  migrationWarning?: string;
  createdAt: string;
}
