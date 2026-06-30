import { useEffect, useState } from "react";
import {
  Fingerprint,
  ListChecks,
  Receipt,
  Wallet,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { getMeToday, formatRupiah } from "../lib/dashboard";
import type { MeTodaySummary } from "../types";
import { EmployeePerformaChart } from "./EmployeePerformaChart";
import { Skeleton } from "./ui/skeleton";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function StatGroup({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 1 | 2;
}) {
  return (
    <div
      className={`border border-slate-200/80 rounded-xl overflow-hidden ${
        cols === 2
          ? "grid grid-cols-2 divide-x divide-slate-200/80"
          : ""
      }`}
    >
      {children}
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="p-4">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${
          alert ? "bg-red-50 text-red-600" : "bg-[#001F5B]/8 text-[#001F5B]"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div
        className={`text-lg font-semibold leading-tight ${
          alert ? "text-red-600" : "text-slate-800"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-[200px] rounded-xl" />
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

function TodayWorkList({ data }: { data: MeTodaySummary | null }) {
  return (
    <>
      <SectionLabel>Pengerjaan Hari Ini</SectionLabel>

      {data && data.activitiesToday.length > 0 && (
        <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-200/80 bg-white">
          {data.activitiesToday.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="text-sm font-semibold text-[#001F5B]">
                {a.stageName} 1×
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {a.transactionCode} - {a.customerName} - {a.serviceName}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.activitiesToday.length === 0 && (
        <div className="border border-slate-200/80 rounded-xl px-4 py-3 text-center bg-white">
          <p className="text-xs text-slate-400">
            Belum ada tahap pengerjaan selesai hari ini.
          </p>
        </div>
      )}

      {!data && (
        <div className="border border-slate-200/80 rounded-xl px-4 py-3 text-center bg-white">
          <p className="text-xs text-slate-400">Menunggu data pengerjaan.</p>
        </div>
      )}
    </>
  );
}

export function EmployeeSummary() {
  const [data, setData] = useState<MeTodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const summary = await getMeToday();
      setData(summary);
    } catch (e) {
      setData(null);
      setError(
        e instanceof Error ? e.message : "Gagal memuat rangkuman"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <SummarySkeleton />;

  const attPct =
    data && data.attendance.daysTarget > 0
      ? Math.min(
          100,
          Math.round(
            (data.attendance.daysPresent / data.attendance.daysTarget) * 100
          )
        )
      : 0;

  const showCashDrawer = !!data?.cashDrawer;
  const toFinishTotal = data?.toFinish.total ?? 0;
  const toFinishLate = data?.toFinish.late ?? 0;

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

      <SectionLabel>Performa</SectionLabel>
      <p className="text-xs text-slate-500 -mt-2 mb-3 leading-relaxed">
        Performa dihitung dari seberapa banyak komisi / poin yang dikumpulkan.
      </p>
      <EmployeePerformaChart />

      <TodayWorkList data={data} />

      <SectionLabel>Rangkuman Hari Ini</SectionLabel>

      <div className="space-y-3">
        <StatGroup>
          <StatItem
            icon={TrendingUp}
            label="Omset Hari Ini"
            value={data ? formatRupiah(data.revenueToday) : "—"}
            sub="total penjualan hari ini"
          />
          <StatItem
            icon={Receipt}
            label="Pengeluaran"
            value={data ? formatRupiah(data.expensesToday) : "—"}
            sub="hari ini"
          />
        </StatGroup>

        <StatGroup>
          <StatItem
            icon={ShoppingBag}
            label="Transaksi Hari Ini"
            value={data ? `${data.orderCountToday}` : "—"}
            sub="jumlah pesanan"
          />
          <StatItem
            icon={ListChecks}
            label="Perlu Diselesaikan"
            value={data ? `${toFinishTotal}` : "—"}
            sub={
              data
                ? toFinishLate > 0
                  ? `${toFinishLate} terlambat`
                  : "belum selesai"
                : "menunggu data"
            }
            alert={toFinishLate > 0}
          />
        </StatGroup>

        <StatGroup>
          <StatItem
            icon={Wallet}
            label="Uang Laci"
            value={
              data?.cashDrawer
                ? formatRupiah(data.cashDrawer.expectedCash)
                : "—"
            }
            sub={showCashDrawer ? "kas seharusnya" : "belum dibuka"}
          />
          <StatItem
            icon={Fingerprint}
            label="Absensi Bulan Ini"
            value={
              data
                ? `${data.attendance.daysPresent} / ${data.attendance.daysTarget}`
                : "—"
            }
            sub={data ? `${attPct}% target` : "menunggu data"}
          />
        </StatGroup>
      </div>
    </div>
  );
}
