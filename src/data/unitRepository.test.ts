import { describe, expect, it, vi } from "vitest";
import { createUnitRepository } from "./unitRepository";

describe("unit repository", () => {
  it("invokes protected credential creation", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { username: "roys.ilha" }, error: null });
    const repository = createUnitRepository({ functions: { invoke } } as never);
    await repository.createStoreAccess({ unitId: "unit-1", username: "roys.ilha", password: "SenhaSegura123" });
    expect(invoke).toHaveBeenCalledWith("admin-store-users", { body: { action: "create", unitId: "unit-1", username: "roys.ilha", password: "SenhaSegura123" } });
  });

  it("normalizes a readable store name into a valid login", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { username: "rio-anil" }, error: null });
    const repository = createUnitRepository({ functions: { invoke } } as never);
    await repository.createStoreAccess({ unitId: "unit-rio", username: "Rio Anil", password: "SenhaSegura123" });
    expect(invoke).toHaveBeenCalledWith("admin-store-users", {
      body: { action: "create", unitId: "unit-rio", username: "rio-anil", password: "SenhaSegura123" },
    });
  });

  it("shows the error returned by the protected function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Edge Function returned a non-2xx status code", context: { json: async () => ({ error: "Login já utilizado." }) } },
    });
    const repository = createUnitRepository({ functions: { invoke } } as never);
    await expect(repository.createStoreAccess({ unitId: "unit-rio", username: "rio-anil", password: "SenhaSegura123" }))
      .rejects.toThrow("Login já utilizado.");
  });
  it("rejects a store password shorter than four characters", async () => {
    const invoke = vi.fn();
    const repository = createUnitRepository({ functions: { invoke } } as never);
    await expect(repository.createStoreAccess({ unitId: "unit-rio", username: "rio-anil", password: "123" }))
      .rejects.toThrow("A senha precisa ter pelo menos 4 caracteres.");
    expect(invoke).not.toHaveBeenCalled();
  });
  it("invokes protected credential deletion", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { deleted: true }, error: null });
    const repository = createUnitRepository({ functions: { invoke } } as never);
    await repository.deleteStoreAccess("profile-1");
    expect(invoke).toHaveBeenCalledWith("admin-store-users", { body: { action: "delete", profileId: "profile-1" } });
  });
});
