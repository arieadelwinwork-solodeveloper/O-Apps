import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Loader2,
  Scale,
  TrendingUp,
} from "lucide-react";
import {
  getDashboardSummary,
  getFinanceForecast,
  formatRupiah,
  rangeLabel,
} from "../lib/dashboard";
import type { DashboardRange, DashboardSummary, FinanceForecast } from "../types";

const RANGES: DashboardRange[] = ["today", "week", "month"];

function totalPengeluaran(summary: DashboardSummary | null): number {
  if (!summary) return 0;
  return summary.expenses + summary.commissions;
}

function labaBersih(summary: DashboardSummary | null): number {
  if (!summary) return 0;
  return summary.revenue - totalPengeluaran(summary);
}

export function FinanceView() {
  const [range, setRange] = useState<DashboardRange>("today");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [forecast, setForecast] = useState<FinanceForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(r: DashboardRange = range) {
    setError(null);
    try {
      const [s, f] = await Promise.all([
        getDashboardSummary(r),
        getFinanceForecast(),
      ]);
      setSummary(s);
      setForecast(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  if (loading && !summary) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const growth = summary?.growthPercent;
  const pengeluaran = totalPengeluaran(summary);
  const laba = labaBersih(summary);
  const labaPositif = laba >= 0;
  const forecastLabaPositif = (forecast?.forecastLabaBersih ?? 0) >= 0;

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-[#001F5B]">Ringkasan Keuangan</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Periode: {rangeLabel(range)}
        </p>
      </div>

      {/* Periode */}
      <div className="bg-white rounded-2xl p-1.5 flex shadow-sm border border-black/[0.02]">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`flex-1 text-xs font-medium py-2 rounded-xl transition-all ${
              range === r
                ? "bg-[#001F5B] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {rangeLabel(r)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {/* Omset */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.03]"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">Omset</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Total pendapatan selama periode yang dipilih.
              </p>
              <div className="text-2xl font-semibold text-[#001F5B] mt-2">
                {formatRupiah(summary?.revenue ?? 0)}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                <span>{summary?.orderCount ?? 0} transaksi</span>
                {growth !== null && growth !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      growth >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    {growth >= 0 ? "+" : ""}
                    {growth}% vs periode sebelumnya
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pengeluaran */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.03]"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">Pengeluaran</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Biaya langsung untuk menghasilkan produk atau memberikan jasa +
                pengeluaran operasional.
              </p>
              <div className="text-2xl font-semibold text-slate-800 mt-2">
                {formatRupiah(pengeluaran)}
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                <div className="flex justify-between gap-2">
                  <span>Biaya operasional</span>
                  <span>{formatRupiah(summary?.expenses ?? 0)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Biaya langsung (komisi jasa)</span>
                  <span>{formatRupiah(summary?.commissions ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Laba / Rugi Bersih */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-[20px] p-5 shadow-sm border ${
            labaPositif
              ? "bg-[#001F5B] text-white border-[#001F5B]"
              : "bg-red-50 text-red-900 border-red-100"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                labaPositif ? "bg-white/15 text-white" : "bg-red-100 text-red-600"
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">
                {labaPositif ? "Laba Bersih" : "Rugi Bersih"}
              </div>
              <p
                className={`text-[11px] mt-0.5 leading-snug ${
                  labaPositif ? "text-white/70" : "text-red-600/80"
                }`}
              >
                Omset dikurangi total pengeluaran.
              </p>
              <div className="text-2xl font-semibold mt-2">
                {formatRupiah(Math.abs(laba))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {forecast && (
        <div className="space-y-3 pt-1">
          <div>
            <h3 className="text-sm font-semibold text-[#001F5B] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Prediksi Akhir Bulan
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {forecast.monthLabel} · hari ke-{forecast.daysElapsed} dari{" "}
              {forecast.daysInMonth}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.03]"
          >
            <div className="text-sm font-semibold text-slate-800">
              Prediksi Omset
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              (Omset s/d hari ini ÷ {forecast.daysElapsed}) ×{" "}
              {forecast.daysInMonth} hari
            </p>
            <div className="text-xl font-semibold text-[#001F5B] mt-2">
              {formatRupiah(forecast.forecastOmset)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Omset bulan ini: {formatRupiah(forecast.revenueMonth)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.03]"
          >
            <div className="text-sm font-semibold text-slate-800">
              Prediksi Pengeluaran
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Pengeluaran bulan lalu + estimasi gaji (
              {formatRupiah(forecast.avgSalaryLastMonth)} ÷{" "}
              {forecast.workDaysFullMonth} hari × {forecast.daysInMonth} ×{" "}
              {forecast.activeEmployeeCount} karyawan)
            </p>
            <div className="text-xl font-semibold text-slate-800 mt-2">
              {formatRupiah(forecast.forecastPengeluaran)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pengeluaran bulan lalu:{" "}
              {formatRupiah(forecast.lastMonthTotalExpense)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-[20px] p-5 shadow-sm border ${
              forecastLabaPositif
                ? "bg-emerald-50 text-emerald-900 border-emerald-100"
                : "bg-red-50 text-red-900 border-red-100"
            }`}
          >
            <div className="text-sm font-semibold">
              Prediksi {forecastLabaPositif ? "Laba" : "Rugi"} Bersih
            </div>
            <p
              className={`text-[11px] mt-0.5 leading-snug ${
                forecastLabaPositif ? "text-emerald-700/80" : "text-red-600/80"
              }`}
            >
              Prediksi omset dikurangi prediksi pengeluaran.
            </p>
            <div className="text-xl font-semibold mt-2">
              {formatRupiah(Math.abs(forecast.forecastLabaBersih))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
