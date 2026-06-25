import { z } from "zod";

export const checkAttendanceSchema = z.object({
  type: z.enum(["masuk", "pulang"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photoUrl: z.string().url().max(1000).optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  attendanceLat: z.number().min(-90).max(90).nullable().optional(),
  attendanceLng: z.number().min(-180).max(180).nullable().optional(),
  attendanceRadiusM: z.number().int().min(10).max(5000).optional(),
});

export type CheckAttendanceInput = z.infer<typeof checkAttendanceSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
