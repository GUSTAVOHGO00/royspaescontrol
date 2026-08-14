export interface ItemConfidenceSignals {
  aliasQuality: number;
  hasCategory: boolean;
  hasQuantity: boolean;
  priceCount: number;
  wasOcrCorrected: boolean;
}

export function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function calculateItemConfidence(
  signals: ItemConfidenceSignals,
): number {
  const score =
    signals.aliasQuality * 0.55 +
    (signals.hasCategory ? 0.15 : 0) +
    (signals.hasQuantity ? 0.15 : 0) +
    Math.min(signals.priceCount, 2) * 0.075 -
    (signals.wasOcrCorrected ? 0.08 : 0);

  return Number(clampConfidence(score).toFixed(2));
}
