import type { OwnerOmsetSummary } from "../types";

/** Warna konsisten untuk indikator tren (sesuai PRD UI). */
export const TREND_COLORS = {
  up: "#22C55E",
  down: "#EF4444",
  neutral: "#94A3B8",
} as const;

export type TrendDirection = "up" | "down" | "neutral";

export interface TrendInfo {
  percent: number | null;
  direction: TrendDirection;
  label: string;
}

/** Hitung persentase perubahan — mirror logika backend, hanya untuk tampilan. */
export function growthPercent(
  current: number,
  previous: number
): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function getTrendDirection(percent: number | null): TrendDirection {
  if (percent === null || percent === 0) return "neutral";
  return percent > 0 ? "up" : "down";
}

export function getTrendColor(direction: TrendDirection): string {
  return TREND_COLORS[direction];
}

export function formatTrendText(percent: number | null, periodLabel: string): string {
  if (percent === null) return `— ${periodLabel}`;
  const arrow = percent > 0 ? "↑" : percent < 0 ? "↓" : "→";
  const abs = Math.abs(percent);
  return `${arrow} ${abs}% ${periodLabel}`;
}

function lastTwo<T>(arr: T[]): [T | undefined, T | undefined] {
  if (arr.length < 2) return [arr[arr.length - 1], undefined];
  return [arr[arr.length - 1], arr[arr.length - 2]];
}

/**
 * Turunkan metrik perbandingan dari data API yang sudah ada.
 * Tidak memanggil endpoint baru — hanya derivasi untuk UI.
 */
export function deriveOmsetTrends(data: OwnerOmsetSummary): {
  revenueMonth: TrendInfo;
  revenueToday: TrendInfo;
  avgDailyRevenue: TrendInfo;
  forecastMonthRevenue: TrendInfo;
} {
  const [, prevMonth] = lastTwo(data.chartMonthly);
  const [, yesterdayPoint] = lastTwo(data.chartDaily);

  const monthGrowth = growthPercent(
    data.revenueMonth,
    prevMonth?.revenue ?? 0
  );

  const todayGrowth = growthPercent(
    data.revenueToday,
    yesterdayPoint?.revenue ?? 0
  );

  const [, prevWeek] = lastTwo(data.chartWeekly);
  const prevWeekAvgDaily =
    prevWeek && prevWeek.revenue > 0
      ? Math.round(prevWeek.revenue / 7)
      : 0;
  const avgGrowth = growthPercent(data.avgDailyRevenue, prevWeekAvgDaily);

  const forecastGrowth = growthPercent(
    data.forecastMonthRevenue,
    prevMonth?.revenue ?? 0
  );

  return {
    revenueMonth: {
      percent: monthGrowth,
      direction: getTrendDirection(monthGrowth),
      label: formatTrendText(monthGrowth, "vs bulan lalu"),
    },
    revenueToday: {
      percent: todayGrowth,
      direction: getTrendDirection(todayGrowth),
      label: formatTrendText(todayGrowth, "vs kemarin"),
    },
    avgDailyRevenue: {
      percent: avgGrowth,
      direction: getTrendDirection(avgGrowth),
      label: formatTrendText(avgGrowth, "vs minggu lalu"),
    },
    forecastMonthRevenue: {
      percent: forecastGrowth,
      direction: getTrendDirection(forecastGrowth),
      label: formatTrendText(forecastGrowth, "vs bulan sebelumnya"),
    },
  };
}

/** Warna progress bar omset bulanan. */
export const PROGRESS_BAR_COLORS = {
  below: "#EF4444",
  mid: "#EAB308",
  above: "#22C55E",
} as const;

export interface MonthlyProgressInfo {
  lowerBound: number;
  highest: number;
  target: number;
  progress: number;
  barColor: string;
}

/**
 * Progress bar omset bulan ini.
 * Jika monthlyRevenueTarget > 0, pakai target owner.
 * Jika tidak, fallback ke omset tertinggi × 120%.
 */
export function deriveMonthlyProgress(
  revenueMonth: number,
  chartMonthly: { revenue: number }[],
  monthlyRevenueTarget = 0
): MonthlyProgressInfo {
  const revenues = chartMonthly.map((d) => d.revenue);
  const highest = revenues.length > 0 ? Math.max(...revenues) : 0;
  const lowerBound = revenues.length > 0 ? Math.min(...revenues) : 0;
  const target =
    monthlyRevenueTarget > 0
      ? monthlyRevenueTarget
      : Math.round(highest * 1.2);

  let progress = 0;
  if (target > 0) {
    progress = Math.round((revenueMonth / target) * 100);
  } else if (revenueMonth > 0) {
    progress = 100;
  }

  let barColor: string;
  if (monthlyRevenueTarget > 0) {
    if (progress >= 100) barColor = PROGRESS_BAR_COLORS.above;
    else if (progress >= 70) barColor = PROGRESS_BAR_COLORS.mid;
    else barColor = PROGRESS_BAR_COLORS.below;
  } else if (revenueMonth < lowerBound) {
    barColor = PROGRESS_BAR_COLORS.below;
  } else if (revenueMonth > highest) {
    barColor = PROGRESS_BAR_COLORS.above;
  } else {
    barColor = PROGRESS_BAR_COLORS.mid;
  }

  return { lowerBound, highest, target, progress, barColor };
}

export function formatLastUpdated(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
