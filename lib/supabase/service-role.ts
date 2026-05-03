import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client with the service role key. Used for Storage operations that
 * must not rely on end-user JWT policies (deletes are still gated in app code),
 * and for Auth admin APIs (invite / list users) when provisioning realtors and
 * loan officers from the admin UI.
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is unset — callers fall back to
 * the session-scoped server client + Storage RLS policies.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
