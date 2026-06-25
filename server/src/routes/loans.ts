import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  createLoanSchema,
  approveLoanSchema,
  type CreateLoanInput,
  type ApproveLoanInput,
} from "../schemas/payroll.js";

export const loansRouter = Router();

const LOAN_COLS =
  "id, user_id, type, amount, remaining, status, deduction_mode, deduction_amount, note, requested_by, approved_by, created_at";

/** GET /api/loans — karyawan: miliknya; owner: semua (?userId=). */
loansRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const isOwner = req.user!.role === "owner";
  let query = supabaseAdmin
    .from("loans")
    .select(`${LOAN_COLS}, users(full_name)`)
    .eq("business_id", req.user!.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (!isOwner) query = query.eq("user_id", req.user!.id);
  else if (req.query.userId) query = query.eq("user_id", req.query.userId as string);

  const { data, error } = await query;
  if (error) {
    console.error("[LOANS LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat pinjaman");
  }
  res.json({ loans: data });
});

/**
 * POST /api/loans — karyawan ajukan pinjaman; owner bisa input langsung (disetujui).
 */
loansRouter.post(
  "/",
  authMiddleware,
  validateBody(createLoanSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateLoanInput;
    const isOwner = req.user!.role === "owner";
    const targetUserId = isOwner && body.userId ? body.userId : req.user!.id;

    if (!isOwner && body.userId && body.userId !== req.user!.id) {
      throw new AppError(403, "Tidak diizinkan");
    }

    let status: "diajukan" | "disetujui" = "diajukan";
    let deductionMode = body.deductionMode ?? null;
    let deductionAmount = body.deductionAmount ?? null;
    let approvedBy: string | null = null;

    if (isOwner) {
      status = "disetujui";
      approvedBy = req.user!.id;
      if (!deductionMode) deductionMode = "cicil";
      if (!deductionAmount && deductionMode !== "langsung") {
        throw new AppError(400, "Nominal potongan wajib untuk cicil/berkala");
      }
      if (deductionMode === "langsung") {
        deductionAmount = body.amount;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("loans")
      .insert({
        business_id: req.user!.businessId,
        user_id: targetUserId,
        type: body.type,
        amount: body.amount,
        remaining: body.amount,
        status,
        deduction_mode: deductionMode,
        deduction_amount: deductionAmount,
        note: body.note ?? null,
        requested_by: req.user!.id,
        approved_by: approvedBy,
      })
      .select(LOAN_COLS)
      .single();
    if (error) {
      console.error("[LOAN CREATE ERROR]", error);
      throw new AppError(500, "Gagal menyimpan pinjaman");
    }
    res.status(201).json({ loan: data });
  }
);

/** PATCH /api/loans/:id — owner setujui/tolak + atur potongan. */
loansRouter.patch(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  validateBody(approveLoanSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as ApproveLoanInput;

    const { data: loan, error: getErr } = await supabaseAdmin
      .from("loans")
      .select("id, amount, status")
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .maybeSingle();
    if (getErr) {
      console.error("[LOAN GET ERROR]", getErr);
      throw new AppError(500, "Gagal memuat pinjaman");
    }
    if (!loan) throw new AppError(404, "Pinjaman tidak ditemukan");
    if (loan.status !== "diajukan") {
      throw new AppError(400, "Pinjaman sudah diproses");
    }

    if (body.status === "ditolak") {
      const { error } = await supabaseAdmin
        .from("loans")
        .update({ status: "ditolak", approved_by: req.user!.id })
        .eq("id", loan.id);
      if (error) throw new AppError(500, "Gagal menolak pinjaman");
      return res.json({ success: true });
    }

    const mode = body.deductionMode ?? "cicil";
    let dedAmount = body.deductionAmount;
    if (mode === "langsung") {
      dedAmount = loan.amount;
    } else if (!dedAmount || dedAmount <= 0) {
      throw new AppError(400, "Nominal potongan wajib untuk cicil/berkala");
    }

    const { error } = await supabaseAdmin
      .from("loans")
      .update({
        status: "disetujui",
        deduction_mode: mode,
        deduction_amount: dedAmount,
        approved_by: req.user!.id,
      })
      .eq("id", loan.id);
    if (error) {
      console.error("[LOAN APPROVE ERROR]", error);
      throw new AppError(500, "Gagal menyetujui pinjaman");
    }
    res.json({ success: true });
  }
);
