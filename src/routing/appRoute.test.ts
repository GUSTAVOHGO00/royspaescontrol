import { describe, expect, it } from "vitest";
import { resolveAppRoute, resolveAuthorizedRoute } from "./appRoute";

describe("app route", () => {
  it.each([
    ["/", "store"],
    ["/loja", "store"],
    ["/admin", "admin"],
    ["/recuperar-senha", "recovery"],
  ] as const)("maps %s to %s", (path, expected) => {
    expect(resolveAppRoute(path)).toBe(expected);
  });

  it("routes an authenticated administrator from the store URL to admin", () => {
    expect(resolveAuthorizedRoute("store", "admin")).toBe("admin");
  });

  it("routes an authenticated store account away from admin", () => {
    expect(resolveAuthorizedRoute("admin", "store")).toBe("store");
  });

  it("does not redirect password recovery", () => {
    expect(resolveAuthorizedRoute("recovery", "admin")).toBe("recovery");
  });});
