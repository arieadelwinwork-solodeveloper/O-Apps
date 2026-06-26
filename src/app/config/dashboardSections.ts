import { Package, Users, type LucideIcon } from "lucide-react";

/** Ikon accordion section dashboard — tambah entry saat ada section baru. */
export const DASHBOARD_SECTION_ICONS = {
  performa: Users,
  inventori: Package,
} as const satisfies Record<string, LucideIcon>;

export type DashboardSectionKey = keyof typeof DASHBOARD_SECTION_ICONS;
