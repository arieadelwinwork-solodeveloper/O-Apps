import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { getOwnerOmset, formatRupiah } from "../lib/dashboard";
import {
  deriveMonthlyProgress,
  deriveOmsetTrends,
  formatLastUpdated,
} from "../lib/omsetAnalytics";
import type { OmsetChartPoint, OwnerOmsetSummary } from "../types";
import { MonthProgressBar } from "./omset/MonthProgressBar";
import { OmsetGroupCard } from "./omset/OmsetGroupCard";
import { NotificationBell } from "./NotificationBell";
import { Skeleton } from "./ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";

type ChartPeriod = "daily" | "weekly" | "monthly";

const PERIOD_TABS: { id: ChartPeriod; label: string }[] = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan" },
];

const chartConfig = {
  revenue: {
    label: "Omset",
    color: "#001F5B",
  },
} satisfies ChartConfig;

function formatAxisValue(v: number): string {
  if (v >= 1_000_000) return `${Math.round(v / 100_000) / 10}jt`;
  if (v >= 1_000) return `${Math.round(v / 100) / 10}rb`;
  return String(v);
}

function OmsetLineChart({ data }: { data: OmsetChartPoint[] }) {
  if (data.every((d) => d.revenue === 0)) {
    return (
      <div className="h-[160px] flex items-center justify-center text-xs text-slate-400">
        Belum ada data omset pada periode ini
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[160px] w-full">
      <LineChart data={data} margin={{ top: 12, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          stroke="#94a3b8"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={10}
          stroke="#94a3b8"
          width={36}
          tickFormatter={formatAxisValue}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatRupiah(Number(value))}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#001F5B" }}
        />
      </LineChart>
    </ChartContainer>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
      <Skeleton className="h-[160px] w-full rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-64 w-full rounded-[20px]" />
        <Skeleton className="h-40 w-full rounded-[20px]" />
      </div>
    </div>
  );
}

export function OwnerSummary() {
  const [data, setData] = useState<OwnerOmsetSummary | null>(null);
  const [period, setPeriod] = useState<ChartPeriod>("daily");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const summary = await getOwnerOmset();
      setData(summary);
      setLastUpdated(new Date());
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Gagal memuat omset");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (period === "weekly") return data.chartWeekly;
    if (period === "monthly") return data.chartMonthly;
    return data.chartDaily;
  }, [data, period]);

  const trends = useMemo(
    () => (data ? deriveOmsetTrends(data) : null),
    [data]
  );

  const sparklineValues = useMemo(
    () => data?.chartDaily.map((d) => d.revenue) ?? [],
    [data]
  );

  const monthlyProgress = useMemo(
    () =>
      data
        ? deriveMonthlyProgress(data.revenueMonth, data.chartMonthly)
        : null,
    [data]
  );

  if (loading) return <SummarySkeleton />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-amber-50 text-amber-800 text-sm rounded-xl px-4 py-3 space-y-2 border border-amber-100">
          <p>{error}</p>
          <button
            type="button"
            onClick={load}
            className="text-xs font-semibold text-[#001F5B] underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#001F5B] tracking-tight">
            Omset
          </h2>
          {data && (
            <p className="text-xs text-slate-400 mt-0.5">
              Tanggal {data.todayLabel}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <NotificationBell />
          {lastUpdated && (
            <p className="text-[10px] text-slate-400 text-right max-w-[9rem] leading-tight">
              Terakhir diupdate: {formatLastUpdated(lastUpdated)}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl border border-slate-200/80 bg-slate-50/50">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPeriod(tab.id)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
              period === tab.id
                ? "bg-white text-[#001F5B] shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <OmsetLineChart data={chartData} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <OmsetGroupCard
            variant="summary"
            title="Rangkuman"
            rows={[
              {
                label: "Omset Bulan Ini",
                value: data ? formatRupiah(data.revenueMonth) : "—",
                trend: trends?.revenueMonth ?? {
                  percent: null,
                  direction: "neutral",
                  label: "— vs bulan lalu",
                },
                emphasis: "primary",
                aboveContent: monthlyProgress ? (
                  <MonthProgressBar info={monthlyProgress} />
                ) : undefined,
              },
              {
                label: "Hari Ini",
                value: data ? formatRupiah(data.revenueToday) : "—",
                trend: trends?.revenueToday ?? {
                  percent: null,
                  direction: "neutral",
                  label: "— vs kemarin",
                },
                sparkline: sparklineValues,
              },
              {
                label: "Omset rata-rata harian",
                value: data ? formatRupiah(data.avgDailyRevenue) : "—",
                trend: trends?.avgDailyRevenue ?? {
                  percent: null,
                  direction: "neutral",
                  label: "— vs minggu lalu",
                },
              },
            ]}
          />

          <OmsetGroupCard
            variant="prediction"
            title="Prediksi"
            rows={[
              {
                label: `Omset ${data?.monthLabel ?? "—"}`,
                value: data ? formatRupiah(data.forecastMonthRevenue) : "—",
                trend: trends?.forecastMonthRevenue ?? {
                  percent: null,
                  direction: "neutral",
                  label: "— vs bulan sebelumnya",
                },
                emphasis: "primary",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
