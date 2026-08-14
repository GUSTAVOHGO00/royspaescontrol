import Dexie, { type EntityTable } from "dexie";
import type { ClosingCounts, ClosingDraft, StoredClosing } from "./models";

export type { ClosingDraft, StoredClosing } from "./models";

export class DuplicateClosingError extends Error {
  readonly existingId: string;

  constructor(existingId: string) {
    super("Já existe um fechamento definitivo para esta data, unidade e turno.");
    this.name = "DuplicateClosingError";
    this.existingId = existingId;
  }
}

function emptyCounts(): ClosingCounts {
  return {
    opening: { q30: 0, q15: 0 },
    produced: { q30: 0, q15: 0 },
    waste: { q30: 0, q15: 0 },
    courtesy: { q30: 0, q15: 0 },
    leftover: { q30: 0, q15: 0 }
  };
}

class ClosingDatabase extends Dexie {
  closings!: EntityTable<StoredClosing, "id">;
  drafts!: EntityTable<ClosingDraft, "id">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      closings: "id, createdAt, date, unit, status"
    });
    this.version(2).stores({
      closings: "id, createdAt, date, unit, status",
      drafts: "id, updatedAt"
    });
    this.version(3)
      .stores({
        closings: "id, createdAt, date, unit, status",
        drafts: "id, updatedAt"
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<StoredClosing>("closings")
          .toCollection()
          .modify((record) => {
            record.revision ??= 1;
            record.catalogVersion ??= "V2-LEGACY";
            record.counts ??= emptyCounts();
            record.report ??= {};
            record.reportMode ??= "manual";
            record.parsedItems ??= [];
            record.justification ??= "";
            record.migrationWarning ??=
              "Registro migrado da primeira iteração V2; os detalhes que não existiam originalmente não puderam ser reconstruídos.";
          });
      });
    this.version(4)
      .stores({
        closings: "id, createdAt, date, unit, status",
        drafts: "id, updatedAt"
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<StoredClosing>("closings")
          .toCollection()
          .modify((record) => {
            record.createdByRole ??= "employee";
          });
      });
  }
}

export function createClosingRepository(name = "roys-paes-v2") {
  const database = new ClosingDatabase(name);

  return {
    async list(): Promise<StoredClosing[]> {
      return database.closings.orderBy("createdAt").reverse().toArray();
    },
    async get(id: string): Promise<StoredClosing | undefined> {
      return database.closings.get(id);
    },
    async save(record: StoredClosing): Promise<"created" | "existing"> {
      return database.transaction("rw", database.closings, async () => {
        const existing = await database.closings.get(record.id);
        if (existing) return "existing";
        await database.closings.add(record);
        return "created";
      });
    },
    async finalize(record: StoredClosing): Promise<"created" | "existing"> {
      return database.transaction(
        "rw",
        [database.closings, database.drafts],
        async () => {
          const existing = await database.closings.get(record.id);
          if (!existing && !record.correctsId) {
            const duplicate = await database.closings
              .filter(
                (candidate) =>
                  !candidate.correctsId &&
                  candidate.date === record.date &&
                  candidate.unit === record.unit &&
                  candidate.shift === record.shift,
              )
              .first();
            if (duplicate) throw new DuplicateClosingError(duplicate.id);
          }
          if (!existing) await database.closings.add(record);
          await database.drafts.delete("active");
          return existing ? "existing" : "created";
        }
      );
    },
    async getDraft(): Promise<ClosingDraft | undefined> {
      return database.drafts.get("active");
    },
    async saveDraft(draft: ClosingDraft): Promise<void> {
      await database.drafts.put(draft);
    },
    async clearDraft(): Promise<void> {
      await database.drafts.delete("active");
    },
    close(): void {
      database.close();
    }
  };
}

export const closingRepository = createClosingRepository();