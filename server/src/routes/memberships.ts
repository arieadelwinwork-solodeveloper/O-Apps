import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  registerMembershipSchema,
  topupMembershipSchema,
  type RegisterMembershipInput,
  type TopupMembershipInput,
} from "../schemas/membership.js";

export const membershipsRouter = Router();

const MEMBERSHIP_COLS =
  "id, customer_id, type, balance, quota_service_id, quota_remaining, package_id, created_at";

async function resolveCustomerId(
  businessId: string,
  customerId?: string,
  phone?: string
): Promise<string | null> {
  if (customerId) return customerId;
  if (!phone) return null;
  const { data } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .eq("phone", phone)
    .maybeSingle();
  return data?.id ?? null;
}

/** GET /api/memberships — daftar membership (?customerId= / ?phone=). */
membershipsRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const customerId = await resolveCustomerId(
    businessId,
    req.query.customerId as string | undefined,
    req.query.phone as string | undefined
  );

  let query = supabaseAdmin
    .from("memberships")
    .select(
      `${MEMBERSHIP_COLS}, customers(name, phone), services:quota_service_id(name, unit), membership_packages(name, price)`
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;
  if (error) {
    console.error("[MEMBERSHIPS LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat membership");
  }
  res.json({ memberships: data });
});

/** GET /api/memberships/:id/transactions — riwayat mutasi. */
membershipsRouter.get(
  "/:id/transactions",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { data: mem, error: memErr } = await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .maybeSingle();
    if (memErr || !mem) throw new AppError(404, "Membership tidak ditemukan");

    const { data, error } = await supabaseAdmin
      .from("membership_transactions")
      .select("id, order_id, change_type, amount, created_at")
      .eq("membership_id", mem.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[MEMBERSHIP TX ERROR]", error);
      throw new AppError(500, "Gagal memuat riwayat membership");
    }
    res.json({ transactions: data });
  }
);

/** POST /api/memberships — daftar membership (pelanggan + paket). */
membershipsRouter.post(
  "/",
  authMiddleware,
  requireRole("owner"),
  validateBody(registerMembershipSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as RegisterMembershipInput;
    const businessId = req.user!.businessId;

    const { data: customer, error: custErr } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("id", body.customerId)
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
      .eq("id", body.packageId)
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
        .eq("customer_id", body.customerId)
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
        await supabaseAdmin.from("membership_transactions").insert({
          business_id: businessId,
          membership_id: existing.id,
          change_type: "topup",
          amount: creditAmount,
        });
        return res.status(200).json({ membership: updated });
      }

      const { data, error } = await supabaseAdmin
        .from("memberships")
        .insert({
          business_id: businessId,
          customer_id: body.customerId,
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
      await supabaseAdmin.from("membership_transactions").insert({
        business_id: businessId,
        membership_id: data.id,
        change_type: "topup",
        amount: creditAmount,
      });
      return res.status(201).json({ membership: data });
    }

    const { data: existingQuota } = await supabaseAdmin
      .from("memberships")
      .select("id, quota_remaining")
      .eq("business_id", businessId)
      .eq("customer_id", body.customerId)
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
      await supabaseAdmin.from("membership_transactions").insert({
        business_id: businessId,
        membership_id: existingQuota.id,
        change_type: "topup",
        amount: creditAmount,
      });
      return res.status(200).json({ membership: updated });
    }

    const { data, error } = await supabaseAdmin
      .from("memberships")
      .insert({
        business_id: businessId,
        customer_id: body.customerId,
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

    await supabaseAdmin.from("membership_transactions").insert({
      business_id: businessId,
      membership_id: data.id,
      change_type: "topup",
      amount: creditAmount,
    });

    res.status(201).json({ membership: data });
  }
);

/** POST /api/memberships/:id/topup — owner tambah saldo/kuota manual. */
membershipsRouter.post(
  "/:id/topup",
  authMiddleware,
  requireRole("owner"),
  validateBody(topupMembershipSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as TopupMembershipInput;
    const businessId = req.user!.businessId;

    const { data: mem, error: getErr } = await supabaseAdmin
      .from("memberships")
      .select("id, type, balance, quota_remaining")
      .eq("id", req.params.id)
      .eq("business_id", businessId)
      .maybeSingle();
    if (getErr || !mem) throw new AppError(404, "Membership tidak ditemukan");

    if (mem.type === "saldo") {
      await supabaseAdmin
        .from("memberships")
        .update({ balance: mem.balance + body.amount })
        .eq("id", mem.id);
    } else {
      await supabaseAdmin
        .from("memberships")
        .update({ quota_remaining: mem.quota_remaining + body.amount })
        .eq("id", mem.id);
    }

    await supabaseAdmin.from("membership_transactions").insert({
      business_id: businessId,
      membership_id: mem.id,
      change_type: "topup",
      amount: body.amount,
    });

    res.json({ success: true });
  }
);
