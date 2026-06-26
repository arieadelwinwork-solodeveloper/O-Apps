import { apiFetch } from "./api";
import type {
  Membership,
  MembershipPackage,
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

export async function listMembershipPackages(opts?: {
  activeOnly?: boolean;
}): Promise<MembershipPackage[]> {
  const qs = opts?.activeOnly ? "?activeOnly=1" : "";
  const { packages } = await apiFetch<{ packages: MembershipPackage[] }>(
    `/api/membership-packages${qs}`
  );
  return packages;
}

export type CreateSaldoPackageInput = {
  type: "saldo";
  name: string;
  price: number;
  saldoAmount: number;
};

export type CreateKuotaPackageInput = {
  type: "kuota";
  name: string;
  price: number;
  quotaAmount: number;
  quotaServiceId: string;
};

export async function createMembershipPackage(
  input: CreateSaldoPackageInput | CreateKuotaPackageInput
): Promise<MembershipPackage> {
  const { package: pkg } = await apiFetch<{ package: MembershipPackage }>(
    "/api/membership-packages",
    { method: "POST", body: JSON.stringify(input) }
  );
  return pkg;
}

export async function setMembershipPackageActive(
  id: string,
  isActive: boolean
): Promise<MembershipPackage> {
  const { package: pkg } = await apiFetch<{ package: MembershipPackage }>(
    `/api/membership-packages/${id}`,
    { method: "PATCH", body: JSON.stringify({ isActive }) }
  );
  return pkg;
}

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

export interface RegisterMembershipInput {
  customerId: string;
  packageId: string;
}

export async function registerMembership(
  input: RegisterMembershipInput
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

export function describePackage(pkg: MembershipPackage): string {
  if (pkg.type === "saldo") {
    return `${formatRupiah(pkg.saldo_amount ?? 0)} saldo`;
  }
  const svc = pkg.services?.name ?? "layanan";
  const unit = pkg.services?.unit ?? "unit";
  return `${pkg.quota_amount} ${unit} ${svc}`;
}
