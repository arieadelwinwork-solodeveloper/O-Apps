import { z } from "zod";

export const createMembershipSchema = z
  .object({
    customerId: z.string().uuid(),
    type: z.enum(["saldo", "kuota"]),
    initialAmount: z.number().int().positive(),
    quotaServiceId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "kuota" && !data.quotaServiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Layanan wajib untuk membership kuota",
        path: ["quotaServiceId"],
      });
    }
    if (data.type === "saldo" && data.quotaServiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quotaServiceId tidak dipakai untuk saldo",
        path: ["quotaServiceId"],
      });
    }
  });

export const topupMembershipSchema = z.object({
  amount: z.number().int().positive(),
});

export const quotaUsageSchema = z.object({
  membershipId: z.string().uuid(),
  qty: z.number().positive().max(100000),
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
export type TopupMembershipInput = z.infer<typeof topupMembershipSchema>;
