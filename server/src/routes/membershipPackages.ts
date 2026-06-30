import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  createMembershipPackageSchema,
  type CreateMembershipPackageInput,
} from "../schemas/membershipPackage.js";

export const membershipPackagesRouter = Router();

const PACKAGE_COLS =
  "id, type, name, price, saldo_amount, quota_amount, quota_service_id, is_active, created_at";

/** GET /api/membership-packages — daftar paket (?activeOnly=1). */
membershipPackagesRouter.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;
    const activeOnly = req.query.activeOnly === "1";

    let query = supabaseAdmin
      .from("membership_packages")
      .select(
        `${PACKAGE_COLS}, services:quota_service_id(name, unit, price)`
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) {
      console.error("[MEMBERSHIP PACKAGES LIST ERROR]", error);
      throw new AppError(500, "Gagal memuat paket membership");
    }
    res.json({ packages: data });
  }
);

/** POST /api/membership-packages — owner tambah paket. */
membershipPackagesRouter.post(
  "/",
  authMiddleware,
  requireRole("owner"),
  validateBody(createMembershipPackageSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateMembershipPackageInput;
    const businessId = req.user!.businessId;

    if (body.type === "kuota") {
      const { data: svc, error: svcErr } = await supabaseAdmin
        .from("services")
        .select("id, price")
        .eq("id", body.quotaServiceId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (svcErr || !svc) throw new AppError(400, "Layanan tidak ditemukan");
      const maxPrice = body.quotaAmount * svc.price;
      if (body.price > maxPrice) {
        throw new AppError(
          400,
          `Harga paket tidak boleh melebihi harga layanan biasa (${body.quotaAmount} × ${svc.price.toLocaleString("id-ID")} = Rp ${maxPrice.toLocaleString("id-ID")})`
        );
      }
    }

    const row =
      body.type === "saldo"
        ? {
            business_id: businessId,
            type: "saldo" as const,
            name: body.name.trim(),
            price: body.price,
            saldo_amount: body.saldoAmount,
            quota_amount: null,
            quota_service_id: null,
          }
        : {
            business_id: businessId,
            type: "kuota" as const,
            name: body.name.trim(),
            price: body.price,
            saldo_amount: null,
            quota_amount: body.quotaAmount,
            quota_service_id: body.quotaServiceId,
          };

    const { data, error } = await supabaseAdmin
      .from("membership_packages")
      .insert(row)
      .select(PACKAGE_COLS)
      .single();
    if (error) {
      console.error("[MEMBERSHIP PACKAGE CREATE ERROR]", error);
      throw new AppError(500, "Gagal menyimpan paket");
    }

    res.status(201).json({ package: data });
  }
);

/** PATCH /api/membership-packages/:id — owner nonaktifkan paket. */
membershipPackagesRouter.patch(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;
    const isActive =
      typeof req.body?.isActive === "boolean" ? req.body.isActive : false;

    const { data, error } = await supabaseAdmin
      .from("membership_packages")
      .update({ is_active: isActive })
      .eq("id", req.params.id)
      .eq("business_id", businessId)
      .select(PACKAGE_COLS)
      .maybeSingle();
    if (error) {
      console.error("[MEMBERSHIP PACKAGE PATCH ERROR]", error);
      throw new AppError(500, "Gagal memperbarui paket");
    }
    if (!data) throw new AppError(404, "Paket tidak ditemukan");
    res.json({ package: data });
  }
);
