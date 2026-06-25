import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import { getOpenShiftId } from "../lib/cashShift.js";
import {
  createExpenseSchema,
  type CreateExpenseInput,
} from "../schemas/cash.js";

export const expensesRouter = Router();

const EXPENSE_COLS =
  "id, category, amount, is_cash, cash_shift_id, note, user_id, created_at";

/** GET /api/expenses — daftar pengeluaran (terbaru dulu). */
expensesRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select(EXPENSE_COLS)
    .eq("business_id", req.user!.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[EXPENSES LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat pengeluaran");
  }
  res.json({ expenses: data });
});

/**
 * POST /api/expenses — catat pengeluaran.
 * Jika tunai & ada shift terbuka, dikaitkan agar memengaruhi prediksi kas.
 */
expensesRouter.post(
  "/",
  authMiddleware,
  validateBody(createExpenseSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateExpenseInput;

    let cashShiftId: string | null = null;
    if (body.isCash) {
      cashShiftId = await getOpenShiftId(req.user!.businessId);
    }

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .insert({
        business_id: req.user!.businessId,
        user_id: req.user!.id,
        category: body.category,
        amount: body.amount,
        is_cash: body.isCash,
        cash_shift_id: cashShiftId,
        note: body.note ?? null,
      })
      .select(EXPENSE_COLS)
      .single();
    if (error) {
      console.error("[EXPENSE CREATE ERROR]", error);
      throw new AppError(500, "Gagal menyimpan pengeluaran");
    }
    res.status(201).json({ expense: data });
  }
);

/** DELETE /api/expenses/:id — hapus pengeluaran (owner saja). */
expensesRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("expenses")
      .delete()
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[EXPENSE DELETE ERROR]", error);
      throw new AppError(500, "Gagal menghapus pengeluaran");
    }
    if (!data) throw new AppError(404, "Pengeluaran tidak ditemukan");
    res.json({ success: true });
  }
);
