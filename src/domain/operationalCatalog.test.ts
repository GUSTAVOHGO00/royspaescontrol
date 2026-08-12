import { describe, expect, it } from "vitest";

import {
  OPERATIONAL_REPORT_GROUPS,
  calculateReportEquivalent,
} from "./operationalCatalog";

describe("operational catalog", () => {
  it("keeps Roy's Essential separate from offers", () => {
    expect(
      OPERATIONAL_REPORT_GROUPS.find((group) => group.id === "essential")?.items,
    ).toEqual(["essential-1", "essential-2"]);

    expect(
      OPERATIONAL_REPORT_GROUPS.find((group) => group.id === "offers")?.items,
    ).toEqual([
      "double-smash",
      "crispy-lover",
      "trio-mix",
      "big-king",
      "mega-mix",
    ]);
  });

  it("calculates factors 0.5, 1, 1.5 and 2", () => {
    expect(
      calculateReportEquivalent({
        "essential-1": 2,
        "essential-2": 1,
        "trio-mix": 1,
        "big-king": 1,
      }),
    ).toBe(5.5);
  });
});
