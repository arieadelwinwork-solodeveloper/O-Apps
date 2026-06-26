import { mockApiFetch } from "./mock/router";

const STORAGE_KEY = "oapps_mock_active";

/** Paksa mock API (tanpa coba backend). */
export function isMockApiForced(): boolean {
  return import.meta.env.VITE_USE_MOCK_API === "true";
}

/** Di development, fallback ke mock jika backend mati. */
export function isMockFallbackEnabled(): boolean {
  return (
    import.meta.env.DEV && import.meta.env.VITE_MOCK_FALLBACK !== "false"
  );
}

function readActive(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let mockActive = isMockApiForced() || readActive();

export function isUsingMockApi(): boolean {
  return mockActive || isMockApiForced();
}

export function activateMockApi(): void {
  mockActive = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Panggil mock API — dipakai oleh apiFetch. */
export async function dispatchMockApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  activateMockApi();
  return mockApiFetch<T>(path, options);
}

/** URL palsu untuk upload bukti/foto di mode demo. */
export function mockUploadUrl(kind: "payment" | "attendance"): string {
  const label = kind === "payment" ? "Bukti+Bayar" : "Foto+Absensi";
  return `https://placehold.co/400x300/png?text=${label}`;
}
