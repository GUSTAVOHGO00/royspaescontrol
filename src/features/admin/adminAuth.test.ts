import { beforeEach, describe, expect, it } from "vitest";

import {
  ADMIN_AUTH_STORAGE_KEY,
  authenticateAdmin,
  configureAdminPassword,
  endAdminSession,
  getAdminSession,
  hasAdminPassword,
} from "./adminAuth";

describe("local administrator authentication", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores only a salted derived hash and creates a time-limited session", async () => {
    await configureAdminPassword("senha-segura");

    const stored = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    expect(stored).not.toContain("senha-segura");
    expect(stored).toContain('"algorithm":"PBKDF2-SHA256"');
    expect(hasAdminPassword()).toBe(true);

    await expect(authenticateAdmin("senha-segura")).resolves.toMatchObject({
      ok: true,
    });
    expect(getAdminSession()).toMatchObject({ authenticated: true });

    endAdminSession();
    expect(getAdminSession()).toBeNull();
  });

  it("locks access for five minutes after five failures", async () => {
    await configureAdminPassword("senha-segura");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await authenticateAdmin("errada");
    }

    await expect(authenticateAdmin("senha-segura")).resolves.toMatchObject({
      ok: false,
      reason: "locked",
    });
  });

  it("rejects weak initial passwords", async () => {
    await expect(configureAdminPassword("123")).rejects.toThrow(
      /pelo menos 8 caracteres/i,
    );
    expect(hasAdminPassword()).toBe(false);
  });
});
