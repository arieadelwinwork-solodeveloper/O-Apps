import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  registerMembershipSchema,
  cashierRegisterMembershipSchema,
  topupMembershipSchema,
  type RegisterMembershipInput,
  type CashierRegisterMembershipInput,
  type TopupMembershipInput,
} from "../schemas/membership.js";
import { findOrCreateCustomer } from "../lib/customers.js";
import { registerMembershipFromPackage } from "../lib/membershipRegister.js";

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

/** POST /api/memberships/cashier-register — kasir berikan membership ke pelanggan. */
membershipsRouter.post(
  "/cashier-register",
  authMiddleware,
  validateBody(cashierRegisterMembershipSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CashierRegisterMembershipInput;
    const businessId = req.user!.businessId;
    const customerId = await findOrCreateCustomer(
      businessId,
      body.customerName,
      body.customerPhone
    );
    const result = await registerMembershipFromPackage(
      businessId,
      customerId,
      body.packageId,
      {
        paymentMethod: body.paymentMethod,
        proofUrl: body.proofUrl,
      }
    );
    res.status(result.statusCode).json({ membership: result.membership });
  }
);

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
    const result = await registerMembershipFromPackage(
      businessId,
      body.customerId,
      body.packageId
    );
    res.status(result.statusCode).json({ membership: result.membership });
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
