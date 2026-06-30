import { z } from "zod";

export const REPORT_CATEGORIES = [
  "operasional",
  "aplikasi",
  "peralatan",
  "transaksi",
  "lainnya",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const createReportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(5, "Keterangan minimal 5 karakter")
    .max(2000, "Keterangan terlalu panjang"),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
