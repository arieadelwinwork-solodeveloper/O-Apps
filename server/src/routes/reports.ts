import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  createReportSchema,
  type CreateReportInput,
} from "../schemas/reports.js";
import { notifyOwnersOfReport } from "../lib/reports.js";

export const reportsRouter = Router();

const REPORT_COLS =
  "id, category, message, created_at, reporter_id, users(full_name)";

/** GET /api/reports — owner: semua laporan; karyawan: milik sendiri. */
reportsRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  let query = supabaseAdmin
    .from("operational_reports")
    .select(REPORT_COLS)
    .eq("business_id", req.user!.businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (req.user!.role !== "owner") {
    query = query.eq("reporter_id", req.user!.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[REPORTS LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat laporan");
  }
  res.json({ reports: data });
});

/** GET /api/reports/:id — detail satu laporan (bisnis sama). */
reportsRouter.get(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    let query = supabaseAdmin
      .from("operational_reports")
      .select(REPORT_COLS)
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId);

    if (req.user!.role !== "owner") {
      query = query.eq("reporter_id", req.user!.id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("[REPORT GET ERROR]", error);
      throw new AppError(500, "Gagal memuat laporan");
    }
    if (!data) throw new AppError(404, "Laporan tidak ditemukan");
    res.json({ report: data });
  }
);

/** POST /api/reports — kirim laporan ke owner. */
reportsRouter.post(
  "/",
  authMiddleware,
  validateBody(createReportSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateReportInput;

    const { data, error } = await supabaseAdmin
      .from("operational_reports")
      .insert({
        business_id: req.user!.businessId,
        reporter_id: req.user!.id,
        category: body.category,
        message: body.message,
      })
      .select(REPORT_COLS)
      .single();

    if (error) {
      console.error("[REPORT CREATE ERROR]", error);
      throw new AppError(500, "Gagal mengirim laporan");
    }

    const reporterName =
      (data.users as { full_name: string } | null)?.full_name ??
      req.user!.fullName ??
      "Karyawan";

    await notifyOwnersOfReport(
      req.user!.businessId,
      data.id,
      body.category,
      reporterName,
      body.message
    );

    res.status(201).json({ report: data });
  }
);
