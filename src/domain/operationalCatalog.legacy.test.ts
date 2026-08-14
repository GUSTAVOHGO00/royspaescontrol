import { describe, expect, it } from "vitest";

import {
  calculateReportEquivalent,
  normalizeOperationalReport,
} from "./operationalCatalog";

describe("compatibilidade do catálogo legado", () => {
  it("preserva combos salvos com as chaves antigas", () => {
    const legacy = {
      comboSmart: 4,
      comboSuper: 3,
    };

    expect(normalizeOperationalReport(legacy)).toMatchObject({
      "combo-smart": 4,
      "combo-super": 3,
    });
    expect(calculateReportEquivalent(legacy)).toBe(5);
  });

  it("prioriza a chave canônica quando o registro contém também um alias", () => {
    expect(
      calculateReportEquivalent({
        "combo-smart": 2,
        comboSmart: 99,
      }),
    ).toBe(1);
  });
});
