import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Tolak placeholder dari .env.example
  if (
    trimmed.includes("your-project") ||
    trimmed === "your_anon_key" ||
    trimmed.startsWith("your_")
  ) {
    return undefined;
  }
  return trimmed;
}

const url = readEnv(import.meta.env.VITE_SUPABASE_URL);
const anonKey = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabaseConfig = {
  url: url ?? null,
  hasUrl: Boolean(url),
  hasAnonKey: Boolean(anonKey),
};

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Client Supabase. null jika .env belum diset — jangan panggil createClient("")
 * karena akan throw dan membuat layar putih.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
