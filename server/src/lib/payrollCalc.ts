import { supabaseAdmin } from "./supabase.js";

export interface PayrollCalcResult {
  baseSalary: number;
  commissionTotal: number;
  attendanceDays: number;
  deductions: number;
  netPay: number;
  loanDeductions: { loanId: string; amount: number }[];
}

/** Batas awal & akhir periode `YYYY-MM` (UTC+7 tidak dipakai; pakai server local month). */
export function periodBounds(period: string): { start: string; end: string } {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Hitung potongan dari pinjaman disetujui yang masih ada sisa. */
export function calcLoanDeductions(
  loans: {
    id: string;
    remaining: number;
    deduction_mode: string | null;
    deduction_amount: number | null;
  }[]
): { total: number; items: { loanId: string; amount: number }[] } {
  const items: { loanId: string; amount: number }[] = [];
  let total = 0;
  for (const loan of loans) {
    if (loan.remaining <= 0) continue;
    let amount = 0;
    if (loan.deduction_mode === "langsung") {
      amount = loan.remaining;
    } else {
      const per = loan.deduction_amount ?? loan.remaining;
      amount = Math.min(per, loan.remaining);
    }
    if (amount > 0) {
      items.push({ loanId: loan.id, amount });
      total += amount;
    }
  }
  return { total, items };
}

/** Hitung komponen slip gaji untuk satu karyawan pada periode tertentu. */
export async function calculatePayroll(
  businessId: string,
  userId: string,
  period: string
): Promise<PayrollCalcResult> {
  const { start, end } = periodBounds(period);

  const { data: user, error: userErr } = await supabaseAdmin
    .from("users")
    .select("base_salary")
    .eq("id", userId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (userErr) throw userErr;
  const baseSalary = user?.base_salary ?? 0;

  const { data: comms, error: commErr } = await supabaseAdmin
    .from("commissions")
    .select("amount")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("period", period);
  if (commErr) throw commErr;
  const commissionTotal = (comms ?? []).reduce(
    (s, c) => s + (c.amount ?? 0),
    0
  );

  const { data: atts, error: attErr } = await supabaseAdmin
    .from("attendances")
    .select("created_at")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("type", "masuk")
    .eq("is_valid", true)
    .gte("created_at", start)
    .lte("created_at", end);
  if (attErr) throw attErr;
  const days = new Set(
    (atts ?? []).map((a) => new Date(a.created_at).toISOString().slice(0, 10))
  );
  const attendanceDays = days.size;

  const { data: loans, error: loanErr } = await supabaseAdmin
    .from("loans")
    .select("id, remaining, deduction_mode, deduction_amount")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "disetujui")
    .gt("remaining", 0);
  if (loanErr) throw loanErr;

  const { total: deductions, items: loanDeductions } = calcLoanDeductions(
    loans ?? []
  );
  const netPay = Math.max(0, baseSalary + commissionTotal - deductions);

  return {
    baseSalary,
    commissionTotal,
    attendanceDays,
    deductions,
    netPay,
    loanDeductions,
  };
}

/** Terapkan potongan pinjaman saat payroll difinalisasi/dibayar. */
export async function applyLoanDeductions(
  items: { loanId: string; amount: number }[]
): Promise<void> {
  for (const { loanId, amount } of items) {
    const { data: loan, error } = await supabaseAdmin
      .from("loans")
      .select("remaining")
      .eq("id", loanId)
      .maybeSingle();
    if (error || !loan) continue;
    const remaining = Math.max(0, loan.remaining - amount);
    await supabaseAdmin
      .from("loans")
      .update({
        remaining,
        status: remaining <= 0 ? "lunas" : "disetujui",
      })
      .eq("id", loanId);
  }
}
