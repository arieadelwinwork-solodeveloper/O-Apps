export type DashboardRange = "today" | "week" | "month";

export interface DateRangeBounds {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Rentang waktu + periode pembanding untuk pertumbuhan. */
export function getDateRangeBounds(range: DashboardRange): DateRangeBounds {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (range === "today") {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      start: todayStart.toISOString(),
      end: todayEnd.toISOString(),
      prevStart: startOfDay(yesterday).toISOString(),
      prevEnd: endOfDay(yesterday).toISOString(),
    };
  }

  if (range === "week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setMilliseconds(-1);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    return {
      start: weekStart.toISOString(),
      end: todayEnd.toISOString(),
      prevStart: prevWeekStart.toISOString(),
      prevEnd: prevWeekEnd.toISOString(),
    };
  }

  // month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthEnd = new Date(monthStart);
  prevMonthEnd.setMilliseconds(-1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    start: monthStart.toISOString(),
    end: todayEnd.toISOString(),
    prevStart: prevMonthStart.toISOString(),
    prevEnd: prevMonthEnd.toISOString(),
  };
}

export function growthPercent(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Kode transaksi: YYYYMMDD-HHMM-SS dari timestamp order. */
export function formatTransactionCode(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${mo}${day}-${h}${mi}-${s}`;
}
