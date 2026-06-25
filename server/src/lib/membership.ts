import { supabaseAdmin } from "./supabase.js";
import { AppError } from "../middleware/errorHandler.js";

export interface OrderItemRow {
  service_id: string;
  unit_price: number;
  qty: number;
  subtotal: number;
}

export interface QuotaUsageInput {
  membershipId: string;
  qty: number;
}

export interface MembershipApplyInput {
  saldoAmount?: number;
  quotaUsages?: QuotaUsageInput[];
}

export interface MembershipDeduction {
  membershipId: string;
  type: "saldo" | "kuota";
  txAmount: number;
  rupiahValue: number;
}

export interface MembershipApplyResult {
  membershipUsedRupiah: number;
  netPayable: number;
  deductions: MembershipDeduction[];
}

interface MembershipRow {
  id: string;
  type: string;
  balance: number;
  quota_service_id: string | null;
  quota_remaining: number;
  customer_id: string;
}

/** Hitung potongan membership & validasi saldo/kuota (belum tulis DB). */
export async function computeMembershipDiscount(
  businessId: string,
  customerId: string,
  grossTotal: number,
  itemRows: OrderItemRow[],
  input: MembershipApplyInput
): Promise<MembershipApplyResult> {
  const deductions: MembershipDeduction[] = [];
  let membershipUsedRupiah = 0;

  const qtyByService = new Map<string, number>();
  const priceByService = new Map<string, number>();
  for (const row of itemRows) {
    qtyByService.set(row.service_id, row.qty);
    priceByService.set(row.service_id, row.unit_price);
  }

  const membershipIds = new Set<string>();
  if (input.saldoAmount && input.saldoAmount > 0) {
    const { data: saldoMem } = await supabaseAdmin
      .from("memberships")
      .select("id, type, balance, customer_id")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .eq("type", "saldo")
      .maybeSingle();
    if (!saldoMem) throw new AppError(400, "Pelanggan tidak punya saldo membership");
    membershipIds.add(saldoMem.id);
  }

  for (const u of input.quotaUsages ?? []) {
    membershipIds.add(u.membershipId);
  }

  const membershipMap = new Map<string, MembershipRow>();
  if (membershipIds.size > 0) {
    const { data: memberships, error } = await supabaseAdmin
      .from("memberships")
      .select(
        "id, type, balance, quota_service_id, quota_remaining, customer_id"
      )
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .in("id", [...membershipIds]);
    if (error) throw error;
    for (const m of memberships ?? []) {
      membershipMap.set(m.id, m as MembershipRow);
    }
  }

  // Kuota dulu — kurangi tagihan per layanan.
  for (const usage of input.quotaUsages ?? []) {
    const mem = membershipMap.get(usage.membershipId);
    if (!mem || mem.type !== "kuota") {
      throw new AppError(400, "Membership kuota tidak valid");
    }
    if (!mem.quota_service_id) {
      throw new AppError(400, "Membership kuota tidak terkait layanan");
    }
    const cartQty = qtyByService.get(mem.quota_service_id) ?? 0;
    if (cartQty <= 0) {
      throw new AppError(400, "Layanan kuota tidak ada di pesanan");
    }
    const useQty = Math.min(usage.qty, cartQty, mem.quota_remaining);
    if (useQty <= 0) {
      throw new AppError(400, "Kuota membership tidak mencukupi");
    }
    const unitPrice = priceByService.get(mem.quota_service_id) ?? 0;
    const rupiahValue = Math.round(unitPrice * useQty);
    membershipUsedRupiah += rupiahValue;
    deductions.push({
      membershipId: mem.id,
      type: "kuota",
      txAmount: -useQty,
      rupiahValue,
    });
  }

  // Saldo — potong sisa tagihan.
  if (input.saldoAmount && input.saldoAmount > 0) {
    const saldoMem = [...membershipMap.values()].find((m) => m.type === "saldo");
    if (!saldoMem) throw new AppError(400, "Membership saldo tidak ditemukan");
    const remainingBill = grossTotal - membershipUsedRupiah;
    if (remainingBill <= 0) {
      throw new AppError(400, "Tagihan sudah tertutup kuota");
    }
    const useSaldo = Math.min(
      input.saldoAmount,
      saldoMem.balance,
      remainingBill
    );
    if (useSaldo <= 0) {
      throw new AppError(400, "Saldo membership tidak mencukupi");
    }
    membershipUsedRupiah += useSaldo;
    deductions.push({
      membershipId: saldoMem.id,
      type: "saldo",
      txAmount: -useSaldo,
      rupiahValue: useSaldo,
    });
  }

  if (membershipUsedRupiah > grossTotal) {
    throw new AppError(400, "Potongan membership melebihi total");
  }

  return {
    membershipUsedRupiah,
    netPayable: grossTotal - membershipUsedRupiah,
    deductions,
  };
}

/** Terapkan mutasi membership setelah order berhasil dibuat. */
export async function recordMembershipUsage(
  businessId: string,
  orderId: string,
  deductions: MembershipDeduction[]
): Promise<void> {
  for (const d of deductions) {
    const { data: mem, error: getErr } = await supabaseAdmin
      .from("memberships")
      .select("id, type, balance, quota_remaining")
      .eq("id", d.membershipId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (getErr || !mem) continue;

    if (d.type === "saldo") {
      const balance = Math.max(0, mem.balance + d.txAmount);
      await supabaseAdmin
        .from("memberships")
        .update({ balance })
        .eq("id", mem.id);
    } else {
      const quota = Math.max(0, mem.quota_remaining + d.txAmount);
      await supabaseAdmin
        .from("memberships")
        .update({ quota_remaining: quota })
        .eq("id", mem.id);
    }

    await supabaseAdmin.from("membership_transactions").insert({
      business_id: businessId,
      membership_id: d.membershipId,
      order_id: orderId,
      change_type: "pakai",
      amount: d.txAmount,
    });
  }
}
