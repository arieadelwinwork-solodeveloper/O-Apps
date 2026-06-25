interface OrderRow {
  total: number;
  created_at: string;
}

export interface OmsetChartPoint {
  label: string;
  revenue: number;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function mondayOfWeek(d: Date): Date {
  const copy = startOfDay(d);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  return copy;
}

export function buildDailyChart(
  rows: OrderRow[],
  days: number,
  now: Date
): OmsetChartPoint[] {
  const points: OmsetChartPoint[] = [];
  const buckets = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toDateString();
    buckets.set(key, 0);
    points.push({
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      revenue: 0,
    });
  }

  for (const row of rows) {
    const key = new Date(row.created_at).toDateString();
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + (row.total ?? 0));
    }
  }

  let i = 0;
  for (const [, revenue] of buckets) {
    points[i].revenue = revenue;
    i++;
  }

  return points;
}

export function buildWeeklyChart(
  rows: OrderRow[],
  weeks: number,
  now: Date
): OmsetChartPoint[] {
  const points: OmsetChartPoint[] = [];
  const monday = mondayOfWeek(now);
  const todayEnd = endOfDay(now);

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(monday);
    weekStart.setDate(weekStart.getDate() - w * 7);
    const weekEnd = endOfDay(
      new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
    );
    const end = weekEnd > todayEnd ? todayEnd : weekEnd;

    let revenue = 0;
    for (const row of rows) {
      const d = new Date(row.created_at);
      if (d >= weekStart && d <= end) {
        revenue += row.total ?? 0;
      }
    }

    points.push({
      label: weekStart.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      revenue,
    });
  }

  return points;
}

export function buildMonthlyChart(
  rows: OrderRow[],
  months: number,
  now: Date
): OmsetChartPoint[] {
  const points: OmsetChartPoint[] = [];
  const todayEnd = endOfDay(now);

  for (let m = months - 1; m >= 0; m--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const monthEnd = endOfDay(
      new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    );
    const end = monthEnd > todayEnd ? todayEnd : monthEnd;

    let revenue = 0;
    for (const row of rows) {
      const d = new Date(row.created_at);
      if (d >= monthStart && d <= end) {
        revenue += row.total ?? 0;
      }
    }

    points.push({
      label: monthStart.toLocaleDateString("id-ID", { month: "short" }),
      revenue,
    });
  }

  return points;
}
