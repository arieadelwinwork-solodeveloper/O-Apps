import { apiFetch } from "./api";
import type {
  Membership,
  MembershipPackage,
  MembershipTransaction,
  MembershipType,
  PaymentMethod,
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

export interface CashierRegisterMembershipInput {
  customerName: string;
  customerPhone: string;
  packageId: string;
  paymentMethod: PaymentMethod;
  proofUrl?: string;
}

/** Kasir mendaftarkan membership langsung dari nomor pelanggan. */
export async function registerMembershipAtCashier(
  input: CashierRegisterMembershipInput
): Promise<Membership> {
  const { membership } = await apiFetch<{ membership: Membership }>(
    "/api/memberships/cashier-register",
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

/** Nilai saldo yang didapat pelanggan, format: Saldo + Rp X */
export function formatSaldoBenefit(amount: number): string {
  return `Saldo + ${formatRupiah(amount)}`;
}

/** Total harga jika beli layanan biasa (kuota × harga layanan). */
export function kuotaRegularTotal(pkg: MembershipPackage): number | null {
  if (pkg.type !== "kuota" || !pkg.quota_amount) return null;
  const unitPrice = pkg.services?.price;
  if (unitPrice == null || unitPrice <= 0) return null;
  return pkg.quota_amount * unitPrice;
}

/** Harga asli yang dicoret (nilai saldo atau total layanan biasa). */
export function packageOriginalPrice(pkg: MembershipPackage): number | null {
  if (pkg.type === "saldo") {
    const saldo = pkg.saldo_amount ?? 0;
    return saldo > pkg.price ? saldo : null;
  }
  const regular = kuotaRegularTotal(pkg);
  if (regular != null && regular > pkg.price) return regular;
  return null;
}

/** Selisih nilai yang didapat vs harga paket. */
export function computeMembershipSavings(pkg: MembershipPackage): number {
  if (pkg.type === "saldo") {
    return Math.max(0, (pkg.saldo_amount ?? 0) - pkg.price);
  }
  const regular = kuotaRegularTotal(pkg);
  if (regular == null) return 0;
  return Math.max(0, regular - pkg.price);
}

export function formatMembershipSavings(pkg: MembershipPackage): string | null {
  const savings = computeMembershipSavings(pkg);
  if (savings <= 0) return null;
  return `Pelanggan Hemat ${formatRupiah(savings)}`;
}

export function describePackage(pkg: MembershipPackage): string {
  if (pkg.type === "saldo") {
    return formatSaldoBenefit(pkg.saldo_amount ?? 0);
  }
  const svc = pkg.services?.name ?? "layanan";
  const unit = pkg.services?.unit ?? "unit";
  return `Kuota + ${pkg.quota_amount} ${unit} ${svc}`;
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  tunai: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
};

/** Pesan nota WhatsApp setelah pendaftaran membership di kasir. */
export function defaultMembershipNotaMessage(input: {
  customerName: string;
  packageName: string;
  price: number;
  benefit: string;
  savings: string | null;
  paymentMethod: PaymentMethod;
  balanceLabel?: string | null;
}): string {
  const lines = [
    `Halo ${input.customerName}, terima kasih telah bergabung membership kami.`,
    "",
    `Paket: ${input.packageName}`,
    `Benefit: ${input.benefit}`,
    `Total bayar: ${formatRupiah(input.price)} (${PAYMENT_METHOD_LABEL[input.paymentMethod]})`,
  ];
  if (input.savings) lines.push(input.savings);
  if (input.balanceLabel) lines.push(input.balanceLabel);
  lines.push("", "Membership Anda sudah aktif. Terima kasih!");
  return lines.join("\n");
}
