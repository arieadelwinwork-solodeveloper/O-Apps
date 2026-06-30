import type { MembershipPackage } from "../types";

export type MembershipTier = "bronze" | "silver" | "gold";

export const MEMBERSHIP_TIER_LABEL: Record<MembershipTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

/**
 * Bagi paket ke tier berdasarkan peringkat harga (murah → mahal).
 * 6 paket: 2 bronze, 2 silver, 2 gold.
 * 7 paket: 2 bronze, 3 silver, 2 gold (sisa ke tengah).
 */
export function assignMembershipTiers(
  packages: MembershipPackage[]
): Map<string, MembershipTier> {
  const sorted = [...packages].sort((a, b) => a.price - b.price);
  const n = sorted.length;
  const map = new Map<string, MembershipTier>();

  if (n === 0) return map;
  if (n === 1) {
    map.set(sorted[0].id, "gold");
    return map;
  }
  if (n === 2) {
    map.set(sorted[0].id, "bronze");
    map.set(sorted[1].id, "gold");
    return map;
  }

  const base = Math.floor(n / 3);
  const rem = n % 3;
  const bronzeCount = base;
  let silverCount = base;
  let goldCount = base;
  if (rem === 1) silverCount += 1;
  if (rem === 2) {
    silverCount += 1;
    goldCount += 1;
  }

  let i = 0;
  for (; i < bronzeCount; i++) map.set(sorted[i].id, "bronze");
  for (; i < bronzeCount + silverCount; i++) map.set(sorted[i].id, "silver");
  for (; i < n; i++) map.set(sorted[i].id, "gold");

  return map;
}

/** Tier per kategori (saldo & kuota dinilai terpisah). */
export function assignMembershipTiersByType(
  packages: MembershipPackage[]
): Map<string, MembershipTier> {
  const map = new Map<string, MembershipTier>();
  const saldo = packages.filter((p) => p.type === "saldo");
  const kuota = packages.filter((p) => p.type === "kuota");
  assignMembershipTiers(saldo).forEach((v, k) => map.set(k, v));
  assignMembershipTiers(kuota).forEach((v, k) => map.set(k, v));
  return map;
}

export interface TierStyle {
  card: string;
  cardSelected: string;
  sheen: string;
  titleCard: string;
  title: string;
  savings: string;
  divider: string;
  badge: string;
}

/** Class names — lihat membership-card.css */
export const MEMBERSHIP_BENEFIT_CLASS =
  "membership-metallic-silver membership-saldo-light";
export const MEMBERSHIP_STRIKE_CLASS =
  "membership-price-muted membership-price-light";
export const MEMBERSHIP_PRICE_CLASS =
  "membership-price-black membership-price-light";

