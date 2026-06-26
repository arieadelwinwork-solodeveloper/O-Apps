import { supabase } from "./supabase";
import {
  activateMockApi,
  dispatchMockApi,
  isMockApiForced,
  isMockFallbackEnabled,
  isUsingMockApi,
} from "./mockMode";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

type ApiError = { error: string; issues?: { field: string; message: string }[] };

export { isUsingMockApi };

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (isMockApiForced()) {
    return dispatchMockApi<T>(path, options);
  }

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
    if (isMockFallbackEnabled()) {
      return dispatchMockApi<T>(path, options);
    }
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
    if (isMockFallbackEnabled() && res.status >= 500) {
      activateMockApi();
      return dispatchMockApi<T>(path, options);
    }
    const message = (json as ApiError)?.error ?? "Terjadi kesalahan sistem";
    throw new Error(message);
  }
  return json as T;
}
