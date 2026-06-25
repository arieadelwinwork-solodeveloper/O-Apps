import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  registerSchema,
  updateProfileSchema,
  type RegisterInput,
  type UpdateProfileInput,
} from "../schemas/auth.js";

export const authRouter = Router();

/**
 * POST /api/auth/register
 * Membuat OWNER baru sekaligus bisnisnya. Dijalankan via service role
 * (insert businesses dikontrol di backend, bukan dari client).
 */
authRouter.post(
  "/register",
  validateBody(registerSchema),
  async (_req: Request, res: Response) => {
    const { email, password, fullName, businessName } = res.locals
      .body as RegisterInput;

    // 1) Buat akun auth (email langsung terkonfirmasi untuk kemudahan awal).
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      throw new AppError(400, "Gagal membuat akun, periksa email/password");
    }
    const userId = created.user.id;

    // 2) Buat bisnis.
    const { data: business, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .insert({ name: businessName })
      .select("id")
      .single();
    if (bizErr || !business) {
      await supabaseAdmin.auth.admin.deleteUser(userId); // rollback
      throw new AppError(500, "Gagal membuat bisnis");
    }

    // 3) Buat profil user sebagai owner.
    const { error: userErr } = await supabaseAdmin.from("users").insert({
      id: userId,
      business_id: business.id,
      full_name: fullName,
      role: "owner",
    });
    if (userErr) {
      await supabaseAdmin.from("businesses").delete().eq("id", business.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new AppError(500, "Gagal membuat profil pengguna");
    }

    // 4) Set owner_id pada bisnis.
    await supabaseAdmin
      .from("businesses")
      .update({ owner_id: userId })
      .eq("id", business.id);

    res.status(201).json({ success: true, businessId: business.id });
  }
);

/**
 * GET /api/auth/me — profil user yang login.
 */
authRouter.get("/me", authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

/**
 * PATCH /api/auth/me — update profil sendiri (tidak bisa ubah role/business).
 */
authRouter.patch(
  "/me",
  authMiddleware,
  validateBody(updateProfileSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdateProfileInput;
    const patch: Record<string, unknown> = {};
    if (body.fullName !== undefined) patch.full_name = body.fullName;
    if (body.phone !== undefined) patch.phone = body.phone;

    if (Object.keys(patch).length === 0) {
      return res.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update(patch)
      .eq("id", req.user!.id);
    if (error) {
      console.error("[PROFILE UPDATE ERROR]", error);
      throw new AppError(500, "Gagal memperbarui profil");
    }
    res.json({ success: true });
  }
);
