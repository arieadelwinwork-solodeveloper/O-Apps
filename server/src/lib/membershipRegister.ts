import { supabaseAdmin } from "./supabase.js";
import { AppError } from "../middleware/errorHandler.js";

const MEMBERSHIP_COLS =
  "id, customer_id, type, balance, quota_service_id, quota_remaining, package_id, created_at";

export interface MembershipPackagePayment {
  paymentMethod: "tunai" | "qris" | "transfer";
  proofUrl?: string;
}

function assertMembershipPayment(
  pkg: { price: number },
  payment: MembershipPackagePayment
): { payment_method: string; proof_url: string | null; paid_amount: number } {
  if (
    (payment.paymentMethod === "qris" || payment.paymentMethod === "transfer") &&
    !payment.proofUrl
  ) {
    throw new AppError(400, "Bukti bayar wajib untuk QRIS/Transfer");
  }
  return {
    payment_method: payment.paymentMethod,
    proof_url: payment.proofUrl ?? null,
    paid_amount: pkg.price,
  };
}

async function insertMembershipTransaction(
  businessId: string,
  membershipId: string,
  creditAmount: number,
  payment?: MembershipPackagePayment & { pkg: { price: number } }
) {
  const paymentFields = payment
    ? assertMembershipPayment(payment.pkg, payment)
    : {};
  await supabaseAdmin.from("membership_transactions").insert({
    business_id: businessId,
    membership_id: membershipId,
    change_type: "topup",
    amount: creditAmount,
    ...paymentFields,
  });
}

export async function registerMembershipFromPackage(
  businessId: string,
  customerId: string,
  packageId: string,
  payment?: MembershipPackagePayment
): Promise<{ membership: Record<string, unknown>; statusCode: number }> {
  const { data: customer, error: custErr } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (custErr || !customer) {
    throw new AppError(404, "Pelanggan tidak ditemukan");
  }

  const { data: pkg, error: pkgErr } = await supabaseAdmin
    .from("membership_packages")
    .select(
      "id, type, name, price, saldo_amount, quota_amount, quota_service_id, is_active"
    )
    .eq("id", packageId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (pkgErr || !pkg) throw new AppError(404, "Paket tidak ditemukan");
  if (!pkg.is_active) throw new AppError(400, "Paket tidak aktif");

  const creditAmount =
    pkg.type === "saldo" ? pkg.saldo_amount! : pkg.quota_amount!;

  if (pkg.type === "saldo") {
    const { data: existing } = await supabaseAdmin
      .from("memberships")
      .select("id, balance")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .eq("type", "saldo")
      .maybeSingle();

    if (existing) {
      const { data: updated, error: updErr } = await supabaseAdmin
        .from("memberships")
        .update({
          balance: existing.balance + creditAmount,
          package_id: pkg.id,
        })
        .eq("id", existing.id)
        .select(MEMBERSHIP_COLS)
        .single();
      if (updErr) {
        console.error("[MEMBERSHIP TOPUP VIA PACKAGE ERROR]", updErr);
        throw new AppError(500, "Gagal menambah saldo membership");
      }
      await insertMembershipTransaction(businessId, existing.id, creditAmount, {
        ...payment,
        pkg,
      });
      return { membership: updated!, statusCode: 200 };
    }

    const { data, error } = await supabaseAdmin
      .from("memberships")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        type: "saldo",
        balance: creditAmount,
        quota_remaining: 0,
        package_id: pkg.id,
      })
      .select(MEMBERSHIP_COLS)
      .single();
    if (error) {
      console.error("[MEMBERSHIP CREATE ERROR]", error);
      throw new AppError(500, "Gagal mendaftarkan membership");
    }
    await insertMembershipTransaction(businessId, data.id, creditAmount, {
      ...payment,
      pkg,
    });
    return { membership: data, statusCode: 201 };
  }

  const { data: existingQuota } = await supabaseAdmin
    .from("memberships")
    .select("id, quota_remaining")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .eq("type", "kuota")
    .eq("quota_service_id", pkg.quota_service_id!)
    .maybeSingle();

  if (existingQuota) {
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("memberships")
      .update({
        quota_remaining: existingQuota.quota_remaining + creditAmount,
        package_id: pkg.id,
      })
      .eq("id", existingQuota.id)
      .select(MEMBERSHIP_COLS)
      .single();
    if (updErr) {
      console.error("[MEMBERSHIP QUOTA TOPUP VIA PACKAGE ERROR]", updErr);
      throw new AppError(500, "Gagal menambah kuota membership");
    }
    await insertMembershipTransaction(
      businessId,
      existingQuota.id,
      creditAmount,
      { ...payment, pkg }
    );
    return { membership: updated!, statusCode: 200 };
  }

  const { data, error } = await supabaseAdmin
    .from("memberships")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      type: "kuota",
      balance: 0,
      quota_service_id: pkg.quota_service_id,
      quota_remaining: creditAmount,
      package_id: pkg.id,
    })
    .select(MEMBERSHIP_COLS)
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new AppError(400, "Pelanggan sudah punya kuota untuk layanan ini");
    }
    console.error("[MEMBERSHIP CREATE ERROR]", error);
    throw new AppError(500, "Gagal mendaftarkan membership");
  }

  await insertMembershipTransaction(businessId, data.id, creditAmount, {
    ...payment,
    pkg,
  });

  return { membership: data, statusCode: 201 };
}
