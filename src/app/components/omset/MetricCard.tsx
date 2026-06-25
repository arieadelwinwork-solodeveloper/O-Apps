import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  getTrendColor,
  type TrendInfo,
} from "../../lib/omsetAnalytics";
import { cn } from "../ui/utils";

const metricCardVariants = cva(
  [
    "relative overflow-hidden rounded-[20px] border bg-white",
    "transition-all duration-200 ease-out",
    "hover:shadow-[0_8px_24px_rgba(0,31,91,0.08)] hover:-translate-y-0.5",
    "focus-within:ring-2 focus-within:ring-[#001F5B]/10",
  ].join(" "),
  {
    variants: {
      variant: {
        hero: "col-span-full p-5 sm:p-6 border-[#001F5B]/15 shadow-[0_4px_16px_rgba(0,31,91,0.06)] bg-gradient-to-br from-white to-[#001F5B]/[0.03]",
        standard: "p-4 sm:p-5 border-black/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        prediction:
          "p-4 sm:p-5 border-violet-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-gradient-to-br from-white to-violet-50/40",
      },
    },
    defaultVariants: {
      variant: "standard",
    },
  }
);

function TrendBadge({ trend }: { trend: TrendInfo }) {
  const color = getTrendColor(trend.direction);

  return (
    <span
      className="inline-flex items-center text-[11px] sm:text-xs font-medium tabular-nums"
      style={{ color }}
    >
      {trend.label}
    </span>
  );
}

export interface MetricCardProps
  extends VariantProps<typeof metricCardVariants> {
  label: string;
  value: string;
  trend: TrendInfo;
  /** Elemen dekoratif absolut (mis. Sparkline). */
  background?: ReactNode;
  /** Konten bawah card (mis. progress bar target). */
  footer?: ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  trend,
  variant = "standard",
  background,
  footer,
  className,
}: MetricCardProps) {
  const isHero = variant === "hero";
  const isPrediction = variant === "prediction";

  return (
    <article
      className={cn(metricCardVariants({ variant }), className)}
    >
      {background}

      <div className="relative z-10 flex flex-col gap-2 min-h-[88px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={cn(
                "font-medium text-slate-500 leading-snug",
                isHero ? "text-xs sm:text-sm" : "text-xs"
              )}
            >
              {label}
            </p>
          </div>
        </div>

        <p
          className={cn(
            "font-semibold text-[#001F5B] tabular-nums tracking-tight",
            isHero
              ? "text-2xl sm:text-3xl"
              : isPrediction
                ? "text-lg sm:text-xl"
                : "text-lg sm:text-xl"
          )}
        >
          {value}
        </p>

        <TrendBadge trend={trend} />
      </div>

      {footer && (
        <div className="relative z-10 mt-4 pt-3 border-t border-slate-100">
          {footer}
        </div>
      )}
    </article>
  );
}
