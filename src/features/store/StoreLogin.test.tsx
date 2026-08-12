import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { StoreLogin } from "./StoreLogin";

it("logs a store in with username and password", async () => {
  const onLogin = vi.fn().mockResolvedValue(undefined);
  render(<StoreLogin onLogin={onLogin} />);
  fireEvent.change(screen.getByLabelText(/login da loja/i), { target: { value: "roys.ilha" } });
  fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "SenhaSegura123" } });
  fireEvent.click(screen.getByRole("button", { name: /entrar para fechar/i }));
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith("roys.ilha", "SenhaSegura123"));
});
