import { z } from "zod";

export const openShiftSchema = z.object({
  openingCash: z.number().int().nonnegative(),
  note: z.string().max(500).optional(),
});

export const closeShiftSchema = z.object({
  closingCash: z.number().int().nonnegative(),
  note: z.string().max(500).optional(),
});

export const createExpenseSchema = z.object({
  category: z.string().min(1).max(120),
  amount: z.number().int().positive(),
  isCash: z.boolean().default(true),
  note: z.string().max(500).optional(),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
