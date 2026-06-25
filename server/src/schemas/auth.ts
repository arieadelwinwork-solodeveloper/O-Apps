import { z } from "zod";

// Registrasi owner + sekaligus membuat bisnis baru.
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter"),
  fullName: z.string().min(2).max(100),
  businessName: z.string().min(2).max(120),
});

// Owner menambah karyawan ke bisnisnya.
export const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter"),
  fullName: z.string().min(2).max(100),
  phone: z.string().max(20).optional(),
  baseSalary: z.number().int().nonnegative().default(0),
});

// Update profil sendiri.
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
});

// Owner mengubah gaji pokok karyawan.
export const updateEmployeeSalarySchema = z.object({
  baseSalary: z.number().int().nonnegative(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateEmployeeSalaryInput = z.infer<typeof updateEmployeeSalarySchema>;
