import type { Membership, Service } from "../types";

export function cartGrossTotal(
  cart: Record<string, number>,
  services: Service[]
): number {
  return services.reduce(
    (sum, s) => sum + (cart[s.id] ? s.price * cart[s.id] : 0),
    0
  );
}

/** Apakah pelanggan punya saldo/kuota yang bisa dipakai untuk keranjang ini. */
export function hasUsableMembership(
  memberships: Membership[],
  cart: Record<string, number>
): boolean {
  const saldo = memberships.find((m) => m.type === "saldo" && m.balance > 0);
  if (saldo) return true;
  return memberships.some(
    (m) =>
      m.type === "kuota" &&
      m.quota_service_id &&
      m.quota_remaining > 0 &&
      (cart[m.quota_service_id] ?? 0) > 0
  );
}

/** Kuota dulu, lalu saldo — sama seperti logika server. */
export function computeMaxMembershipUsage(
  memberships: Membership[],
  cart: Record<string, number>,
  services: Service[]
): { saldoAmount: number; quotaByMembershipId: Record<string, number> } {
  const grossTotal = cartGrossTotal(cart, services);
  const quotaByMembershipId: Record<string, number> = {};
  let quotaDiscount = 0;

  for (const m of memberships) {
    if (m.type !== "kuota" || !m.quota_service_id || m.quota_remaining <= 0) {
      continue;
    }
    const cartQty = cart[m.quota_service_id] ?? 0;
    if (cartQty <= 0) continue;
    const useQty = Math.min(cartQty, m.quota_remaining);
    const svc = services.find((s) => s.id === m.quota_service_id);
    if (svc && useQty > 0) {
      quotaByMembershipId[m.id] = useQty;
      quotaDiscount += svc.price * useQty;
    }
  }

  const netBeforeSaldo = grossTotal - quotaDiscount;
  const saldoMem = memberships.find((m) => m.type === "saldo" && m.balance > 0);
  const saldoAmount = saldoMem
    ? Math.min(saldoMem.balance, Math.max(0, netBeforeSaldo))
    : 0;

  return { saldoAmount, quotaByMembershipId };
}

export interface MembershipReceiptSnapshot {
  usedRupiah: number;
  saldoRemaining: number | null;
  quotas: { label: string; remaining: number; unit: string }[];
}

export function buildMembershipReceiptSnapshot(
  memberships: Membership[],
  services: Service[],
  saldoUsed: number,
  quotaByMembershipId: Record<string, number>
): MembershipReceiptSnapshot | null {
  const quotaUsages = Object.entries(quotaByMembershipId).filter(([, q]) => q > 0);
  if (saldoUsed <= 0 && quotaUsages.length === 0) return null;

  const saldoMem = memberships.find((m) => m.type === "saldo");
  const quotas = quotaUsages.map(([id, used]) => {
    const m = memberships.find((x) => x.id === id);
    const svc = services.find((s) => s.id === m?.quota_service_id);
    return {
      label: svc?.name ?? "Kuota",
      remaining: Math.max(0, (m?.quota_remaining ?? 0) - used),
      unit: svc?.unit ?? "unit",
    };
  });

  return {
    usedRupiah:
      saldoUsed +
      quotaUsages.reduce((acc, [id, qty]) => {
        const m = memberships.find((x) => x.id === id);
        const svc = services.find((s) => s.id === m?.quota_service_id);
        return acc + (svc?.price ?? 0) * qty;
      }, 0),
    saldoRemaining: saldoMem
      ? Math.max(0, saldoMem.balance - saldoUsed)
      : null,
    quotas,
  };
}

export function formatMembershipReceiptBlock(
  snap: MembershipReceiptSnapshot | null | undefined
): string {
  if (!snap) return "-";
  const lines: string[] = [];
  if (snap.usedRupiah > 0) {
    lines.push(
      `Pembayaran membership: Rp ${snap.usedRupiah.toLocaleString("id-ID")}`
    );
  }
  if (snap.saldoRemaining !== null) {
    lines.push(
      `Saldo membership tersisa: Rp ${snap.saldoRemaining.toLocaleString("id-ID")}`
    );
  }
  for (const q of snap.quotas) {
    lines.push(`Kuota ${q.label} tersisa: ${q.remaining} ${q.unit}`);
  }
  return lines.join("\n");
}
