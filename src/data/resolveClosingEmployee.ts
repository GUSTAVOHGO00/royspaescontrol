import type { Employee } from "./unitRepository";

interface ResolveClosingEmployeeInput {
  employeeId: string;
  responsible: string;
  unitId: string;
  listActiveEmployees: (unitId: string) => Promise<Employee[]>;
}

function normalizeEmployeeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export async function resolveClosingEmployeeId({
  employeeId,
  responsible,
  unitId,
  listActiveEmployees,
}: ResolveClosingEmployeeInput): Promise<string> {
  if (employeeId.trim()) return employeeId;

  const expectedName = normalizeEmployeeName(responsible);
  const employees = await listActiveEmployees(unitId);
  const match = employees.find(
    (employee) => normalizeEmployeeName(employee.name) === expectedName,
  );

  if (!match) throw new Error("Selecione novamente a funcionária responsável.");
  return match.id;
}