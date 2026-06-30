import { apiFetch } from "./api";
import type {
  DashboardSummary,
  DashboardRange,
  AppNotification,
  QueueToday,
  MeTodaySummary,
  OwnerOmsetSummary,
  PerformaSummary,
  MePerformaChart,
  InventoryStatusItem,
  FinanceForecast,
} from "../types";

export function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const RANGE_LABEL: Record<DashboardRange, string> = {
  today: "Hari Ini",
  week: "Minggu",
  month: "Bulan",
};

export function rangeLabel(r: DashboardRange): string {
  return RANGE_LABEL[r];
}

export async function getDashboardSummary(
  range: DashboardRange = "today"
): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(`/api/dashboard/summary?range=${range}`);
}

export async function getTodayQueue(): Promise<{
  queue: Omit<QueueToday, "total">;
  total: number;
}> {
  return apiFetch("/api/dashboard/queue");
}

export async function getMeToday(): Promise<MeTodaySummary> {
  return apiFetch<MeTodaySummary>("/api/dashboard/me-today");
}

export async function getOwnerOmset(): Promise<OwnerOmsetSummary> {
  return apiFetch<OwnerOmsetSummary>("/api/dashboard/owner-omset");
}

export async function getFinanceForecast(): Promise<FinanceForecast> {
  return apiFetch<FinanceForecast>("/api/dashboard/finance-forecast");
}

export async function getPerforma(): Promise<PerformaSummary> {
  return apiFetch<PerformaSummary>("/api/dashboard/performa");
}

export async function getMePerformaChart(): Promise<MePerformaChart> {
  return apiFetch<MePerformaChart>("/api/dashboard/me-performa-chart");
}

export async function getInventoryStatus(): Promise<{
  items: InventoryStatusItem[];
}> {
  return apiFetch("/api/dashboard/inventory-status");
}

export async function listNotifications(unreadOnly?: boolean): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  const qs = unreadOnly ? "?unread=1" : "";
  return apiFetch(`/api/notifications${qs}`);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/notifications/read-all", { method: "PATCH" });
}

export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  stok_menipis: "Stok",
  pinjaman: "Pinjaman",
  info: "Info",
  laporan: "Laporan",
};
