import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import { computeShiftCash } from "../lib/cashShift.js";
import {
  openShiftSchema,
  closeShiftSchema,
  type OpenShiftInput,
  type CloseShiftInput,
} from "../schemas/cash.js";

export const cashRouter = Router();

const SHIFT_COLS =
  "id, opening_cash, expected_cash, closing_cash, variance, status, note, opened_by, closed_by, opened_at, closed_at";

/**
 * GET /api/cash-shifts/current — shift terbuka + prediksi kas, atau null.
 */
cashRouter.get(
  "/current",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { data: shift, error } = await supabaseAdmin
      .from("cash_shifts")
      .select(SHIFT_COLS)
      .eq("business_id", req.user!.businessId)
      .eq("status", "open")
      .maybeSingle();
    if (error) {
      console.error("[SHIFT CURRENT ERROR]", error);
      throw new AppError(500, "Gagal memuat kas");
    }
    if (!shift) return res.json({ shift: null });

    const breakdown = await computeShiftCash(shift.id, shift.opening_cash);
    res.json({ shift, breakdown });
  }
);

/**
 * GET /api/cash-shifts — riwayat shift (terbaru dulu).
 */
cashRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("cash_shifts")
    .select(SHIFT_COLS)
    .eq("business_id", req.user!.businessId)
    .order("opened_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[SHIFT LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat riwayat kas");
  }
  res.json({ shifts: data });
});

/**
 * POST /api/cash-shifts/open — buka shift baru.
 */
cashRouter.post(
  "/open",
  authMiddleware,
  validateBody(openShiftSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as OpenShiftInput;

    const { data, error } = await supabaseAdmin
      .from("cash_shifts")
      .insert({
        business_id: req.user!.businessId,
        opened_by: req.user!.id,
        opening_cash: body.openingCash,
        expected_cash: body.openingCash,
        status: "open",
        note: body.note ?? null,
      })
      .select(SHIFT_COLS)
      .single();
    if (error) {
      // unique index uq_cash_shift_open → sudah ada shift terbuka.
      if (error.code === "23505") {
        throw new AppError(400, "Masih ada shift kas yang terbuka");
      }
      console.error("[SHIFT OPEN ERROR]", error);
      throw new AppError(500, "Gagal membuka kas");
    }
    res.status(201).json({ shift: data });
  }
);

/**
 * POST /api/cash-shifts/close — tutup shift terbuka, hitung selisih.
 */
cashRouter.post(
  "/close",
  authMiddleware,
  validateBody(closeShiftSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CloseShiftInput;

    const { data: shift, error: getErr } = await supabaseAdmin
      .from("cash_shifts")
      .select("id, opening_cash")
      .eq("business_id", req.user!.businessId)
      .eq("status", "open")
      .maybeSingle();
    if (getErr) {
      console.error("[SHIFT CLOSE GET ERROR]", getErr);
      throw new AppError(500, "Gagal memuat kas");
    }
    if (!shift) throw new AppError(400, "Tidak ada shift kas yang terbuka");

    const { expected } = await computeShiftCash(shift.id, shift.opening_cash);
    const variance = body.closingCash - expected;

    const { data, error } = await supabaseAdmin
      .from("cash_shifts")
      .update({
        closing_cash: body.closingCash,
        expected_cash: expected,
        variance,
        status: "closed",
        closed_by: req.user!.id,
        closed_at: new Date().toISOString(),
        ...(body.note ? { note: body.note } : {}),
      })
      .eq("id", shift.id)
      .eq("business_id", req.user!.businessId)
      .select(SHIFT_COLS)
      .single();
    if (error) {
      console.error("[SHIFT CLOSE ERROR]", error);
      throw new AppError(500, "Gagal menutup kas");
    }
    res.json({ shift: data, expected, variance });
  }
);
