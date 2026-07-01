import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  updateBusinessSchema,
  type UpdateBusinessInput,
} from "../schemas/business.js";

export const businessRouter = Router();

const BUSINESS_COLS =
  "id, name, address, phone, whatsapp, open_time, close_time, attendance_lat, attendance_lng, attendance_radius_m, auto_send_complete_note, work_days_target, cash_drawer_visibility, cash_drawer_user_ids, monthly_revenue_target, daily_order_target, onboarding_step, onboarding_completed";

function mapBusiness(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    openTime: row.open_time,
    closeTime: row.close_time,
    attendanceLat: row.attendance_lat,
    attendanceLng: row.attendance_lng,
    attendanceRadiusM: row.attendance_radius_m,
    autoSendCompleteNote: row.auto_send_complete_note,
    workDaysTarget: row.work_days_target,
    cashDrawerVisibility: row.cash_drawer_visibility,
    cashDrawerUserIds: row.cash_drawer_user_ids ?? [],
    monthlyRevenueTarget: row.monthly_revenue_target ?? 0,
    dailyOrderTarget: row.daily_order_target ?? 0,
    onboardingStep: row.onboarding_step ?? 0,
    onboardingCompleted: row.onboarding_completed ?? false,
  };
}

/** GET /api/business — info bisnis user yang login. */
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
  res.json({ business: mapBusiness(data) });
});

/** PATCH /api/business — owner ubah profil & pengaturan operasional. */
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
    if (body.whatsapp !== undefined) patch.whatsapp = body.whatsapp;
    if (body.openTime !== undefined) patch.open_time = body.openTime;
    if (body.closeTime !== undefined) patch.close_time = body.closeTime;
    if (body.attendanceLat !== undefined) patch.attendance_lat = body.attendanceLat;
    if (body.attendanceLng !== undefined) patch.attendance_lng = body.attendanceLng;
    if (body.attendanceRadiusM !== undefined)
      patch.attendance_radius_m = body.attendanceRadiusM;
    if (body.autoSendCompleteNote !== undefined)
      patch.auto_send_complete_note = body.autoSendCompleteNote;
    if (body.workDaysTarget !== undefined)
      patch.work_days_target = body.workDaysTarget;
    if (body.cashDrawerVisibility !== undefined)
      patch.cash_drawer_visibility = body.cashDrawerVisibility;
    if (body.cashDrawerUserIds !== undefined)
      patch.cash_drawer_user_ids = body.cashDrawerUserIds;
    if (body.monthlyRevenueTarget !== undefined)
      patch.monthly_revenue_target = body.monthlyRevenueTarget;
    if (body.dailyOrderTarget !== undefined)
      patch.daily_order_target = body.dailyOrderTarget;
    if (body.onboardingStep !== undefined)
      patch.onboarding_step = body.onboardingStep;
    if (body.onboardingCompleted !== undefined)
      patch.onboarding_completed = body.onboardingCompleted;

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
    res.json({ business: mapBusiness(data) });
  }
);
