import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "./App";
import { closingRepository } from "./data/closingRepository";

describe("employee definitive finalization", () => {
  beforeEach(async () => {
    await closingRepository.clearDraft();
  });

  it("does not persist before the employee confirms the irreversible action", async () => {
    const before = (await closingRepository.list()).length;
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
    fireEvent.change(screen.getByRole("textbox", { name: /o que aconteceu/i }), {
      target: { value: "Teste operacional" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /finalizar fechamento/i }),
    );
    expect(
      screen.getByRole("dialog", { name: /finalizar definitivamente/i }),
    ).toBeVisible();
    expect(await closingRepository.list()).toHaveLength(before);

    fireEvent.click(
      screen.getByRole("button", {
        name: /sim, finalizar definitivamente/i,
      }),
    );

    expect(
      await screen.findByRole("button", { name: /voltar ao início/i }),
    ).toBeInTheDocument();
    expect(await closingRepository.list()).toHaveLength(before + 1);
  });
});
