import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  createEmployeeSchema,
  updateEmployeeSalarySchema,
  type CreateEmployeeInput,
  type UpdateEmployeeSalaryInput,
} from "../schemas/auth.js";

export const usersRouter = Router();

/**
 * GET /api/users — daftar anggota bisnis (semua role boleh lihat nama rekan).
 */
usersRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, role, phone, is_active, base_salary, created_at")
    .eq("business_id", req.user!.businessId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[USERS LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat data pengguna");
  }
  res.json({ users: data });
});

/**
 * POST /api/users — owner menambah karyawan ke bisnisnya.
 */
usersRouter.post(
  "/",
  authMiddleware,
  requireRole("owner"),
  validateBody(createEmployeeSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateEmployeeInput;

    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      throw new AppError(400, "Gagal membuat akun karyawan");
    }

    const { error: userErr } = await supabaseAdmin.from("users").insert({
      id: created.user.id,
      business_id: req.user!.businessId,
      full_name: body.fullName,
      role: "karyawan",
      phone: body.phone ?? null,
      base_salary: body.baseSalary,
    });
    if (userErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      console.error("[EMPLOYEE CREATE ERROR]", userErr);
      throw new AppError(500, "Gagal menyimpan profil karyawan");
    }

    res.status(201).json({ success: true, userId: created.user.id });
  }
);

/**
 * PATCH /api/users/:id — owner ubah gaji pokok karyawan.
 */
usersRouter.patch(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  validateBody(updateEmployeeSalarySchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdateEmployeeSalaryInput;

    const { data: target, error: getErr } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .maybeSingle();
    if (getErr) {
      console.error("[USER GET ERROR]", getErr);
      throw new AppError(500, "Gagal memuat pengguna");
    }
    if (!target) throw new AppError(404, "Pengguna tidak ditemukan");
    if (target.role === "owner") {
      throw new AppError(400, "Gaji owner tidak diubah lewat endpoint ini");
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({ base_salary: body.baseSalary })
      .eq("id", target.id);
    if (error) {
      console.error("[USER SALARY UPDATE ERROR]", error);
      throw new AppError(500, "Gagal memperbarui gaji pokok");
    }
    res.json({ success: true });
  }
);
