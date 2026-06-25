import { z } from "zod";

export const paymentStatusEnum = z.enum([
  "lunas_depan",
  "dp",
  "bayar_belakang",
]);
export const paymentMethodEnum = z.enum(["qris", "tunai", "transfer"]);
export const workStatusEnum = z.enum([
  "antri",
  "proses",
  "selesai",
  "diambil",
]);

import { quotaUsageSchema } from "./membership.js";

const orderItemSchema = z.object({
  serviceId: z.string().uuid(),
  qty: z.number().positive().max(100000),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerPhone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
  items: z.array(orderItemSchema).min(1, "Minimal 1 layanan"),
  paymentStatus: paymentStatusEnum,
  paymentMethod: paymentMethodEnum,
  // Dipakai hanya saat paymentStatus = 'dp'. Untuk lunas/belakang dihitung server.
  paidAmount: z.number().int().nonnegative().optional(),
  proofUrl: z.string().url().max(1000).optional(),
  estimatedDoneAt: z.string().datetime().optional(),
  // Fase I: potongan membership
  membershipSaldoAmount: z.number().int().nonnegative().optional(),
  membershipQuotaUsages: z.array(quotaUsageSchema).optional(),
});

export const updateOrderStatusSchema = z.object({
  workStatus: workStatusEnum,
});

export const settlePaymentSchema = z.object({
  paidAmount: z.number().int().positive(),
  paymentMethod: paymentMethodEnum,
  proofUrl: z.string().url().max(1000).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type SettlePaymentInput = z.infer<typeof settlePaymentSchema>;
