import Dexie from "dexie";
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { ClosingDraft, StoredClosing } from "./models";
import { createClosingRepository } from "./closingRepository";

const databaseName = "roys-paes-v2-audit-test";

const counts = {
  opening: { q30: 10, q15: 0 },
  produced: { q30: 10, q15: 0 },
  waste: { q30: 0, q15: 0 },
  courtesy: { q30: 0, q15: 0 },
  leftover: { q30: 2, q15: 0 }
};

const closing: StoredClosing = {
  id: "closing-fixed",
  revision: 1,
  catalogVersion: "V5",
  createdByRole: "employee",
  date: "2026-07-30",
  shift: "Noite",
  unit: "Shopping da Ilha",
  responsible: "Ana",
  counts,
  report: { super: 18 },
  reportMode: "manual",
  parsedItems: [],
  physical: 18,
  system: 18,
  difference: 0,
  status: "balanced",
  justification: "",
  createdAt: "2026-07-30T23:00:00.000Z"
};

describe("closingRepository auditável", () => {
  afterEach(async () => {
    await indexedDB.deleteDatabase(databaseName);
  });

  it("salva o rascunho e permite retomá-lo", async () => {
    const repository = createClosingRepository(databaseName);
    const draft: ClosingDraft = {
      id: "active",
      closingId: "closing-fixed",
      revision: 1,
      step: "physical",
      responsible: "Ana",
      unit: "Shopping da Ilha",
      shift: "Noite",
      date: "2026-07-30",
      counts,
      report: {},
      reportMode: "file",
      documentName: "",
      parsedItems: [],
      reviewConfirmed: false,
      justification: "",
      updatedAt: "2026-07-30T22:00:00.000Z"
    };

    await repository.saveDraft(draft);
    expect(await repository.getDraft()).toEqual(draft);
    await repository.clearDraft();
    expect(await repository.getDraft()).toBeUndefined();
    repository.close();
  });

  it("não sobrescreve um fechamento já finalizado", async () => {
    const repository = createClosingRepository(databaseName);
    expect(await repository.save(closing)).toBe("created");
    expect(
      await repository.save({ ...closing, responsible: "Pessoa alterada" })
    ).toBe("existing");
    expect((await repository.get(closing.id))?.responsible).toBe("Ana");
    repository.close();
  });
  it("finaliza fechamento e remove o rascunho na mesma transação", async () => {
    const repository = createClosingRepository(databaseName);
    await repository.saveDraft({
      id: "active",
      closingId: closing.id,
      revision: 1,
      step: "review",
      responsible: "Ana",
      unit: "Shopping da Ilha",
      shift: "Noite",
      date: "2026-07-30",
      counts,
      report: { super: 18 },
      reportMode: "manual",
      documentName: "",
      parsedItems: [],
      reviewConfirmed: false,
      justification: "",
      updatedAt: "2026-07-30T22:00:00.000Z"
    });

    expect(await repository.finalize(closing)).toBe("created");
    expect(await repository.get(closing.id)).toEqual(closing);
    expect(await repository.getDraft()).toBeUndefined();
    repository.close();
  });
  it("migra registros do schema v1 sem quebrar o histórico", async () => {
    const legacy = new Dexie(databaseName);
    legacy.version(1).stores({
      closings: "id, createdAt, date, unit, status"
    });
    await legacy.table("closings").add({
      id: "legacy-1",
      date: "2026-07-29",
      shift: "Noite",
      unit: "Shopping da Ilha",
      responsible: "Bia",
      physical: 4,
      system: 3.5,
      difference: -0.5,
      status: "attention",
      createdAt: "2026-07-29T23:00:00.000Z"
    });
    legacy.close();

    const repository = createClosingRepository(databaseName);
    const migrated = (await repository.list())[0];
    expect(migrated.catalogVersion).toBe("V2-LEGACY");
    expect(migrated.revision).toBe(1);
    expect(migrated.counts.opening).toEqual({ q30: 0, q15: 0 });
    expect(migrated.migrationWarning).toMatch(/migrado/i);
    repository.close();
  });
});
