import { describe, expect, it } from "vitest";

import { parseReport } from "./reportParser";

describe("parseReport special operational sections", () => {
  it("parses Roy's Essential and Offers as different sections", () => {
    const result = parseReport(`
      4. PROMOÇÕES
      Roy's Essential 1 2 25,90 51,80
      Roy's Essential 2 1 32,90 32,90
      7. OFERTAS ROYS
      Trio Mix 1 59,90 59,90
      Big King 2 69,90 139,80
    `);

    expect(
      result.items.map((item) => [
        item.category,
        item.quantity,
        item.breadEquivalent,
      ]),
    ).toEqual([
      ["essential-1", 2, 1],
      ["essential-2", 1, 1],
      ["trio-mix", 1, 1.5],
      ["big-king", 2, 4],
    ]);
  });

  it("does not accept an offer item inside the Essential section", () => {
    const result = parseReport(`
      ROY'S ESSENTIAL
      Trio Mix 1 59,90 59,90
    `);

    expect(result.items).toEqual([]);
    expect(result.evidence.rejectedLines).toEqual([
      "Trio Mix 1 59,90 59,90",
    ]);
  });
});
