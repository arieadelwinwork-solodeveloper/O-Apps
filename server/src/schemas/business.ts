import { z } from "zod";

export const updateBusinessSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  openTime: z.string().max(10).optional(),
  closeTime: z.string().max(10).optional(),
  attendanceLat: z.number().min(-90).max(90).nullable().optional(),
  attendanceLng: z.number().min(-180).max(180).nullable().optional(),
  attendanceRadiusM: z.number().int().min(10).max(5000).optional(),
  autoSendCompleteNote: z.boolean().optional(),
  workDaysTarget: z.number().int().min(1).max(31).optional(),
  cashDrawerVisibility: z.enum(["all", "selected"]).optional(),
  cashDrawerUserIds: z.array(z.string().uuid()).optional(),
  monthlyRevenueTarget: z.number().int().nonnegative().optional(),
  dailyOrderTarget: z.number().int().nonnegative().optional(),
  onboardingStep: z.number().int().min(0).max(5).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const updateEmployeeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  baseSalary: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const updateEmployeeStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
