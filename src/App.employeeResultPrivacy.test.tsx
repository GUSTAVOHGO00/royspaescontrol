import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "./App";
import { closingRepository } from "./data/closingRepository";
import type { StoredClosing } from "./data/models";

function privateResultFixture(): StoredClosing {
  return {
    id: crypto.randomUUID(),
    revision: 1,
    catalogVersion: "V5",
    date: "2026-07-30",
    shift: "Noite",
    unit: "Shopping da Ilha",
    responsible: "Ana",
    createdByRole: "employee",
    counts: {
      opening: { q30: 10, q15: 0 },
      produced: { q30: 0, q15: 0 },
      waste: { q30: 0, q15: 0 },
      courtesy: { q30: 0, q15: 0 },
      leftover: { q30: 0, q15: 0 },
    },
    report: { super: 7 },
    reportMode: "manual",
    parsedItems: [],
    physical: 10,
    system: 7,
    difference: -3,
    status: "critical",
    justification: "Ocorrência privada",
    createdAt: new Date().toISOString(),
  };
}

describe("employee result privacy", () => {
  beforeEach(async () => {
    await closingRepository.clearDraft();
  });

  it("does not expose status, totals, difference or export on the employee home", async () => {
    await closingRepository.save(privateResultFixture());
    render(<App />);

    expect(await screen.findByText(/fechamento enviado/i)).toBeVisible();
    expect(screen.queryByText(/consumo físico/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/venda sistema/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sem diferença/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/crítico/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /exportar csv/i }),
    ).not.toBeInTheDocument();
  });
});
