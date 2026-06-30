import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { getMePerformaChart } from "../lib/dashboard";
import type { PerformaChartPoint } from "../types";
import { Skeleton } from "./ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";

/** Warna garis layanan berdasarkan % ketepatan waktu (14 hari). */
export function layananColorFromPunctuality(percent: number): string {
  if (percent >= 80) return "#16a34a";
  if (percent >= 70) return "#ca8a04";
  return "#dc2626";
}

function averagePerformanceLabel(percent: number): string {
  if (percent >= 90) return "Sempurna";
  if (percent >= 80) return "Baik";
  if (percent >= 70) return "Cukup";
  return "Perlu dikembangkan";
}

function punctualityLabel(percent: number): string {
  if (percent >= 80) return "Tepat waktu";
  if (percent >= 70) return "Perlu perhatian";
  return "Kurang tepat waktu";
}

function PerformaChartSkeleton() {
  return <Skeleton className="h-[200px] w-full rounded-xl" />;
}

function calcAverageLayanan(points: PerformaChartPoint[]): number {
  if (points.length === 0) return 0;
  const sum = points.reduce((acc, p) => acc + p.layanan, 0);
  return Math.round(sum / points.length);
}

function EmployeePerformaLineChart({
  data,
  lineColor,
}: {
  data: PerformaChartPoint[];
  lineColor: string;
}) {
  const hasData = data.some((d) => d.layanan > 0);

  if (!hasData) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">
        Belum ada data performa pada periode ini
      </div>
    );
  }

  const chartConfig = {
    layanan: {
      label: "Layanan",
      color: lineColor,
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[200px] w-full !aspect-auto"
    >
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={10}
          stroke="#94a3b8"
          interval="preserveStartEnd"
        />
        <YAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={10}
          stroke="#94a3b8"
          width={32}
          tickFormatter={(v) => String(v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${value}%`, "Layanan"]}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="layanan"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: lineColor }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}

function ChartLegendRow({
  lineColor,
  punctualityPercent,
  averageLayanan,
}: {
  lineColor: string;
  punctualityPercent: number;
  averageLayanan: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 pt-2 text-[11px] text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="w-4 h-0.5 rounded-full"
          style={{ backgroundColor: lineColor }}
          aria-hidden
        />
        Layanan
      </span>
      <span className="text-slate-700 font-medium">
        Performa rata-rata: {averageLayanan}% ·{" "}
        {averagePerformanceLabel(averageLayanan)}
      </span>
      <span
        className="inline-flex items-center gap-1.5 font-medium"
        style={{ color: lineColor }}
      >
        Ketepatan waktu {punctualityPercent}% · {punctualityLabel(punctualityPercent)}
      </span>
    </div>
  );
}

export function EmployeePerformaChart() {
  const [points, setPoints] = useState<PerformaChartPoint[]>([]);
  const [punctualityPercent, setPunctualityPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lineColor = useMemo(
    () => layananColorFromPunctuality(punctualityPercent),
    [punctualityPercent]
  );

  const averageLayanan = useMemo(
    () => calcAverageLayanan(points),
    [points]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMePerformaChart();
      setPoints(data.points);
      setPunctualityPercent(data.punctualityPercent);
    } catch (e) {
      setPoints([]);
      setPunctualityPercent(0);
      setError(e instanceof Error ? e.message : "Gagal memuat performa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <PerformaChartSkeleton />;

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-amber-50 text-amber-800 text-xs rounded-xl px-3 py-2 border border-amber-100">
          <p>{error}</p>
          <button
            type="button"
            onClick={load}
            className="text-xs font-semibold text-[#001F5B] underline mt-1"
          >
            Coba lagi
          </button>
        </div>
      )}
      <div className="border border-slate-200/80 rounded-xl bg-white p-3 pt-2">
        <EmployeePerformaLineChart data={points} lineColor={lineColor} />
        <ChartLegendRow
          lineColor={lineColor}
          punctualityPercent={punctualityPercent}
          averageLayanan={averageLayanan}
        />
      </div>
    </div>
  );
}
