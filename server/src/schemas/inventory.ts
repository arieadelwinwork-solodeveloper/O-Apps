import { z } from "zod";

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.string().min(1).max(30).default("pcs"),
  minStock: z.number().nonnegative().default(0),
  initialStock: z.number().nonnegative().default(0),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  unit: z.string().min(1).max(30).optional(),
  minStock: z.number().nonnegative().optional(),
});

export const inventoryMovementSchema = z.object({
  changeType: z.enum(["masuk", "keluar", "adjust"]),
  qty: z.number().positive(),
  note: z.string().max(500).optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
