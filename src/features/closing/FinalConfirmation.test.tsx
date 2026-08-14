import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FinalConfirmation } from "./FinalConfirmation";

describe("FinalConfirmation", () => {
  it("requires an explicit definitive confirmation", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <FinalConfirmation
        open
        saving={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: /finalizar definitivamente/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/somente um administrador poderá criar uma correção/i),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: /voltar e revisar/i }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not render while closed", () => {
    render(
      <FinalConfirmation
        open={false}
        saving={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
