import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";

import {
  DuplicateClosingError,
  createClosingRepository,
} from "./closingRepository";
import type { StoredClosing } from "./models";

const databaseName = "roys-paes-v2-duplicate-test";

function record(
  id: string,
  overrides: Partial<StoredClosing> = {},
): StoredClosing {
  return {
    id,
    revision: 1,
    catalogVersion: "V5",
    createdByRole: "employee",
    date: "2026-07-30",
    shift: "Noite",
    unit: "Shopping da Ilha",
    responsible: "Ana",
    counts: {
      opening: { q30: 0, q15: 0 },
      produced: { q30: 10, q15: 0 },
      waste: { q30: 0, q15: 0 },
      courtesy: { q30: 0, q15: 0 },
      leftover: { q30: 0, q15: 0 },
    },
    report: { super: 10 },
    reportMode: "manual",
    parsedItems: [],
    physical: 10,
    system: 10,
    difference: 0,
    status: "balanced",
    justification: "",
    createdAt: "2026-07-30T23:00:00.000Z",
    ...overrides,
  };
}

describe("unicidade do fechamento operacional", () => {
  afterEach(async () => {
    await indexedDB.deleteDatabase(databaseName);
  });

  it("bloqueia um segundo original da mesma data, unidade e turno", async () => {
    const repository = createClosingRepository(databaseName);
    await repository.finalize(record("original"));

    await expect(
      repository.finalize(
        record("tentativa-duplicada", {
          responsible: "Outra pessoa",
          report: { super: 12 },
        }),
      ),
    ).rejects.toBeInstanceOf(DuplicateClosingError);

    expect(await repository.list()).toHaveLength(1);
    repository.close();
  });

  it("permite ao administrador criar uma revisão do fechamento", async () => {
    const repository = createClosingRepository(databaseName);
    await repository.finalize(record("original"));

    await expect(
      repository.finalize(
        record("revisao", {
          revision: 2,
          correctsId: "original",
          createdByRole: "admin",
        }),
      ),
    ).resolves.toBe("created");

    expect(await repository.list()).toHaveLength(2);
    repository.close();
  });
});
