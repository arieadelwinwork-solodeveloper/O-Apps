import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  getTrendColor,
  type TrendInfo,
} from "../../lib/omsetAnalytics";
import { cn } from "../ui/utils";
import { Sparkline } from "./Sparkline";

const groupCardVariants = cva(
  [
    "relative overflow-hidden rounded-[20px] border bg-white",
    "transition-all duration-200 ease-out",
    "hover:shadow-[0_8px_24px_rgba(0,31,91,0.08)] hover:-translate-y-0.5",
  ].join(" "),
  {
    variants: {
      variant: {
        summary:
          "p-5 sm:p-6 border-[#001F5B]/15 shadow-[0_4px_16px_rgba(0,31,91,0.06)] bg-gradient-to-br from-white to-[#001F5B]/[0.03]",
        prediction:
          "p-5 sm:p-6 border-violet-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-gradient-to-br from-white to-violet-50/40",
      },
    },
    defaultVariants: {
      variant: "summary",
    },
  }
);

export interface GroupMetricRow {
  label: string;
  value: string;
  trend: TrendInfo;
  emphasis?: "primary" | "default";
  sparkline?: number[];
  aboveContent?: ReactNode;
}

function TrendBadge({ trend }: { trend: TrendInfo }) {
  return (
    <span
      className="inline-flex items-center text-[11px] sm:text-xs font-medium tabular-nums"
      style={{ color: getTrendColor(trend.direction) }}
    >
      {trend.label}
    </span>
  );
}

function MetricRow({ row }: { row: GroupMetricRow }) {
  const isPrimary = row.emphasis === "primary";
  const hasSparkline = row.sparkline && row.sparkline.length > 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        isPrimary
          ? "bg-[#001F5B]/[0.04] px-4 py-3.5 sm:px-5 sm:py-4"
          : "px-1 py-3 border-b border-slate-100 last:border-0 last:pb-0"
      )}
    >
      {hasSparkline && <Sparkline values={row.sparkline!} />}

      <div className="relative z-10 flex flex-col gap-1">
        {row.aboveContent}
        <p
          className={cn(
            "font-medium text-slate-500",
            isPrimary ? "text-xs sm:text-sm" : "text-xs"
          )}
        >
          {row.label}
        </p>
        <p
          className={cn(
            "font-semibold text-[#001F5B] tabular-nums tracking-tight",
            isPrimary ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
          )}
        >
          {row.value}
        </p>
        <TrendBadge trend={row.trend} />
      </div>
    </div>
  );
}

export interface OmsetGroupCardProps
  extends VariantProps<typeof groupCardVariants> {
  title: string;
  rows: GroupMetricRow[];
  footer?: ReactNode;
  className?: string;
}

export function OmsetGroupCard({
  title,
  rows,
  variant = "summary",
  footer,
  className,
}: OmsetGroupCardProps) {
  const isPrediction = variant === "prediction";

  return (
    <article className={cn(groupCardVariants({ variant }), className)}>
      <header className="mb-4">
        <h3
          className={cn(
            "font-semibold uppercase tracking-wider text-slate-500",
            isPrediction ? "text-xs" : "text-xs sm:text-sm"
          )}
        >
          {title}
        </h3>
      </header>

      <div className={cn("space-y-1", isPrediction && "mt-1")}>
        {rows.map((row) => (
          <MetricRow key={row.label} row={row} />
        ))}
      </div>

      {footer && (
        <div className="relative z-10 mt-4 pt-4 border-t border-slate-100">
          {footer}
        </div>
      )}
    </article>
  );
}
