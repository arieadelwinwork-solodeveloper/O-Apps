import { z } from "zod";

const commissionType = z.enum(["nominal", "percent"]);
const templateType = z.enum(["nota", "selesai"]);
const serviceUnit = z.enum(["kg", "pcs", "paket", "layanan"]);

// ---------- Services ----------
export const createServiceSchema = z.object({
  name: z.string().min(2).max(120),
  price: z.number().int().nonnegative().default(0),
  unit: serviceUnit.default("pcs"),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  price: z.number().int().nonnegative().optional(),
  unit: serviceUnit.optional(),
  isActive: z.boolean().optional(),
});

// ---------- Service stages ----------
const commissionRefine = (
  data: { commissionType?: "nominal" | "percent"; commissionValue?: number },
  ctx: z.RefinementCtx
) => {
  if (
    data.commissionType === "percent" &&
    data.commissionValue !== undefined &&
    data.commissionValue > 100
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["commissionValue"],
      message: "Komisi persen maksimal 100",
    });
  }
};

export const createStageSchema = z
  .object({
    name: z.string().min(1).max(80),
    sortOrder: z.number().int().nonnegative().default(0),
    commissionType: commissionType.default("nominal"),
    commissionValue: z.number().int().nonnegative().default(0),
  })
  .superRefine(commissionRefine);

export const updateStageSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    commissionType: commissionType.optional(),
    commissionValue: z.number().int().nonnegative().optional(),
  })
  .superRefine(commissionRefine);

// ---------- Message templates ----------
export const createTemplateSchema = z.object({
  type: templateType,
  name: z.string().min(2).max(80),
  body: z.string().min(1).max(2000),
  isDefault: z.boolean().default(false),
});

export const updateTemplateSchema = z.object({
  type: templateType.optional(),
  name: z.string().min(2).max(80).optional(),
  body: z.string().min(1).max(2000).optional(),
  isDefault: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
