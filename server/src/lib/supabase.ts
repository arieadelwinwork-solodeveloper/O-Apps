import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * Admin client (service role). HANYA dipakai di backend.
 * Bypass RLS — gunakan dengan hati-hati dan selalu filter manual.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Client yang terikat token user (menghormati RLS).
 * Dipakai untuk operasi atas nama user yang login.
 */
export function supabaseForToken(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
