import { z } from "zod";

/** Daftar membership: pilih pelanggan + paket. */
export const registerMembershipSchema = z.object({
  customerId: z.string().uuid(),
  packageId: z.string().uuid(),
});

export const topupMembershipSchema = z.object({
  amount: z.number().int().positive(),
});

export const quotaUsageSchema = z.object({
  membershipId: z.string().uuid(),
  qty: z.number().positive().max(100000),
});

export type RegisterMembershipInput = z.infer<typeof registerMembershipSchema>;
export type TopupMembershipInput = z.infer<typeof topupMembershipSchema>;
