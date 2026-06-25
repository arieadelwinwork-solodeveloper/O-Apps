import { apiFetch } from "./api";
import type { CustomerStats, CustomerOrderSummary, Membership } from "../types";

export function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export function formatMemberSince(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
}

export function formatMemberDuration(iso: string): string {
  const start = new Date(iso);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (months < 1) return "Baru";
  if (months < 12) return `${months} bln`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} thn ${rem} bln` : `${years} thn`;
}

export async function listCustomerStats(opts?: {
  q?: string;
  sort?: "omset" | "transaksi" | "terbaru";
}): Promise<CustomerStats[]> {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.sort) params.set("sort", opts.sort);
  const qs = params.toString() ? `?${params}` : "";
  const { customers } = await apiFetch<{ customers: CustomerStats[] }>(
    `/api/customers/stats${qs}`
  );
  return customers;
}

export interface CustomerDetail {
  customer: CustomerStats;
  orders: CustomerOrderSummary[];
  memberships: Membership[];
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail> {
  return apiFetch<CustomerDetail>(`/api/customers/${id}`);
}

export function waLink(phone: string | null, text?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const num = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  const base = `https://wa.me/${num}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
