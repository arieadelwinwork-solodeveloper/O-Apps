import { apiFetch } from "./api";
import type { Subscription, SubscriptionPayment } from "../types";

export async function getSubscription(): Promise<{
  subscription: Subscription | null;
  payments: SubscriptionPayment[];
}> {
  return apiFetch("/api/subscriptions");
}

export const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

export const PLAN_FEATURES: Record<
  string,
  { employees: string; transactions: string; inventory: string; export: boolean }
> = {
  starter: {
    employees: "2",
    transactions: "200/bulan",
    inventory: "50 item",
    export: false,
  },
  pro: {
    employees: "5",
    transactions: "1.000/bulan",
    inventory: "200 item",
    export: true,
  },
  business: {
    employees: "Tidak terbatas",
    transactions: "Tidak terbatas",
    inventory: "Tidak terbatas",
    export: true,
  },
};

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Aktif",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
};
