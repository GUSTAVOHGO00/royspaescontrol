import { describe, expect, it } from "vitest";
import { normalizeStoreUsername, storeUsernameToEmail } from "./username";

describe("store username", () => {
  it("normalizes the administrator supplied login", () => {
    expect(normalizeStoreUsername("  ROYS.Ilha  ")).toBe("roys.ilha");
  });

  it("rejects spaces and short values", () => {
    expect(() => normalizeStoreUsername("ab")).toThrow(/3 caracteres/i);
    expect(() => normalizeStoreUsername("roys ilha")).toThrow(/letras, números/i);
  });

  it("creates the invisible auth identity", () => {
    expect(storeUsernameToEmail("roys.ilha")).toBe("roys.ilha@lojas.roys.internal");
  });
});
