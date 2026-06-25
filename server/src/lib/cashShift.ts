import { supabaseAdmin } from "./supabase.js";

/** Id shift kas yang sedang terbuka untuk bisnis, atau null. */
export async function getOpenShiftId(businessId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("cash_shifts")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "open")
    .maybeSingle();
  return data?.id ?? null;
}

export interface ShiftCashBreakdown {
  cashIn: number; // pembayaran tunai masuk selama shift
  cashOut: number; // pengeluaran tunai selama shift
  expected: number; // opening + cashIn - cashOut
}

/**
 * Hitung kas seharusnya untuk sebuah shift:
 * expected = opening_cash + Σ(pembayaran tunai) − Σ(pengeluaran tunai).
 */
export async function computeShiftCash(
  shiftId: string,
  openingCash: number
): Promise<ShiftCashBreakdown> {
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("paid_amount")
    .eq("cash_shift_id", shiftId)
    .eq("payment_method", "tunai");
  const cashIn = (orders ?? []).reduce(
    (sum, o) => sum + (o.paid_amount ?? 0),
    0
  );

  const { data: expenses } = await supabaseAdmin
    .from("expenses")
    .select("amount")
    .eq("cash_shift_id", shiftId)
    .eq("is_cash", true);
  const cashOut = (expenses ?? []).reduce(
    (sum, e) => sum + (e.amount ?? 0),
    0
  );

  return { cashIn, cashOut, expected: openingCash + cashIn - cashOut };
}
