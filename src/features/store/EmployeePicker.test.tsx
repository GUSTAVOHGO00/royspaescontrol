import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { EmployeePicker } from "./EmployeePicker";

it("lists employees and registers a missing name", async () => {
  const onSelect = vi.fn();
  const repository = {
    listActiveEmployees: vi.fn().mockResolvedValue([{ id: "ana", unitId: "ilha", name: "Ana", active: true, source: "admin" }]),
    createEmployee: vi.fn().mockResolvedValue({ id: "bia", unitId: "ilha", name: "Beatriz", active: true, source: "store" }),
  };
  render(<EmployeePicker unit={{ id: "ilha", name: "Shopping da Ilha", active: true }} selectedId="" onSelect={onSelect} repository={repository} />);
  expect(await screen.findByRole("option", { name: "Ana" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /cadastrar funcionário/i }));
  fireEvent.change(screen.getByLabelText(/nome do funcionário/i), { target: { value: "Beatriz" } });
  fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Beatriz" })));
});
