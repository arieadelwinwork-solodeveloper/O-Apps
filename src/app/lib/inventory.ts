import { apiFetch } from "./api";
import type {
  InventoryItem,
  InventoryMovement,
  InventoryChangeType,
} from "../types";

export const CHANGE_TYPE_LABEL: Record<InventoryChangeType, string> = {
  masuk: "Masuk",
  keluar: "Keluar",
  adjust: "Koreksi",
};

export async function listInventory(lowStockOnly?: boolean): Promise<InventoryItem[]> {
  const qs = lowStockOnly ? "?lowStock=1" : "";
  const { items } = await apiFetch<{ items: InventoryItem[] }>(
    `/api/inventory${qs}`
  );
  return items;
}

export async function listInventoryMovements(
  itemId: string
): Promise<InventoryMovement[]> {
  const { movements } = await apiFetch<{ movements: InventoryMovement[] }>(
    `/api/inventory/${itemId}/movements`
  );
  return movements;
}

export interface CreateInventoryInput {
  name: string;
  unit: string;
  minStock: number;
  initialStock: number;
}

export async function createInventoryItem(
  input: CreateInventoryInput
): Promise<InventoryItem> {
  const { item } = await apiFetch<{ item: InventoryItem }>("/api/inventory", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return item;
}

export async function updateInventoryItem(
  id: string,
  input: { name?: string; unit?: string; minStock?: number }
): Promise<InventoryItem> {
  const { item } = await apiFetch<{ item: InventoryItem }>(
    `/api/inventory/${id}`,
    { method: "PATCH", body: JSON.stringify(input) }
  );
  return item;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiFetch(`/api/inventory/${id}`, { method: "DELETE" });
}

export async function recordInventoryMovement(
  itemId: string,
  input: { changeType: InventoryChangeType; qty: number; note?: string }
): Promise<number> {
  const { currentStock } = await apiFetch<{ currentStock: number }>(
    `/api/inventory/${itemId}/movements`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return currentStock;
}

export function isLowStock(item: InventoryItem): boolean {
  return Number(item.current_stock) <= Number(item.min_stock);
}

export function formatStock(n: number, unit: string): string {
  return `${n} ${unit}`;
}
