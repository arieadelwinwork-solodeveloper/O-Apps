import { supabase } from "./supabase";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

type ApiError = { error: string; issues?: { field: string; message: string }[] };

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!supabase) {
    throw new Error("Supabase belum dikonfigurasi");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      "Backend belum jalan. Buka folder server, jalankan: npm run dev (atau double-click start.bat). SQL Supabase sudah cukup untuk database — backend Node.js harus dijalankan terpisah."
    );
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // body kosong
  }

  if (!res.ok) {
    const message = (json as ApiError)?.error ?? "Terjadi kesalahan sistem";
    throw new Error(message);
  }
  return json as T;
}
