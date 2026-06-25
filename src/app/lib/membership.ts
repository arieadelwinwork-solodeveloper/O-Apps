import { apiFetch } from "./api";
import type {
  Membership,
  MembershipTransaction,
  MembershipType,
} from "../types";

export function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export const MEMBERSHIP_TYPE_LABEL: Record<MembershipType, string> = {
  saldo: "Saldo",
  kuota: "Kuota",
};

export const CHANGE_TYPE_LABEL: Record<string, string> = {
  topup: "Top-up",
  pakai: "Pakai",
  refund: "Refund",
};

export async function listMemberships(opts?: {
  customerId?: string;
  phone?: string;
}): Promise<Membership[]> {
  const params = new URLSearchParams();
  if (opts?.customerId) params.set("customerId", opts.customerId);
  if (opts?.phone) params.set("phone", opts.phone);
  const qs = params.toString() ? `?${params}` : "";
  const { memberships } = await apiFetch<{ memberships: Membership[] }>(
    `/api/memberships${qs}`
  );
  return memberships;
}

export async function listMembershipTransactions(
  membershipId: string
): Promise<MembershipTransaction[]> {
  const { transactions } = await apiFetch<{
    transactions: MembershipTransaction[];
  }>(`/api/memberships/${membershipId}/transactions`);
  return transactions;
}

export interface CreateMembershipInput {
  customerId: string;
  type: MembershipType;
  initialAmount: number;
  quotaServiceId?: string;
}

export async function createMembership(
  input: CreateMembershipInput
): Promise<Membership> {
  const { membership } = await apiFetch<{ membership: Membership }>(
    "/api/memberships",
    { method: "POST", body: JSON.stringify(input) }
  );
  return membership;
}

export async function topupMembership(
  id: string,
  amount: number
): Promise<void> {
  await apiFetch(`/api/memberships/${id}/topup`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}
