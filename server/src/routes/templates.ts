import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  createTemplateSchema,
  updateTemplateSchema,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from "../schemas/customization.js";

export const templatesRouter = Router();

const TEMPLATE_COLS = "id, type, name, body, is_default, created_at";

/** Jika template ditandai default, lepas default lain dengan type sama. */
async function clearOtherDefaults(
  businessId: string,
  type: string,
  exceptId?: string
) {
  let query = supabaseAdmin
    .from("message_templates")
    .update({ is_default: false })
    .eq("business_id", businessId)
    .eq("type", type)
    .eq("is_default", true);
  if (exceptId) query = query.neq("id", exceptId);
  await query;
}

/** GET /api/templates — semua anggota bisnis boleh baca. */
templatesRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("message_templates")
    .select(TEMPLATE_COLS)
    .eq("business_id", req.user!.businessId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[TEMPLATES LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat template");
  }
  res.json({ templates: data });
});

/** POST /api/templates — owner buat template. */
templatesRouter.post(
  "/",
  authMiddleware,
  requireRole("owner"),
  validateBody(createTemplateSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateTemplateInput;

    const { data, error } = await supabaseAdmin
      .from("message_templates")
      .insert({
        business_id: req.user!.businessId,
        type: body.type,
        name: body.name,
        body: body.body,
        is_default: body.isDefault,
      })
      .select(TEMPLATE_COLS)
      .single();
    if (error) {
      console.error("[TEMPLATE CREATE ERROR]", error);
      throw new AppError(500, "Gagal membuat template");
    }
    if (body.isDefault) {
      await clearOtherDefaults(req.user!.businessId, body.type, data.id);
    }
    res.status(201).json({ template: data });
  }
);

/** PATCH /api/templates/:id — owner ubah template. */
templatesRouter.patch(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  validateBody(updateTemplateSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdateTemplateInput;

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("message_templates")
      .select("id, type")
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .maybeSingle();
    if (lookupErr) {
      console.error("[TEMPLATE LOOKUP ERROR]", lookupErr);
      throw new AppError(500, "Gagal memuat template");
    }
    if (!existing) throw new AppError(404, "Template tidak ditemukan");

    const patch: Record<string, unknown> = {};
    if (body.type !== undefined) patch.type = body.type;
    if (body.name !== undefined) patch.name = body.name;
    if (body.body !== undefined) patch.body = body.body;
    if (body.isDefault !== undefined) patch.is_default = body.isDefault;

    if (Object.keys(patch).length === 0) return res.json({ success: true });

    const { error } = await supabaseAdmin
      .from("message_templates")
      .update(patch)
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId);
    if (error) {
      console.error("[TEMPLATE UPDATE ERROR]", error);
      throw new AppError(500, "Gagal memperbarui template");
    }

    if (body.isDefault) {
      const type = (body.type ?? existing.type) as string;
      await clearOtherDefaults(req.user!.businessId, type, req.params.id);
    }
    res.json({ success: true });
  }
);

/** DELETE /api/templates/:id — owner hapus template. */
templatesRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("message_templates")
      .select("id")
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .maybeSingle();
    if (lookupErr) {
      console.error("[TEMPLATE LOOKUP ERROR]", lookupErr);
      throw new AppError(500, "Gagal memuat template");
    }
    if (!existing) throw new AppError(404, "Template tidak ditemukan");

    const { error } = await supabaseAdmin
      .from("message_templates")
      .delete()
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId);
    if (error) {
      console.error("[TEMPLATE DELETE ERROR]", error);
      throw new AppError(500, "Gagal menghapus template");
    }
    res.json({ success: true });
  }
);
