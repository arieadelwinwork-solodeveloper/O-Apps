import { supabaseAdmin } from "./supabase.js";
import { AppError } from "../middleware/errorHandler.js";
import type { InventoryMovementInput } from "../schemas/inventory.js";

const ITEM_REF = "item_id:";

/** Hitung stok baru dari mutasi. `adjust` = set stok absolut ke `qty`. */
export function computeNewStock(
  current: number,
  changeType: InventoryMovementInput["changeType"],
  qty: number
): number {
  if (changeType === "masuk") return current + qty;
  if (changeType === "keluar") return current - qty;
  return qty;
}

/** Buat notifikasi stok menipis untuk owner (hindari duplikat belum dibaca). */
export async function maybeNotifyLowStock(
  businessId: string,
  itemId: string,
  itemName: string,
  currentStock: number,
  minStock: number,
  unit: string
): Promise<void> {
  if (currentStock > minStock) return;

  const { data: owners } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("business_id", businessId)
    .eq("role", "owner")
    .eq("is_active", true);
  if (!owners?.length) return;

  const refTag = `${ITEM_REF}${itemId}`;
  for (const owner of owners) {
    const { data: existing } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", owner.id)
      .eq("type", "stok_menipis")
      .eq("is_read", false)
      .ilike("body", `%${refTag}%`)
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    await supabaseAdmin.from("notifications").insert({
      business_id: businessId,
      user_id: owner.id,
      type: "stok_menipis",
      title: `Stok menipis: ${itemName}`,
      body: `Sisa ${currentStock} ${unit} (min ${minStock}). ${refTag}`,
    });
  }
}

/** Terapkan mutasi stok + catat riwayat + cek notifikasi. */
export async function applyInventoryMovement(
  businessId: string,
  itemId: string,
  userId: string,
  input: InventoryMovementInput
): Promise<{ currentStock: number }> {
  const { data: item, error: getErr } = await supabaseAdmin
    .from("inventory_items")
    .select("id, name, unit, current_stock, min_stock")
    .eq("id", itemId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (getErr || !item) throw new AppError(404, "Barang tidak ditemukan");

  const current = Number(item.current_stock);
  const newStock = computeNewStock(current, input.changeType, input.qty);
  if (newStock < 0) {
    throw new AppError(400, "Stok tidak mencukupi");
  }

  const updates: Record<string, unknown> = { current_stock: newStock };
  if (input.changeType === "masuk") {
    updates.last_restock_at = new Date().toISOString();
  }

  const { error: updErr } = await supabaseAdmin
    .from("inventory_items")
    .update(updates)
    .eq("id", item.id);
  if (updErr) {
    console.error("[INVENTORY UPDATE ERROR]", updErr);
    throw new AppError(500, "Gagal memperbarui stok");
  }

  const { error: movErr } = await supabaseAdmin
    .from("inventory_movements")
    .insert({
      business_id: businessId,
      item_id: item.id,
      user_id: userId,
      change_type: input.changeType,
      qty: input.qty,
      note: input.note ?? null,
    });
  if (movErr) {
    console.error("[INVENTORY MOVEMENT ERROR]", movErr);
    throw new AppError(500, "Gagal mencatat mutasi stok");
  }

  await maybeNotifyLowStock(
    businessId,
    item.id,
    item.name,
    newStock,
    Number(item.min_stock),
    item.unit
  );

  return { currentStock: newStock };
}
