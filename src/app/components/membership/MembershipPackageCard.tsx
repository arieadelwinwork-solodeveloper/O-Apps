import type { ReactNode } from "react";
import { Crown } from "lucide-react";
import {
  describePackage,
  formatRupiah,
  formatMembershipSavings,
  packageOriginalPrice,
} from "../../lib/membership";
import {
  getTierStyle,
  MEMBERSHIP_TIER_LABEL,
  MEMBERSHIP_BENEFIT_CLASS,
  MEMBERSHIP_STRIKE_CLASS,
  MEMBERSHIP_PRICE_CLASS,
  type MembershipTier,
} from "../../lib/membershipTier";
import type { MembershipPackage } from "../../types";

interface MembershipPackageCardProps {
  pkg: MembershipPackage;
  tier: MembershipTier;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  as?: "button" | "div";
  children?: ReactNode;
}

export function MembershipPackageCard({
  pkg,
  tier,
  selected = false,
  disabled = false,
  onClick,
  as = "button",
  children,
}: MembershipPackageCardProps) {
  const s = getTierStyle(tier);
  const savings = formatMembershipSavings(pkg);
  const originalPrice = packageOriginalPrice(pkg);

  const shellClass = `relative overflow-hidden w-full text-left rounded-xl p-3.5 transition-all ${s.card} ${
    selected ? s.cardSelected : "hover:brightness-105 active:scale-[0.99]"
  } ${disabled ? "opacity-50 pointer-events-none" : ""}`;

  const content = (
    <>
      <div
        className={`absolute inset-0 rounded-xl pointer-events-none ${s.sheen}`}
        aria-hidden
      />
      <div
        className={`relative z-10 membership-card-copy${selected ? " is-selected" : ""}`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className={s.titleCard}>
            <Crown className={`w-3 h-3 shrink-0 ${s.title}`} aria-hidden />
            <span
              className={`text-xs font-bold leading-none truncate ${s.title}`}
            >
              {pkg.name}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${s.badge}`}
          >
            {MEMBERSHIP_TIER_LABEL[tier]}
          </span>
        </div>
        <p className={`text-xs mt-0.5 font-semibold ${MEMBERSHIP_BENEFIT_CLASS}`}>
          {describePackage(pkg)}
        </p>
        {savings && (
          <p className={`text-xs mt-1 ${s.savings}`}>{savings}</p>
        )}
        <div className={`border-t mt-2.5 pt-2 ${s.divider}`}>
          {originalPrice != null && (
            <div
              className={`text-xs line-through mb-0.5 font-medium ${MEMBERSHIP_STRIKE_CLASS}`}
            >
              {formatRupiah(originalPrice)}
            </div>
          )}
          <div className={`text-sm font-bold ${MEMBERSHIP_PRICE_CLASS}`}>
            {formatRupiah(pkg.price)}
          </div>
        </div>
        {children}
      </div>
    </>
  );

  if (as === "div") {
    return <div className={shellClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={shellClass}
    >
      {content}
    </button>
  );
}
