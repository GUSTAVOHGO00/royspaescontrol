import { describe, expect, it, vi } from "vitest";
import { createAuthService } from "./authService";

describe("cloud auth", () => {
  it("uses an invisible technical identity for stores", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: {}, error: null });
    const service = createAuthService({ auth: { signInWithPassword } } as never);
    await service.signInStore("ROYS.ILHA", "SenhaSegura123");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "roys.ilha@lojas.roys.internal", password: "SenhaSegura123" });
  });

  it("sends admin recovery to the recovery route", async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null });
    const service = createAuthService({ auth: { resetPasswordForEmail } } as never);
    await service.requestAdminPasswordReset("comercial@roys.com.br", "https://roys.app");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("comercial@roys.com.br", { redirectTo: "https://roys.app/recuperar-senha" });
  });
});
