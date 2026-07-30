import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredClosing } from "./models";
import { createClosingRepository } from "./closingRepository";

const databaseName = "roys-paes-v2-order-test";
const emptyCounts = {
  opening: { q30: 0, q15: 0 },
  produced: { q30: 0, q15: 0 },
  waste: { q30: 0, q15: 0 },
  courtesy: { q30: 0, q15: 0 },
  leftover: { q30: 0, q15: 0 }
};

function record(id: string, createdAt: string): StoredClosing {
  return {
    id,
    revision: 1,
    catalogVersion: "V5",
    date: "2026-07-30",
    shift: "Noite",
    unit: "Shopping da Ilha",
    responsible: "Ana",
    counts: emptyCounts,
    report: { super: 1 },
    reportMode: "manual",
    parsedItems: [],
    physical: 1,
    system: 1,
    difference: 0,
    status: "balanced",
    justification: "",
    createdAt
  };
}

describe("closingRepository", () => {
  afterEach(async () => {
    await indexedDB.deleteDatabase(databaseName);
  });

  it("lista os fechamentos mais recentes primeiro", async () => {
    const repository = createClosingRepository(databaseName);
    await repository.save(record("older", "2026-07-30T22:00:00.000Z"));
    await repository.save(record("newer", "2026-07-30T23:00:00.000Z"));
    expect((await repository.list()).map((item) => item.id)).toEqual(["newer", "older"]);
    repository.close();
  });
});