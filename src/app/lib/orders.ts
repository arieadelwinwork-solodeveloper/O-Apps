import { apiFetch } from "./api";
import { isUsingMockApi, mockUploadUrl } from "./mockMode";
import { supabase } from "./supabase";
import type {
  Order,
  Customer,
  PaymentStatus,
  PaymentMethod,
  WorkStatus,
} from "../types";

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  items: { serviceId: string; qty: number }[];
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paidAmount?: number;
  proofUrl?: string;
  note?: string;
  estimatedDoneAt?: string;
  membershipSaldoAmount?: number;
  membershipQuotaUsages?: { membershipId: string; qty: number }[];
  discountType?: "nominal" | "percent" | null;
  discountValue?: number;
}

export async function listOrders(status?: WorkStatus): Promise<Order[]> {
  const qs = status ? `?status=${status}` : "";
  const { orders } = await apiFetch<{ orders: Order[] }>(`/api/orders${qs}`);
  return orders;
}

export async function getOrder(id: string): Promise<Order> {
  const { order } = await apiFetch<{ order: Order }>(`/api/orders/${id}`);
  return order;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { order } = await apiFetch<{ order: Order }>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return order;
}

export async function updateOrderStatus(
  id: string,
  workStatus: WorkStatus
): Promise<void> {
  await apiFetch(`/api/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ workStatus }),
  });
}

export async function settlePayment(
  id: string,
  input: { paidAmount: number; paymentMethod: PaymentMethod; proofUrl?: string }
): Promise<void> {
  await apiFetch(`/api/orders/${id}/settle`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function isOrderLunas(order: Pick<Order, "remaining_amount">): boolean {
  return order.remaining_amount <= 0;
}

export async function markOrderPickedUp(
  id: string,
  returnedByUserId: string
): Promise<{ order: Order; pickedUpAt: string }> {
  return apiFetch(`/api/orders/${id}/pickup`, {
    method: "PATCH",
    body: JSON.stringify({ returnedByUserId }),
  });
}

export async function completeStage(
  orderId: string,
  stageId: string,
  completedByUserId: string,
  options?: { skipCommission?: boolean }
): Promise<{ commission: number; workStatus: string | null }> {
  return apiFetch(`/api/orders/${orderId}/stages/${stageId}/complete`, {
    method: "PATCH",
    body: JSON.stringify({
      completedByUserId,
      ...(options?.skipCommission ? { skipCommission: true } : {}),
    }),
  });
}

export async function listCustomers(q?: string): Promise<Customer[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const { customers } = await apiFetch<{ customers: Customer[] }>(
    `/api/customers${qs}`
  );
  return customers;
}

/** Upload bukti bayar non-tunai ke Supabase Storage, balikkan public URL. */
export async function uploadPaymentProof(file: File): Promise<string> {
  if (isUsingMockApi()) {
    await new Promise((r) => setTimeout(r, 300));
    return mockUploadUrl("payment");
  }
  if (!supabase) throw new Error("Supabase belum dikonfigurasi");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { upsert: false });
  if (error) throw new Error("Gagal mengunggah bukti bayar");
  const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
  return data.publicUrl;
}
