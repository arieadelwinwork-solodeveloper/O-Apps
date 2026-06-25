import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  updateBusinessSchema,
  type UpdateBusinessInput,
} from "../schemas/attendance.js";

export const businessRouter = Router();

const BUSINESS_COLS =
  "id, name, address, phone, attendance_lat, attendance_lng, attendance_radius_m";

/** GET /api/business — info bisnis user yang login (header nota, konfigurasi absensi). */
businessRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select(BUSINESS_COLS)
    .eq("id", req.user!.businessId)
    .maybeSingle();
  if (error) {
    console.error("[BUSINESS GET ERROR]", error);
    throw new AppError(500, "Gagal memuat data bisnis");
  }
  if (!data) throw new AppError(404, "Bisnis tidak ditemukan");
  res.json({ business: data });
});

/** PATCH /api/business — owner ubah profil & titik/radius absensi. */
businessRouter.patch(
  "/",
  authMiddleware,
  requireRole("owner"),
  validateBody(updateBusinessSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdateBusinessInput;
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.address !== undefined) patch.address = body.address;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.attendanceLat !== undefined) patch.attendance_lat = body.attendanceLat;
    if (body.attendanceLng !== undefined) patch.attendance_lng = body.attendanceLng;
    if (body.attendanceRadiusM !== undefined)
      patch.attendance_radius_m = body.attendanceRadiusM;

    if (Object.keys(patch).length === 0) return res.json({ success: true });

    const { data, error } = await supabaseAdmin
      .from("businesses")
      .update(patch)
      .eq("id", req.user!.businessId)
      .select(BUSINESS_COLS)
      .single();
    if (error) {
      console.error("[BUSINESS UPDATE ERROR]", error);
      throw new AppError(500, "Gagal memperbarui bisnis");
    }
    res.json({ business: data });
  }
);
