export interface ReportReadinessInput {
  mode: "file" | "manual";
  documentName: string;
  parsedItemCount: number;
  systemEquivalent: number;
  reviewConfirmed: boolean;
}

export function canReviewReport(input: ReportReadinessInput): boolean {
  if (input.mode === "file") {
    return (
      Boolean(input.documentName) &&
      input.parsedItemCount > 0 &&
      input.reviewConfirmed
    );
  }

  return input.systemEquivalent > 0;
}