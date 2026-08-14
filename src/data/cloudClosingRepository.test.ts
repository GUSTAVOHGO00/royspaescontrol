import { expect, it, vi } from "vitest";
import { createCloudClosingRepository } from "./cloudClosingRepository";
import { DuplicateClosingError } from "./closingRepository";

it("submits raw values without client-derived reconciliation", async()=>{
 const rpc=vi.fn().mockResolvedValue({data:{closingId:"id",protocol:"ROY-1",difference:-3,alertLevel:"attention",submissionState:"awaiting_justification",submittedAt:"2026-08-11T00:00:00Z"},error:null});
 const repo=createCloudClosingRepository({rpc} as never);
 await repo.submitClosing({idempotencyKey:"key",employeeId:"employee",businessDate:"2026-08-11",shift:"Noite",counts:{},report:{}} as never);
 expect(rpc).toHaveBeenCalledWith("submit_store_closing",{payload:expect.not.objectContaining({physical:expect.anything(),system:expect.anything(),difference:expect.anything()})});
});

it("translates the database duplicate constraint into the operational duplicate error", async () => {
 const rpc = vi.fn().mockResolvedValue({
  data: null,
  error: { code: "23505", message: 'duplicate key value violates unique constraint "roys_closings_one_original_per_shift"' },
 });
 const repo = createCloudClosingRepository({ rpc } as never);
 await expect(repo.submitClosing({} as never)).rejects.toBeInstanceOf(DuplicateClosingError);
});