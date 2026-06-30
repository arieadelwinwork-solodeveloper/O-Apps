import { supabaseAdmin } from "./supabase.js";
import type { ReportCategory } from "../schemas/reports.js";

export const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  operasional: "Masalah Operasional",
  aplikasi: "Masalah Aplikasi",
  peralatan: "Peralatan / Mesin",
  transaksi: "Transaksi / Kasir",
  lainnya: "Lainnya",
};

const REPORT_REF = "report_id:";

export function reportRefTag(reportId: string): string {
  return `${REPORT_REF}${reportId}`;
}

/** Kirim notifikasi ke semua owner aktif. */
export async function notifyOwnersOfReport(
  businessId: string,
  reportId: string,
  category: ReportCategory,
  reporterName: string,
  messagePreview: string
): Promise<void> {
  const { data: owners } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("business_id", businessId)
    .eq("role", "owner")
    .eq("is_active", true);
  if (!owners?.length) return;

  const catLabel = REPORT_CATEGORY_LABEL[category] ?? category;
  const preview =
    messagePreview.length > 120
      ? `${messagePreview.slice(0, 117)}…`
      : messagePreview;

  for (const owner of owners) {
    await supabaseAdmin.from("notifications").insert({
      business_id: businessId,
      user_id: owner.id,
      type: "laporan",
      title: `Laporan: ${catLabel}`,
      body: `${reporterName}: ${preview} ${reportRefTag(reportId)}`,
    });
  }
}
