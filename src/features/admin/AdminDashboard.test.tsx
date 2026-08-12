import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { StoredClosing } from "../../data/models";
import { AdminDashboard } from "./AdminDashboard";

function record(
  id: string,
  difference: number,
  unit = "Shopping da Ilha",
): StoredClosing {
  return {
    id,
    revision: 1,
    catalogVersion: "V5",
    date: "2026-07-10",
    shift: "Noite",
    unit,
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
    justification: difference === 0 ? "" : "Teste operacional",
    createdAt: `2026-07-10T10:00:00.000Z`,
  };
}

describe("AdminDashboard", () => {
  it("uses only real records in its monthly indicators", () => {
    render(
      <AdminDashboard
        records={[record("zero", 0), record("positive", 2, "Shopping Rio Anil")]}
        onBack={vi.fn()}
        onCorrect={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.getByTestId("admin-total")).toHaveTextContent("2");
    expect(screen.getByTestId("admin-matched")).toHaveTextContent("1");
    expect(screen.getByTestId("admin-positive")).toHaveTextContent("1");
  });

  it("lets the administrator start a versioned correction", () => {
    const original = record("original", -2);
    const onCorrect = vi.fn();
    render(
      <AdminDashboard
        records={[original]}
        onBack={vi.fn()}
        onCorrect={onCorrect}
        onLogout={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /^fechamentos$/i }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /criar correção administrativa/i,
      }),
    );

    expect(onCorrect).toHaveBeenCalledWith(original);
  });
});
