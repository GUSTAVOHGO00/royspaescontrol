import { describe, expect, it, vi } from "vitest";
import { createUnitRepository } from "./unitRepository";

describe("unit repository", () => {
  it("invokes protected credential creation", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { username: "roys.ilha" }, error: null });
    const repository = createUnitRepository({ functions: { invoke } } as never);
    await repository.createStoreAccess({ unitId: "unit-1", username: "roys.ilha", password: "SenhaSegura123" });
    expect(invoke).toHaveBeenCalledWith("admin-store-users", { body: { action: "create", unitId: "unit-1", username: "roys.ilha", password: "SenhaSegura123" } });
  });
});
