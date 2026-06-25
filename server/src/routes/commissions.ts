import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const commissionsRouter = Router();

/**
 * GET /api/commissions — daftar komisi.
 * Karyawan: hanya miliknya. Owner: semua (bisa filter ?userId=).
 * Filter periode opsional: ?period=YYYY-MM
 */
commissionsRouter.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response) => {
    const isOwner = req.user!.role === "owner";

    let query = supabaseAdmin
      .from("commissions")
      .select("id, user_id, order_id, order_stage_id, amount, period, created_at")
      .eq("business_id", req.user!.businessId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!isOwner) {
      query = query.eq("user_id", req.user!.id);
    } else if (req.query.userId) {
      query = query.eq("user_id", req.query.userId as string);
    }
    if (req.query.period) {
      query = query.eq("period", req.query.period as string);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[COMMISSIONS LIST ERROR]", error);
      throw new AppError(500, "Gagal memuat komisi");
    }

    const total = (data ?? []).reduce((sum, c) => sum + (c.amount ?? 0), 0);
    res.json({ commissions: data, total });
  }
);

/**
 * GET /api/commissions/summary — ringkasan komisi per karyawan (owner).
 * Filter periode opsional: ?period=YYYY-MM
 */
commissionsRouter.get(
  "/summary",
  authMiddleware,
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;
    const isOwner = req.user!.role === "owner";

    let query = supabaseAdmin
      .from("commissions")
      .select("user_id, amount, period")
      .eq("business_id", businessId);
    if (!isOwner) query = query.eq("user_id", req.user!.id);
    if (req.query.period) query = query.eq("period", req.query.period as string);

    const { data, error } = await query;
    if (error) {
      console.error("[COMMISSIONS SUMMARY ERROR]", error);
      throw new AppError(500, "Gagal memuat ringkasan komisi");
    }

    const byUser = new Map<string, number>();
    for (const c of data ?? []) {
      byUser.set(c.user_id, (byUser.get(c.user_id) ?? 0) + (c.amount ?? 0));
    }

    const userIds = [...byUser.keys()];
    let names = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, full_name")
        .in("id", userIds);
      names = new Map((users ?? []).map((u) => [u.id, u.full_name]));
    }

    const summary = userIds.map((id) => ({
      userId: id,
      fullName: names.get(id) ?? "—",
      total: byUser.get(id) ?? 0,
    }));
    res.json({ summary });
  }
);
