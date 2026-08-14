import { describe, expect, it, vi } from "vitest";

import { resolveClosingEmployeeId } from "./resolveClosingEmployee";

describe("resolveClosingEmployeeId", () => {
  it("recovers the employee id by name for drafts created before employeeId was persisted", async () => {
    const listActiveEmployees = vi.fn().mockResolvedValue([
      { id: "employee-uuid", unitId: "unit-uuid", name: "Rosiane", active: true, source: "admin" },
    ]);

    await expect(resolveClosingEmployeeId({
      employeeId: "",
      responsible: "  rosiane ",
      unitId: "unit-uuid",
      listActiveEmployees,
    })).resolves.toBe("employee-uuid");

    expect(listActiveEmployees).toHaveBeenCalledWith("unit-uuid");
  });
});
