import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "./App";
import { closingRepository } from "./data/closingRepository";

describe("employee blind review", () => {
  beforeEach(async () => {
    await closingRepository.clearDraft();
  });

  it("never reveals reconciliation values or status before definitive save", async () => {
    render(<App />);

    const startButton = screen.getByRole("button", {
      name: /começar fechamento/i,
    });
    await waitFor(() => expect(startButton).toBeEnabled());
    fireEvent.click(startButton);
    fireEvent.change(
      await screen.findByRole("textbox", { name: /responsável/i }),
      { target: { value: "Ana" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /^continuar/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /conferir relatório/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /digitar totais/i }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: /quantidade de subs smart/i }),
      { target: { value: "2" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /revisar fechamento/i }),
    );

    expect(screen.queryByText(/consumo físico/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/venda no sistema/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/tudo certo|atenção necessária|vale conferir/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/resultado.*somente.*área administrativa/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /finalizar fechamento/i }),
    ).toBeEnabled();
  });
});
