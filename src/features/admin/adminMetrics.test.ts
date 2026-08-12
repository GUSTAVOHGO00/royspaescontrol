import { describe, expect, it } from "vitest";

import type { StoredClosing } from "../../data/models";
import {
  dailyWorstSeries,
  effectiveClosings,
  filterClosings,
  monthlyMetrics,
} from "./adminMetrics";

function closing(
  id: string,
  difference: number,
  overrides: Partial<StoredClosing> = {},
): StoredClosing {
  return {
    id,
    revision: 1,
    catalogVersion: "V5",
    date: "2026-07-10",
    shift: "Noite",
    unit: "Shopping da Ilha",
    responsible: "Ana",
    createdByRole: "employee",
    counts: {
      opening: { q30: 0, q15: 0 },
      produced: { q30: 0, q15: 0 },
      waste: { q30: 0, q15: 0 },
      courtesy: { q30: 0, q15: 0 },
      leftover: { q30: 0, q15: 0 },
    },
    report: {},
    reportMode: "manual",
    parsedItems: [],
    physical: 10,
    system: 10 + difference,
    difference,
    status:
      difference === 0
        ? "balanced"
        : Math.abs(difference) >= 5
          ? "critical"
          : "attention",
    justification: difference === 0 ? "" : "Teste operacional",
    createdAt: `2026-07-10T10:00:00.000Z`,
    ...overrides,
  };
}

describe("admin metrics", () => {
  it("replaces an original with its latest correction without deleting it", () => {
    const original = closing("original", -5);
    const correction1 = closing("correction-1", -2, {
      correctsId: original.id,
      revision: 2,
      createdByRole: "admin",
    });
    const correction2 = closing("correction-2", 0, {
      correctsId: correction1.id,
      revision: 3,
      createdByRole: "admin",
    });

    expect(effectiveClosings([original, correction1, correction2])).toEqual([
      correction2,
    ]);
  });

  it("counts only exact zero as matched and keeps positive and negative apart", () => {
    const records = [closing("zero", 0), closing("positive", 0.5), closing("negative", -0.5)];

    expect(monthlyMetrics(records)).toMatchObject({
      total: 3,
      matched: 1,
      matchedRate: 100 / 3,
      positive: 1,
      negative: 1,
    });
  });

  it("filters by month, unit and shift", () => {
    const records = [
      closing("july-island-night", 0),
      closing("august-island-night", 0, { date: "2026-08-01" }),
      closing("july-rio-night", 0, { unit: "Shopping Rio Anil" }),
      closing("july-island-day", 0, { shift: "Tarde" }),
    ];

    expect(
      filterClosings(records, {
        month: "2026-07",
        unit: "Shopping da Ilha",
        shift: "Noite",
      }).map((record) => record.id),
    ).toEqual(["july-island-night"]);
  });

  it("uses the worst absolute divergence as the day representative", () => {
    const records = [
      closing("matched", 0),
      closing("positive", 2),
      closing("negative", -8),
    ];

    expect(dailyWorstSeries(records)).toEqual([
      expect.objectContaining({ id: "negative", difference: -8 }),
    ]);
  });
});
