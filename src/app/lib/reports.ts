import { apiFetch } from "./api";
import type { OperationalReport, ReportCategory } from "../types";

export const REPORT_CATEGORIES: ReportCategory[] = [
  "operasional",
  "aplikasi",
  "peralatan",
  "transaksi",
  "lainnya",
];

export const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  operasional: "Masalah Operasional",
  aplikasi: "Masalah Aplikasi",
  peralatan: "Peralatan / Mesin",
  transaksi: "Transaksi / Kasir",
  lainnya: "Lainnya",
};

export function formatReportDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function listReports(): Promise<OperationalReport[]> {
  const { reports } = await apiFetch<{ reports: OperationalReport[] }>(
    "/api/reports"
  );
  return reports;
}

export async function getReport(id: string): Promise<OperationalReport> {
  const { report } = await apiFetch<{ report: OperationalReport }>(
    `/api/reports/${id}`
  );
  return report;
}

export async function submitReport(input: {
  category: ReportCategory;
  message: string;
}): Promise<OperationalReport> {
  const { report } = await apiFetch<{ report: OperationalReport }>(
    "/api/reports",
    { method: "POST", body: JSON.stringify(input) }
  );
  return report;
}

/** Hilangkan tag report_id dari teks notifikasi. */
export function cleanNotificationBody(body: string): string {
  return body.replace(/\s*report_id:[a-f0-9-]+/gi, "").trim();
}

export function extractReportId(body: string): string | null {
  const m = body.match(/report_id:([a-f0-9-]+)/i);
  return m?.[1] ?? null;
}
