import type { StoredClosing } from "../../data/models";

export interface AdminFilters {
  month: string;
  unit: string;
  shift: string;
}

export interface MonthlyMetrics {
  total: number;
  matched: number;
  matchedRate: number;
  positive: number;
  negative: number;
  critical: number;
  waste: number;
  corrections: number;
}

function rootId(
  record: StoredClosing,
  recordsById: ReadonlyMap<string, StoredClosing>,
): string {
  const visited = new Set<string>();
  let current = record;

  while (current.correctsId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = recordsById.get(current.correctsId);
    if (!parent) return current.correctsId;
    current = parent;
  }

  return current.id;
}

function isNewer(left: StoredClosing, right: StoredClosing): boolean {
  if ((left.revision ?? 1) !== (right.revision ?? 1)) {
    return (left.revision ?? 1) > (right.revision ?? 1);
  }
  return left.createdAt > right.createdAt;
}

export function effectiveClosings(
  records: readonly StoredClosing[],
): StoredClosing[] {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const effectiveByRoot = new Map<string, StoredClosing>();

  records.forEach((record) => {
    const root = rootId(record, recordsById);
    const current = effectiveByRoot.get(root);
    if (!current || isNewer(record, current)) {
      effectiveByRoot.set(root, record);
    }
  });

  return [...effectiveByRoot.values()].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.createdAt.localeCompare(right.createdAt),
  );
}

export function filterClosings(
  records: readonly StoredClosing[],
  filters: AdminFilters,
): StoredClosing[] {
  return records.filter(
    (record) =>
      (!filters.month || record.date.startsWith(filters.month)) &&
      (filters.unit === "all" || record.unit === filters.unit) &&
      (filters.shift === "all" || record.shift === filters.shift),
  );
}

function wasteEquivalent(record: StoredClosing): number {
  const waste = record.counts?.waste ?? { q30: 0, q15: 0 };
  return waste.q30 + waste.q15 * 0.5;
}

export function monthlyMetrics(
  records: readonly StoredClosing[],
): MonthlyMetrics {
  const effective = effectiveClosings(records);
  const total = effective.length;
  const matched = effective.filter((record) => record.difference === 0).length;

  return {
    total,
    matched,
    matchedRate: total === 0 ? 0 : (matched * 100) / total,
    positive: effective.filter((record) => record.difference > 0).length,
    negative: effective.filter((record) => record.difference < 0).length,
    critical: effective.filter((record) => record.status === "critical").length,
    waste: effective.reduce(
      (sum, record) => sum + wasteEquivalent(record),
      0,
    ),
    corrections: records.filter((record) => Boolean(record.correctsId)).length,
  };
}

export function dailyWorstSeries(
  records: readonly StoredClosing[],
): StoredClosing[] {
  const byDate = new Map<string, StoredClosing>();

  effectiveClosings(records).forEach((record) => {
    const current = byDate.get(record.date);
    if (
      !current ||
      Math.abs(record.difference) > Math.abs(current.difference) ||
      (Math.abs(record.difference) === Math.abs(current.difference) &&
        isNewer(record, current))
    ) {
      byDate.set(record.date, record);
    }
  });

  return [...byDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}
