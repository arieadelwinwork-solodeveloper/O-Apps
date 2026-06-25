import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const notificationsRouter = Router();

const NOTIF_COLS = "id, type, title, body, is_read, created_at";

/** GET /api/notifications — pusat notifikasi owner. */
notificationsRouter.get(
  "/",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const unreadOnly = req.query.unread === "1";

    let query = supabaseAdmin
      .from("notifications")
      .select(NOTIF_COLS)
      .eq("business_id", req.user!.businessId)
      .eq("user_id", req.user!.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;
    if (error) {
      console.error("[NOTIFICATIONS LIST ERROR]", error);
      throw new AppError(500, "Gagal memuat notifikasi");
    }

    const unread = (data ?? []).filter((n) => !n.is_read).length;
    res.json({ notifications: data, unreadCount: unread });
  }
);

/** PATCH /api/notifications/read-all — tandai semua dibaca. */
notificationsRouter.patch(
  "/read-all",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("business_id", req.user!.businessId)
      .eq("user_id", req.user!.id)
      .eq("is_read", false);
    if (error) {
      console.error("[NOTIFICATIONS READ ALL ERROR]", error);
      throw new AppError(500, "Gagal memperbarui notifikasi");
    }
    res.json({ success: true });
  }
);

/** PATCH /api/notifications/:id/read — tandai satu dibaca. */
notificationsRouter.patch(
  "/:id/read",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .eq("user_id", req.user!.id);
    if (error) {
      console.error("[NOTIFICATION READ ERROR]", error);
      throw new AppError(500, "Gagal memperbarui notifikasi");
    }
    res.json({ success: true });
  }
);
