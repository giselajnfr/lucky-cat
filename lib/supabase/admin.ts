import { createClient } from "@supabase/supabase-js";

/**
 * SERVER ONLY. Uses the service-role key, which bypasses RLS. Import this from route handlers / server code
 * only — never from a "use client" file — so the key can never reach the browser (it has no NEXT_PUBLIC_ prefix).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
