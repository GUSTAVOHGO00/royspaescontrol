import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface StoreAccessInput { unitId: string; username: string; password: string }
export interface Unit { id: string; name: string; active: boolean }
export interface Employee { id: string; unitId: string; name: string; active: boolean; source: "admin" | "store" }
export interface StoreAccess { profileId: string; unitId: string; username: string; active: boolean; lastAccessAt?: string }

function ensure<T>(data: T, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data;
}

export function createUnitRepository(client: SupabaseClient) {
  async function invoke(body: Record<string, unknown>) {
    const { data, error } = await client.functions.invoke("admin-store-users", { body });
    return ensure(data, error);
  }
  return {
    async createStoreAccess(input: StoreAccessInput) { return invoke({ action: "create", ...input }); },
    async resetStorePassword(profileId: string, password: string) { return invoke({ action: "reset-password", profileId, password }); },
    async setStoreAccessActive(profileId: string, active: boolean) { return invoke({ action: "set-active", profileId, active }); },
    async listUnits(): Promise<Unit[]> {
      const { data, error } = await client.from("roys_units").select("id,name,active").order("name");
      return ensure(data ?? [], error).map((item) => ({ id: item.id, name: item.name, active: item.active }));
    },
    async listActiveEmployees(unitId: string): Promise<Employee[]> {
      const { data, error } = await client.from("roys_employees").select("id,unit_id,name,active,source").eq("unit_id", unitId).eq("active", true).order("name");
      return ensure(data ?? [], error).map((item) => ({ id: item.id, unitId: item.unit_id, name: item.name, active: item.active, source: item.source }));
    },
    async listEmployees(unitId: string): Promise<Employee[]> {
      const { data, error } = await client.from("roys_employees").select("id,unit_id,name,active,source").eq("unit_id", unitId).order("name");
      return ensure(data ?? [], error).map((item) => ({ id: item.id, unitId: item.unit_id, name: item.name, active: item.active, source: item.source }));
    },
    async listStoreAccesses(unitId: string): Promise<StoreAccess[]> {
      const { data, error } = await client.from("roys_profiles").select("user_id,unit_id,username,active,last_access_at").eq("unit_id", unitId).eq("role", "store");
      return ensure(data ?? [], error).map((item) => ({ profileId: item.user_id, unitId: item.unit_id, username: item.username ?? "", active: item.active, lastAccessAt: item.last_access_at ?? undefined }));
    },
    async setEmployeeActive(employeeId: string, active: boolean): Promise<void> {
      const { error } = await client.rpc("set_employee_active", { employee_id: employeeId, active_value: active });
      ensure(null, error);
    },
    async createEmployee(unitId: string, name: string, source: "admin" | "store" = "store"): Promise<Employee> {
      const { data: userData } = await client.auth.getUser();
      const normalized = name.trim().replace(/\s+/g, " ");
      const { data, error } = await client.from("roys_employees").insert({ unit_id: unitId, name: normalized, source, created_by: userData.user?.id }).select("id,unit_id,name,active,source").single();
      const item = ensure(data, error);
      if (!item) throw new Error("O funcionário não foi retornado pelo banco.");
      return { id: item.id, unitId: item.unit_id, name: item.name, active: item.active, source: item.source };
    },
  };
}

export const unitRepository = createUnitRepository(supabase);
