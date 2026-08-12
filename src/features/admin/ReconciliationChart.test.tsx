import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { StoredClosing } from "../../data/models";
import { ReconciliationChart } from "./ReconciliationChart";

function record(
  id: string,
  date: string,
  difference: number,
): StoredClosing {
  return {
    id,
    revision: 1,
    catalogVersion: "V5",
    date,
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
    status: difference === 0 ? "balanced" : "attention",
    justification: difference === 0 ? "" : "Teste",
    createdAt: `${date}T10:00:00.000Z`,
  };
}

describe("ReconciliationChart", () => {
  const records = [
    record("zero", "2026-07-01", 0),
    record("positive", "2026-07-02", 4),
    record("negative", "2026-07-03", -3),
  ];

  it("starts with no selection and applies the approved bar colors", () => {
    render(<ReconciliationChart records={records} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /diferença zero.*01\/07/i }),
    ).toHaveClass("matched");
    expect(
      screen.getByRole("button", { name: /diferença positiva.*02\/07/i }),
    ).toHaveClass("positive");
    expect(
      screen.getByRole("button", { name: /diferença negativa.*03\/07/i }),
    ).toHaveClass("negative");
  });

  it("opens the value on click and toggles the same day closed", () => {
    render(<ReconciliationChart records={records} />);
    const positive = screen.getByRole("button", {
      name: /diferença positiva.*02\/07/i,
    });

    fireEvent.click(positive);
    expect(screen.getByRole("status")).toHaveTextContent("4");
    expect(screen.getByRole("status")).toHaveTextContent(/não bateu/i);

    fireEvent.click(positive);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
