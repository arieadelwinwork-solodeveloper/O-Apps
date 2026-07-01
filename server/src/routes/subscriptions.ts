import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const subscriptionsRouter = Router();

/**
 * GET /api/subscriptions — status langganan bisnis saat ini.
 */
subscriptionsRouter.get(
  "/",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;

    const { data: sub, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan, status, trial_ends_at, expires_at, created_at")
      .eq("business_id", businessId)
      .maybeSingle();
    if (error) {
      console.error("[SUBSCRIPTION GET ERROR]", error);
      throw new AppError(500, "Gagal memuat langganan");
    }

    let payments: unknown[] = [];
    if (sub) {
      const { data: payRows } = await supabaseAdmin
        .from("subscription_payments")
        .select("id, amount, plan, period_start, period_end, status, created_at")
        .eq("subscription_id", sub.id)
        .order("created_at", { ascending: false })
        .limit(20);
      payments = payRows ?? [];
    }

    res.json({ subscription: sub, payments });
  }
);
