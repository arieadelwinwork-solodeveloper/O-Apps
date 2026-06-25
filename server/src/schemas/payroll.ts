import { z } from "zod";

const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const createLoanSchema = z.object({
  userId: z.string().uuid().optional(),
  type: z.enum(["pinjaman", "hutang", "kerugian"]).default("pinjaman"),
  amount: z.number().int().positive(),
  note: z.string().max(500).optional(),
  // Owner langsung setujui saat input:
  deductionMode: z.enum(["langsung", "cicil", "berkala"]).optional(),
  deductionAmount: z.number().int().positive().optional(),
});

export const approveLoanSchema = z.object({
  status: z.enum(["disetujui", "ditolak"]),
  deductionMode: z.enum(["langsung", "cicil", "berkala"]).optional(),
  deductionAmount: z.number().int().positive().optional(),
});

export const generatePayrollSchema = z.object({
  period: z.string().regex(periodRegex, "Format periode: YYYY-MM"),
});

export const updatePayrollSchema = z.object({
  status: z.enum(["draft", "final", "dibayar"]),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type ApproveLoanInput = z.infer<typeof approveLoanSchema>;
export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type UpdatePayrollInput = z.infer<typeof updatePayrollSchema>;