export const MEMBERSHIP_TIER_STYLES: Record<MembershipTier, TierStyle> = {
  bronze: {
    card:
      "bg-[linear-gradient(145deg,#2a1810_0%,#6b3f22_28%,#cd7f32_52%,#8b5a2b_78%,#3d2418_100%)] " +
      "border border-[#e8b88a]/40 " +
      "shadow-[0_6px_18px_rgba(42,24,16,0.45),inset_0_1px_0_rgba(255,220,180,0.25),inset_0_-2px_6px_rgba(0,0,0,0.35)]",
    cardSelected:
      "ring-2 ring-[#f0c9a8]/90 border-[#ffd4a8]/60 shadow-[0_8px_24px_rgba(205,127,50,0.4)] scale-[1.01]",
    sheen:
      "bg-[linear-gradient(115deg,rgba(255,255,255,0.14)_0%,transparent_38%,transparent_62%,rgba(0,0,0,0.12)_100%)]",
    titleCard:
      "inline-flex items-center gap-1.5 w-fit max-w-[calc(100%-4.5rem)] " +
      "bg-[linear-gradient(135deg,rgba(20,10,5,0.55)_0%,rgba(255,200,150,0.18)_45%,rgba(20,10,5,0.4)_100%)] " +
      "border border-[#ffd4a8]/50 rounded-full px-2.5 py-1 " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_6px_rgba(0,0,0,0.22)]",
    title: "text-[#cd7f32] font-bold tracking-tight",
    savings: "text-[#e0954a] font-semibold",
    divider: "border-[#3d2418]/25",
    badge:
      "bg-[linear-gradient(180deg,#fce8d4_0%,#e8a86a_35%,#b87333_70%,#7a4a28_100%)] " +
      "text-[#2a1508] border border-[#ffd4a8]/50 " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_4px_rgba(0,0,0,0.35)]",
  },
  silver: {
    card:
      "bg-[linear-gradient(145deg,#1e2430_0%,#4a5568_25%,#c0ccd8_48%,#7a8a9e_72%,#2d3544_100%)] " +
      "border border-[#e8eef5]/35 " +
      "shadow-[0_6px_18px_rgba(30,36,48,0.5),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_6px_rgba(0,0,0,0.35)]",
    cardSelected:
      "ring-2 ring-[#e8eef5]/80 border-[#f0f4f8]/50 shadow-[0_8px_24px_rgba(192,204,216,0.35)] scale-[1.01]",
    sheen:
      "bg-[linear-gradient(115deg,rgba(255,255,255,0.16)_0%,transparent_40%,transparent_58%,rgba(0,0,0,0.1)_100%)]",
    titleCard:
      "inline-flex items-center gap-1.5 w-fit max-w-[calc(100%-4.5rem)] " +
      "bg-[linear-gradient(135deg,rgba(12,16,24,0.6)_0%,rgba(255,255,255,0.22)_48%,rgba(12,16,24,0.45)_100%)] " +
      "border border-[#f0f4f8]/50 rounded-full px-2.5 py-1 " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(0,0,0,0.18)]",
    title: "text-[#8a9aad] font-bold tracking-tight",
    savings: "text-[#3d4a5c] font-semibold",
    divider: "border-[#2d3544]/22",
    badge:
      "bg-[linear-gradient(180deg,#f8fafc_0%,#d4dce8_30%,#9aacbe_65%,#5a6578_100%)] " +
      "text-[#1a2030] border border-[#f0f4f8]/55 " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_2px_4px_rgba(0,0,0,0.35)]",
  },
  gold: {
    card:
      "bg-[linear-gradient(145deg,#2a1f05_0%,#7a5c10_22%,#ffd700_46%,#daa520_68%,#4a3808_100%)] " +
      "border border-[#ffe566]/40 " +
      "shadow-[0_6px_18px_rgba(74,56,8,0.5),inset_0_1px_0_rgba(255,240,180,0.3),inset_0_-2px_6px_rgba(0,0,0,0.38)]",
    cardSelected:
      "ring-2 ring-[#ffe566]/90 border-[#fff0a0]/55 shadow-[0_8px_24px_rgba(255,215,0,0.35)] scale-[1.01]",
    sheen:
      "bg-[linear-gradient(115deg,rgba(255,255,255,0.12)_0%,transparent_38%,transparent_62%,rgba(0,0,0,0.14)_100%)]",
    titleCard:
      "inline-flex items-center gap-1.5 w-fit max-w-[calc(100%-4.5rem)] " +
      "bg-[linear-gradient(135deg,rgba(30,22,4,0.65)_0%,rgba(255,230,120,0.22)_48%,rgba(30,22,4,0.5)_100%)] " +
      "border border-[#fff0a0]/55 rounded-full px-2.5 py-1 " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.25)]",
    title: "text-[#daa520] font-bold tracking-tight",
    savings: "text-[#6b4e12] font-semibold",
    divider: "border-[#3d3008]/28",
    badge:
      "bg-[linear-gradient(180deg,#fff8dc_0%,#ffe566_28%,#daa520_62%,#8b6914_100%)] " +
      "text-[#2a1f05] border border-[#fff0a0]/55 " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_2px_4px_rgba(0,0,0,0.38)]",
  },
};

export function getTierStyle(tier: MembershipTier): TierStyle {
  return MEMBERSHIP_TIER_STYLES[tier];
}
