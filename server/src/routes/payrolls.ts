import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  calculatePayroll,
  applyLoanDeductions,
} from "../lib/payrollCalc.js";
import {
  generatePayrollSchema,
  updatePayrollSchema,
  type GeneratePayrollInput,
  type UpdatePayrollInput,
} from "../schemas/payroll.js";

export const payrollsRouter = Router();

const PAYROLL_COLS =
  "id, user_id, period, base_salary, commission_total, attendance_days, deductions, net_pay, status, created_at";

/** GET /api/payrolls — daftar slip (?period=YYYY-MM, ?userId= owner). */
payrollsRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const isOwner = req.user!.role === "owner";
  let query = supabaseAdmin
    .from("payrolls")
    .select(`${PAYROLL_COLS}, users(full_name)`)
    .eq("business_id", req.user!.businessId)
    .order("period", { ascending: false })
    .limit(100);
  if (!isOwner) query = query.eq("user_id", req.user!.id);
  else if (req.query.userId) query = query.eq("user_id", req.query.userId as string);
  if (req.query.period) query = query.eq("period", req.query.period as string);

  const { data, error } = await query;
  if (error) {
    console.error("[PAYROLLS LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat penggajian");
  }
  res.json({ payrolls: data });
});

/** POST /api/payrolls/generate — owner hitung ulang slip draft semua karyawan aktif. */
payrollsRouter.post(
  "/generate",
  authMiddleware,
  requireRole("owner"),
  validateBody(generatePayrollSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as GeneratePayrollInput;
    const businessId = req.user!.businessId;
    const period = body.period;

    const { data: employees, error: empErr } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .neq("role", "owner");
    if (empErr) {
      console.error("[PAYROLL EMPLOYEES ERROR]", empErr);
      throw new AppError(500, "Gagal memuat karyawan");
    }

    const results = [];
    for (const emp of employees ?? []) {
      const calc = await calculatePayroll(businessId, emp.id, period);

      const { data: existing } = await supabaseAdmin
        .from("payrolls")
        .select("id, status")
        .eq("business_id", businessId)
        .eq("user_id", emp.id)
        .eq("period", period)
        .maybeSingle();

      if (existing && existing.status !== "draft") {
        results.push({ userId: emp.id, skipped: true, reason: "sudah final" });
        continue;
      }

      const row = {
        business_id: businessId,
        user_id: emp.id,
        period,
        base_salary: calc.baseSalary,
        commission_total: calc.commissionTotal,
        attendance_days: calc.attendanceDays,
        deductions: calc.deductions,
        net_pay: calc.netPay,
        status: "draft" as const,
      };

      if (existing) {
        await supabaseAdmin.from("payrolls").update(row).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("payrolls").insert(row);
      }
      results.push({ userId: emp.id, netPay: calc.netPay });
    }

    res.json({ success: true, generated: results.length, details: results });
  }
);

/** PATCH /api/payrolls/:id — owner ubah status (final/dibayar → potong pinjaman). */
payrollsRouter.patch(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  validateBody(updatePayrollSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdatePayrollInput;

    const { data: payroll, error: getErr } = await supabaseAdmin
      .from("payrolls")
      .select("id, user_id, period, status, deductions")
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .maybeSingle();
    if (getErr) {
      console.error("[PAYROLL GET ERROR]", getErr);
      throw new AppError(500, "Gagal memuat slip gaji");
    }
    if (!payroll) throw new AppError(404, "Slip gaji tidak ditemukan");

    const wasDraft = payroll.status === "draft";
    const applyingDeductions =
      wasDraft && (body.status === "final" || body.status === "dibayar");

    if (applyingDeductions && payroll.deductions > 0) {
      const calc = await calculatePayroll(
        req.user!.businessId,
        payroll.user_id,
        payroll.period
      );
      await applyLoanDeductions(calc.loanDeductions);
    }

    const { error } = await supabaseAdmin
      .from("payrolls")
      .update({ status: body.status })
      .eq("id", payroll.id);
    if (error) {
      console.error("[PAYROLL UPDATE ERROR]", error);
      throw new AppError(500, "Gagal memperbarui slip gaji");
    }
    res.json({ success: true });
  }
);
