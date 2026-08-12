import { describe, expect, it } from "vitest";
import { resolveAppRoute } from "./appRoute";

describe("app route", () => {
  it.each([
    ["/", "store"],
    ["/loja", "store"],
    ["/admin", "admin"],
    ["/recuperar-senha", "recovery"],
  ] as const)("maps %s to %s", (path, expected) => {
    expect(resolveAppRoute(path)).toBe(expected);
  });
});
