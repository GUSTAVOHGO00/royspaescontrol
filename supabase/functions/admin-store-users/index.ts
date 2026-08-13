import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normalizeUsername(value: unknown) {
  const username = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("Login inválido.");
  return username;
}

function requirePassword(value: unknown) {
  const password = String(value ?? "");
  if (password.length < 4) throw new Error("A senha precisa ter pelo menos 4 caracteres.");
  return password;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método inválido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    const publishableKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Autenticação obrigatória." }, 401);

    const userClient = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
    const adminClient = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Sessão inválida." }, 401);
    const { data: actor } = await adminClient.from("roys_profiles").select("role,active").eq("user_id", authData.user.id).single();
    if (!actor?.active || actor.role !== "admin") return json({ error: "Acesso administrativo obrigatório." }, 403);

    const input = await request.json();
    if (input.action === "create") {
      const username = normalizeUsername(input.username);
      const password = requirePassword(input.password);
      const unitId = String(input.unitId ?? "");
      const { data: unit } = await adminClient.from("roys_units").select("id,name").eq("id", unitId).eq("active", true).single();
      if (!unit) return json({ error: "Unidade inválida." }, 400);
      const { data: existing } = await adminClient.from("roys_profiles").select("user_id").eq("unit_id", unitId).eq("role", "store").maybeSingle();
      if (existing) return json({ error: "Esta unidade já possui um acesso. Redefina a senha do acesso existente." }, 409);
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: `${username}@lojas.roys.internal`, password, email_confirm: true,
        app_metadata: { role: "store", unit_id: unitId },
      });
      if (createError || !created.user) return json({ error: createError?.message ?? "Não foi possível criar o acesso." }, 400);
      const { error: profileError } = await adminClient.from("roys_profiles").insert({
        user_id: created.user.id, display_name: unit.name, username, role: "store", unit_id: unitId, active: true,
      });
      if (profileError) { await adminClient.auth.admin.deleteUser(created.user.id); return json({ error: profileError.message }, 400); }
      await adminClient.from("roys_audit_events").insert({ actor_id: authData.user.id, action: "store_access_created", entity_type: "profile", entity_id: created.user.id, details: { unitId, username } });
      return json({ profileId: created.user.id, unitId, username, active: true });
    }

    const profileId = String(input.profileId ?? "");
    const { data: target } = await adminClient.from("roys_profiles").select("user_id,unit_id,username,role").eq("user_id", profileId).single();
    if (!target || target.role !== "store") return json({ error: "Acesso da loja não encontrado." }, 404);
    if (input.action === "delete") {
      const archivedEmail = "archived-" + target.user_id + "@lojas.roys.internal";
      const { error: archiveAuthError } = await adminClient.auth.admin.updateUserById(target.user_id, {
        email: archivedEmail,
        email_confirm: true,
        ban_duration: "876000h",
        app_metadata: { role: "archived_store", previous_unit_id: target.unit_id },
      });
      if (archiveAuthError) return json({ error: archiveAuthError.message }, 400);

      const { error: archiveProfileError } = await adminClient.from("roys_profiles").update({
        display_name: "Acesso arquivado",
        username: null,
        unit_id: null,
        active: false,
        updated_at: new Date().toISOString(),
      }).eq("user_id", target.user_id);
      if (archiveProfileError) return json({ error: archiveProfileError.message }, 400);

      await adminClient.from("roys_audit_events").insert({
        actor_id: authData.user.id,
        action: "store_access_archived",
        entity_type: "profile",
        entity_id: target.user_id,
        details: { unitId: target.unit_id, username: target.username, historyPreserved: true },
      });
      return json({ deleted: true, historyPreserved: true });
    }
    if (input.action === "reset-password") {
      const password = requirePassword(input.password);
      const { error } = await adminClient.auth.admin.updateUserById(target.user_id, { password });
      if (error) return json({ error: error.message }, 400);
    } else if (input.action === "set-active") {
      const active = Boolean(input.active);
      const { error } = await adminClient.from("roys_profiles").update({ active, updated_at: new Date().toISOString() }).eq("user_id", target.user_id);
      if (error) return json({ error: error.message }, 400);
      await adminClient.auth.admin.updateUserById(target.user_id, { ban_duration: active ? "none" : "876000h" });
    } else return json({ error: "Ação inválida." }, 400);
    await adminClient.from("roys_audit_events").insert({ actor_id: authData.user.id, action: input.action, entity_type: "profile", entity_id: target.user_id, details: { unitId: target.unit_id, username: target.username } });
    return json({ profileId: target.user_id, unitId: target.unit_id, username: target.username, active: input.action === "set-active" ? Boolean(input.active) : true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Falha inesperada." }, 400);
  }
});
