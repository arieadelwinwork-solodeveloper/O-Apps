import { supabaseAdmin } from "./supabase.js";
import { AppError } from "../middleware/errorHandler.js";

/** Cari customer berdasar telpon dalam bisnis, atau buat baru. */
export async function findOrCreateCustomer(
  businessId: string,
  name: string,
  phone?: string
): Promise<string> {
  if (phone) {
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .eq("phone", phone)
      .maybeSingle();
    if (existing) return existing.id;
  }
  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert({ business_id: businessId, name, phone: phone ?? null })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[CUSTOMER CREATE ERROR]", error);
    throw new AppError(500, "Gagal menyimpan data pelanggan");
  }
  return data.id;
}
