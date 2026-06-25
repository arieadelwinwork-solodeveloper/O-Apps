import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  createServiceSchema,
  updateServiceSchema,
  createStageSchema,
  updateStageSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
  type CreateStageInput,
  type UpdateStageInput,
} from "../schemas/customization.js";

export const servicesRouter = Router();

const SERVICE_COLS = "id, name, price, unit, is_active, created_at";
const STAGE_COLS =
  "id, service_id, name, sort_order, commission_type, commission_value";

/** Pastikan service milik bisnis user; lempar 404 jika bukan. */
async function assertServiceOwned(serviceId: string, businessId: string) {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) {
    console.error("[SERVICE LOOKUP ERROR]", error);
    throw new AppError(500, "Gagal memuat layanan");
  }
  if (!data) throw new AppError(404, "Layanan tidak ditemukan");
}

// =====================================================================
// SERVICES
// =====================================================================

/** GET /api/services — daftar jasa + tahapnya (semua anggota bisnis). */
servicesRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const { data: services, error } = await supabaseAdmin
    .from("services")
    .select(SERVICE_COLS)
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[SERVICES LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat layanan");
  }

  const { data: stages, error: stagesErr } = await supabaseAdmin
    .from("service_stages")
    .select(STAGE_COLS)
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true });
  if (stagesErr) {
    console.error("[STAGES LIST ERROR]", stagesErr);
    throw new AppError(500, "Gagal memuat tahap layanan");
  }

  const byService = new Map<string, typeof stages>();
  for (const s of stages ?? []) {
    const list = byService.get(s.service_id) ?? [];
    list.push(s);
    byService.set(s.service_id, list);
  }

  const result = (services ?? []).map((svc) => ({
    ...svc,
    stages: byService.get(svc.id) ?? [],
  }));

  res.json({ services: result });
});

/** POST /api/services — owner buat jasa baru. */
servicesRouter.post(
  "/",
  authMiddleware,
  requireRole("owner"),
  validateBody(createServiceSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateServiceInput;
    const { data, error } = await supabaseAdmin
      .from("services")
      .insert({
        business_id: req.user!.businessId,
        name: body.name,
        price: body.price,
        unit: body.unit,
        is_active: body.isActive,
      })
      .select(SERVICE_COLS)
      .single();
    if (error) {
      console.error("[SERVICE CREATE ERROR]", error);
      throw new AppError(500, "Gagal membuat layanan");
    }
    res.status(201).json({ service: { ...data, stages: [] } });
  }
);

/** PATCH /api/services/:id — owner ubah jasa. */
servicesRouter.patch(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  validateBody(updateServiceSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdateServiceInput;
    await assertServiceOwned(req.params.id, req.user!.businessId);

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.price !== undefined) patch.price = body.price;
    if (body.unit !== undefined) patch.unit = body.unit;
    if (body.isActive !== undefined) patch.is_active = body.isActive;

    if (Object.keys(patch).length === 0) return res.json({ success: true });

    const { error } = await supabaseAdmin
      .from("services")
      .update(patch)
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId);
    if (error) {
      console.error("[SERVICE UPDATE ERROR]", error);
      throw new AppError(500, "Gagal memperbarui layanan");
    }
    res.json({ success: true });
  }
);

/** DELETE /api/services/:id — owner hapus jasa (tahap ikut terhapus). */
servicesRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    await assertServiceOwned(req.params.id, req.user!.businessId);
    const { error } = await supabaseAdmin
      .from("services")
      .delete()
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId);
    if (error) {
      console.error("[SERVICE DELETE ERROR]", error);
      throw new AppError(500, "Gagal menghapus layanan");
    }
    res.json({ success: true });
  }
);

// =====================================================================
// SERVICE STAGES (nested di bawah service)
// =====================================================================

/** POST /api/services/:id/stages — owner tambah tahap. */
servicesRouter.post(
  "/:id/stages",
  authMiddleware,
  requireRole("owner"),
  validateBody(createStageSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateStageInput;
    await assertServiceOwned(req.params.id, req.user!.businessId);

    const { data, error } = await supabaseAdmin
      .from("service_stages")
      .insert({
        business_id: req.user!.businessId,
        service_id: req.params.id,
        name: body.name,
        sort_order: body.sortOrder,
        commission_type: body.commissionType,
        commission_value: body.commissionValue,
      })
      .select(STAGE_COLS)
      .single();
    if (error) {
      console.error("[STAGE CREATE ERROR]", error);
      throw new AppError(500, "Gagal menambah tahap");
    }
    res.status(201).json({ stage: data });
  }
);

/** PATCH /api/services/:id/stages/:stageId — owner ubah tahap. */
servicesRouter.patch(
  "/:id/stages/:stageId",
  authMiddleware,
  requireRole("owner"),
  validateBody(updateStageSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdateStageInput;
    await assertServiceOwned(req.params.id, req.user!.businessId);

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder;
    if (body.commissionType !== undefined)
      patch.commission_type = body.commissionType;
    if (body.commissionValue !== undefined)
      patch.commission_value = body.commissionValue;

    if (Object.keys(patch).length === 0) return res.json({ success: true });

    const { error } = await supabaseAdmin
      .from("service_stages")
      .update(patch)
      .eq("id", req.params.stageId)
      .eq("service_id", req.params.id)
      .eq("business_id", req.user!.businessId);
    if (error) {
      console.error("[STAGE UPDATE ERROR]", error);
      throw new AppError(500, "Gagal memperbarui tahap");
    }
    res.json({ success: true });
  }
);

/** DELETE /api/services/:id/stages/:stageId — owner hapus tahap. */
servicesRouter.delete(
  "/:id/stages/:stageId",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    await assertServiceOwned(req.params.id, req.user!.businessId);
    const { error } = await supabaseAdmin
      .from("service_stages")
      .delete()
      .eq("id", req.params.stageId)
      .eq("service_id", req.params.id)
      .eq("business_id", req.user!.businessId);
    if (error) {
      console.error("[STAGE DELETE ERROR]", error);
      throw new AppError(500, "Gagal menghapus tahap");
    }
    res.json({ success: true });
  }
);
