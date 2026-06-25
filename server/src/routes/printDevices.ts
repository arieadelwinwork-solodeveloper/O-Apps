import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

export const printDevicesRouter = Router();

const createSchema = z.object({
  deviceName: z.string().min(1).max(120),
  deviceId: z.string().max(200).optional(),
});

const COLS = "id, device_name, device_id, created_at";

/** GET /api/print-devices — printer milik user. */
printDevicesRouter.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("print_devices")
      .select(COLS)
      .eq("business_id", req.user!.businessId)
      .eq("user_id", req.user!.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[PRINT DEVICES LIST ERROR]", error);
      throw new AppError(500, "Gagal memuat perangkat");
    }
    res.json({ devices: data });
  }
);

/** POST /api/print-devices — simpan printer yang dipasangkan. */
printDevicesRouter.post(
  "/",
  authMiddleware,
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as z.infer<typeof createSchema>;
    const { data, error } = await supabaseAdmin
      .from("print_devices")
      .insert({
        business_id: req.user!.businessId,
        user_id: req.user!.id,
        device_name: body.deviceName,
        device_id: body.deviceId ?? null,
      })
      .select(COLS)
      .single();
    if (error) {
      console.error("[PRINT DEVICE CREATE ERROR]", error);
      throw new AppError(500, "Gagal menyimpan perangkat");
    }
    res.status(201).json({ device: data });
  }
);

/** DELETE /api/print-devices/:id — hapus printer milik user. */
printDevicesRouter.delete(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("print_devices")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user!.id)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[PRINT DEVICE DELETE ERROR]", error);
      throw new AppError(500, "Gagal menghapus perangkat");
    }
    if (!data) throw new AppError(404, "Perangkat tidak ditemukan");
    res.json({ success: true });
  }
);
