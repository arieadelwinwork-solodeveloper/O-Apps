import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Loader2,
  Bell,
  Users,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  getDashboardSummary,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  formatRupiah,
  rangeLabel,
  NOTIFICATION_TYPE_LABEL,
} from "../lib/dashboard";
import type { DashboardRange, DashboardSummary, AppNotification } from "../types";

const RANGES: DashboardRange[] = ["today", "week", "month"];

export function FinanceView() {
  const navigate = useNavigate();
  const [range, setRange] = useState<DashboardRange>("today");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotif, setShowNotif] = useState(false);

  async function load(r: DashboardRange = range) {
    setError(null);
    try {
      const [s, n] = await Promise.all([
        getDashboardSummary(r),
        listNotifications(),
      ]);
      setSummary(s);
      setNotifications(n.notifications);
      setUnreadCount(n.unreadCount);
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

  async function handleReadNotif(id: string) {
    await markNotificationRead(id);
    await load();
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    await load();
  }

  if (loading && !summary) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const growth = summary?.growthPercent;

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Periode */}
      <div className="bg-white rounded-2xl p-1.5 flex shadow-sm border border-black/[0.02]">
        {RANGES.map((r) => (
          <button
            key={r}
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
        <button
          onClick={() => setShowNotif(!showNotif)}
          className="px-3 text-slate-400 border-l border-slate-100 ml-1 flex items-center justify-center relative"
          aria-label="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Pusat notifikasi */}
      {showNotif && (
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-black/[0.03]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleReadAll}
                className="text-xs text-[#001F5B] font-medium"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Tidak ada notifikasi.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && handleReadNotif(n.id)}
                  className={`w-full text-left rounded-xl p-3 text-sm ${
                    n.is_read ? "bg-slate-50" : "bg-amber-50 border border-amber-100"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-slate-800">{n.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {NOTIFICATION_TYPE_LABEL[n.type] ?? n.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {n.body.replace(/item_id:[a-f0-9-]+/gi, "").trim()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Omset utama */}
      <div className="bg-[#001F5B] rounded-[20px] p-6 text-white shadow-[0_8px_16px_rgba(0,31,91,0.2)]">
        <div className="text-white/70 text-xs font-medium mb-1 uppercase tracking-wider">
          Omset ({rangeLabel(range)})
        </div>
        <div className="text-3xl font-semibold mb-4">
          {formatRupiah(summary?.revenue ?? 0)}
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
          <div>
            <div className="text-white/70 text-xs mb-1">Transaksi</div>
            <div className="text-lg font-medium">{summary?.orderCount ?? 0}</div>
          </div>
          <div>
            <div className="text-white/70 text-xs mb-1">Pertumbuhan</div>
            {growth === null ? (
              <div className="text-white/50 text-sm">—</div>
            ) : (
              <div
                className={`text-sm font-medium flex items-center gap-1 ${
                  growth >= 0 ? "text-emerald-400" : "text-red-300"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {growth >= 0 ? "+" : ""}
                {growth}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profit bersih */}
      <div className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.03] flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#001F5B]/10 text-[#001F5B] flex items-center justify-center">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-500 font-medium">Profit Bersih</div>
          <div className="text-lg font-semibold text-[#001F5B]">
            {formatRupiah(summary?.netProfit ?? 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Omset − pengeluaran − komisi
          </div>
        </div>
      </div>

      {/* Pemasukan vs pengeluaran */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-500 font-medium mb-1">Omset</div>
          <div className="text-sm font-semibold text-slate-800">
            {formatRupiah(summary?.revenue ?? 0)}
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-500 font-medium mb-1">Pengeluaran</div>
          <div className="text-sm font-semibold text-slate-800">
            {formatRupiah(summary?.expenses ?? 0)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.03]">
        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
          <Wallet className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-500 font-medium mb-1">Komisi Karyawan</div>
        <div className="text-sm font-semibold text-slate-800">
          {formatRupiah(summary?.commissions ?? 0)}
        </div>
      </div>

      {/* Performa karyawan */}
      {(summary?.employeePerformance.length ?? 0) > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Performa Karyawan
          </h3>
          <div className="space-y-2">
            {summary!.employeePerformance.map((emp) => (
              <div
                key={emp.userId}
                className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.02] flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {emp.fullName}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {emp.attendanceDays} hari hadir
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-600">
                  {formatRupiah(emp.commissionTotal)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Antrean hari ini */}
      {summary?.queueToday && summary.queueToday.total > 0 && (
        <div className="bg-[#001F5B]/5 rounded-[20px] p-5 border border-[#001F5B]/10">
          <h3 className="text-sm font-semibold text-[#001F5B] mb-3">
            Antrean Hari Ini ({summary.queueToday.total})
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.queueToday.proses > 0 && (
              <span className="bg-white px-3 py-1.5 rounded-full text-xs font-medium text-slate-700">
                {summary.queueToday.proses} Proses
              </span>
            )}
            {summary.queueToday.selesai > 0 && (
              <span className="bg-white px-3 py-1.5 rounded-full text-xs font-medium text-slate-700">
                {summary.queueToday.selesai} Selesai
              </span>
            )}
            {summary.queueToday.antri > 0 && (
              <span className="bg-white px-3 py-1.5 rounded-full text-xs font-medium text-slate-700">
                {summary.queueToday.antri} Antri
              </span>
            )}
          </div>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate("/pengeluaran")}
        className="w-full bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.03] flex items-center justify-between text-left"
      >
        <div>
          <div className="text-sm font-semibold text-slate-800">
            Catat Pengeluaran Baru
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Beban operasional harian</div>
        </div>
        <span className="bg-[#001F5B]/10 text-[#001F5B] px-4 py-2 rounded-xl text-xs font-semibold">
          Input
        </span>
      </motion.button>
    </div>
  );
}
