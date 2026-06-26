import { z } from "zod";

const packageBase = z.object({
  name: z.string().min(1).max(120),
  price: z.number().int().positive(),
});

export const createSaldoPackageSchema = packageBase.extend({
  type: z.literal("saldo"),
  saldoAmount: z.number().int().positive(),
});

export const createKuotaPackageSchema = packageBase.extend({
  type: z.literal("kuota"),
  quotaAmount: z.number().int().positive(),
  quotaServiceId: z.string().uuid(),
});

export const createMembershipPackageSchema = z.discriminatedUnion("type", [
  createSaldoPackageSchema,
  createKuotaPackageSchema,
]);

export type CreateMembershipPackageInput = z.infer<
  typeof createMembershipPackageSchema
>;
