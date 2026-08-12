import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { storeUsernameToEmail } from "./username";

function throwAuthError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function createAuthService(client: SupabaseClient) {
  return {
    async signInStore(username: string, password: string) {
      const result = await client.auth.signInWithPassword({ email: storeUsernameToEmail(username), password });
      throwAuthError(result.error);
      return result.data;
    },
    async signInAdmin(email: string, password: string) {
      const result = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      throwAuthError(result.error);
      return result.data;
    },
    async requestAdminPasswordReset(email: string, origin = window.location.origin) {
      const result = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origin}/recuperar-senha` });
      throwAuthError(result.error);
    },
    async updateRecoveredPassword(password: string) {
      const result = await client.auth.updateUser({ password });
      throwAuthError(result.error);
    },
    async signOut() {
      const result = await client.auth.signOut();
      throwAuthError(result.error);
    },
  };
}

export const authService = createAuthService(supabase);
