import { z } from "zod";

const paymentMethodEnum = z.enum(["qris", "tunai", "transfer"]);

/** Daftar membership: pilih pelanggan + paket. */
export const registerMembershipSchema = z.object({
  customerId: z.string().uuid(),
  packageId: z.string().uuid(),
});

export const cashierRegisterMembershipSchema = z
  .object({
    customerName: z.string().trim().min(1, "Nama pelanggan wajib diisi"),
    customerPhone: z.string().trim().min(8, "Nomor telepon wajib diisi"),
    packageId: z.string().uuid(),
    paymentMethod: paymentMethodEnum,
    proofUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.paymentMethod === "qris" || data.paymentMethod === "transfer") &&
      !data.proofUrl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bukti bayar wajib untuk QRIS/Transfer",
        path: ["proofUrl"],
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

export type RegisterMembershipInput = z.infer<typeof registerMembershipSchema>;
export type CashierRegisterMembershipInput = z.infer<
  typeof cashierRegisterMembershipSchema
>;
export type TopupMembershipInput = z.infer<typeof topupMembershipSchema>;
