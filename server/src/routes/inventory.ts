import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import { applyInventoryMovement } from "../lib/inventory.js";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  inventoryMovementSchema,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
  type InventoryMovementInput,
} from "../schemas/inventory.js";

export const inventoryRouter = Router();

const ITEM_COLS =
  "id, name, unit, current_stock, min_stock, last_restock_at, created_at";

/** GET /api/inventory — daftar barang (?lowStock=1 untuk perlu beli). */
inventoryRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("inventory_items")
    .select(ITEM_COLS)
    .eq("business_id", req.user!.businessId)
    .order("name", { ascending: true });
  if (error) {
    console.error("[INVENTORY LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat inventori");
  }

  let items = data ?? [];
  if (req.query.lowStock === "1") {
    items = items.filter(
      (i) => Number(i.current_stock) <= Number(i.min_stock)
    );
  }
  res.json({ items });
});

/** GET /api/inventory/:id/movements — riwayat mutasi barang. */
inventoryRouter.get(
  "/:id/movements",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { data: item, error: itemErr } = await supabaseAdmin
      .from("inventory_items")
      .select("id")
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .maybeSingle();
    if (itemErr || !item) throw new AppError(404, "Barang tidak ditemukan");

    const { data, error } = await supabaseAdmin
      .from("inventory_movements")
      .select(
        "id, change_type, qty, note, created_at, users(full_name)"
      )
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[INVENTORY MOVEMENTS ERROR]", error);
      throw new AppError(500, "Gagal memuat riwayat stok");
    }
    res.json({ movements: data });
  }
);

/** POST /api/inventory — owner tambah barang. */
inventoryRouter.post(
  "/",
  authMiddleware,
  requireRole("owner"),
  validateBody(createInventoryItemSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateInventoryItemInput;
    const businessId = req.user!.businessId;

    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .insert({
        business_id: businessId,
        name: body.name,
        unit: body.unit,
        min_stock: body.minStock,
        current_stock: body.initialStock,
        last_restock_at:
          body.initialStock > 0 ? new Date().toISOString() : null,
      })
      .select(ITEM_COLS)
      .single();
    if (error) {
      console.error("[INVENTORY CREATE ERROR]", error);
      throw new AppError(500, "Gagal menambah barang");
    }

    if (body.initialStock > 0) {
      await supabaseAdmin.from("inventory_movements").insert({
        business_id: businessId,
        item_id: data.id,
        user_id: req.user!.id,
        change_type: "masuk",
        qty: body.initialStock,
        note: "Stok awal",
      });
    }

    res.status(201).json({ item: data });
  }
);

/** PATCH /api/inventory/:id — owner ubah nama/satuan/min stok. */
inventoryRouter.patch(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  validateBody(updateInventoryItemSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdateInventoryItemInput;
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.unit !== undefined) patch.unit = body.unit;
    if (body.minStock !== undefined) patch.min_stock = body.minStock;

    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .update(patch)
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .select(ITEM_COLS)
      .maybeSingle();
    if (error) {
      console.error("[INVENTORY PATCH ERROR]", error);
      throw new AppError(500, "Gagal memperbarui barang");
    }
    if (!data) throw new AppError(404, "Barang tidak ditemukan");
    res.json({ item: data });
  }
);

/** DELETE /api/inventory/:id — owner hapus barang. */
inventoryRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const { error } = await supabaseAdmin
      .from("inventory_items")
      .delete()
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId);
    if (error) {
      console.error("[INVENTORY DELETE ERROR]", error);
      throw new AppError(500, "Gagal menghapus barang");
    }
    res.json({ success: true });
  }
);

/**
 * POST /api/inventory/:id/movements — catat mutasi.
 * Karyawan: keluar saja. Owner: masuk, keluar, adjust.
 */
inventoryRouter.post(
  "/:id/movements",
  authMiddleware,
  validateBody(inventoryMovementSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as InventoryMovementInput;
    const isOwner = req.user!.role === "owner";

    if (!isOwner && body.changeType !== "keluar") {
      throw new AppError(403, "Hanya owner yang boleh restock/koreksi stok");
    }

    const result = await applyInventoryMovement(
      req.user!.businessId,
      req.params.id,
      req.user!.id,
      body
    );
    res.json({ success: true, currentStock: result.currentStock });
  }
);
