import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { closingRepository } from "./data/closingRepository";
import { App } from "./App";

describe("App", () => {
  beforeEach(async () => {
    await closingRepository.clearDraft();
  });
  it("apresenta o controle de fechamento de pães", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /fechamento de pães/i })
    ).toBeInTheDocument();
  });

  it("conduz a funcionária do início até a contagem física", async () => {
    render(<App />);

    const startButton = screen.getByRole("button", { name: /começar fechamento/i });
    await waitFor(() => expect(startButton).toBeEnabled());
    fireEvent.click(startButton);
    expect(await screen.findByRole("heading", { name: /quem está fechando/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/responsável/i), {
      target: { value: "Ana" }
    });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(
      screen.getByRole("heading", { name: /movimento dos pães/i })
    ).toBeInTheDocument();
  });

  it("salva e oferece retomada do rascunho", async () => {
    const view = render(<App />);
    const startButton = screen.getByRole("button", { name: /começar fechamento/i });
    await waitFor(() => expect(startButton).toBeEnabled());
    fireEvent.click(startButton);
    await screen.findByRole("heading", { name: /quem está fechando/i });
    fireEvent.change(screen.getByLabelText(/responsável/i), {
      target: { value: "Ana" }
    });

    await waitFor(async () => {
      expect((await closingRepository.getDraft())?.responsible).toBe("Ana");
    });

    view.unmount();
    render(<App />);
    expect(
      await screen.findByRole("button", { name: /continuar rascunho/i })
    ).toBeInTheDocument();
  });
  it("finaliza uma única vez mesmo com clique repetido", async () => {
    const before = (await closingRepository.list()).length;
    render(<App />);
    const startButton = screen.getByRole("button", { name: /começar fechamento/i });
    await waitFor(() => expect(startButton).toBeEnabled());
    fireEvent.click(startButton);
    await screen.findByRole("heading", { name: /quem está fechando/i });
    fireEvent.change(screen.getByLabelText(/responsável/i), {
      target: { value: "Ana" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^continuar/i }));
    fireEvent.click(screen.getByRole("button", { name: /conferir relatório/i }));
    fireEvent.click(screen.getByRole("button", { name: /digitar totais/i }));
    fireEvent.change(screen.getByLabelText(/subs smart/i), {
      target: { value: "2" }
    });
    fireEvent.click(screen.getByRole("button", { name: /revisar fechamento/i }));
    fireEvent.change(screen.getByLabelText(/o que aconteceu/i), {
      target: { value: "Teste operacional" }
    });
    const finalizeButton = screen.getByRole("button", { name: /finalizar fechamento/i });
    fireEvent.click(finalizeButton);
    fireEvent.click(finalizeButton);
    fireEvent.click(screen.getByRole("button", { name: /sim, finalizar definitivamente/i }));

    expect(
      await screen.findByRole("button", { name: /voltar ao início/i })
    ).toBeInTheDocument();
    expect((await closingRepository.list()).length).toBe(before + 1);
  });
});
