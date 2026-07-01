import { apiFetch } from "./api";
import type { Business } from "../types";

export async function getBusinessSettings(): Promise<Business> {
  const { business } = await apiFetch<{ business: Business }>("/api/business");
  return business;
}

export async function updateBusinessSettings(
  patch: Partial<{
    name: string;
    address: string;
    phone: string;
    whatsapp: string;
    openTime: string;
    closeTime: string;
    attendanceLat: number | null;
    attendanceLng: number | null;
    attendanceRadiusM: number;
    autoSendCompleteNote: boolean;
    workDaysTarget: number;
    cashDrawerVisibility: "all" | "selected";
    cashDrawerUserIds: string[];
    monthlyRevenueTarget: number;
    dailyOrderTarget: number;
    onboardingStep: number;
    onboardingCompleted: boolean;
  }>
): Promise<Business> {
  const { business } = await apiFetch<{ business: Business }>("/api/business", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return business;
}
