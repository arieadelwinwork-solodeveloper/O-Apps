import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Send, MessageSquareWarning, CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { inputClass } from "../components/formui";
import {
  listReports,
  submitReport,
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABEL,
  formatReportDate,
} from "../lib/reports";
import type { OperationalReport, ReportCategory } from "../types";

export function ReportsView() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [reports, setReports] = useState<OperationalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const [category, setCategory] = useState<ReportCategory>("operasional");
  const [message, setMessage] = useState("");

  async function load() {
    setError(null);
    try {
      setReports(await listReports());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit() {
    if (!message.trim()) {
      setError("Keterangan wajib diisi");
      return;
    }
    if (message.trim().length < 5) {
      setError("Keterangan minimal 5 karakter");
      return;
    }
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      await submitReport({ category, message: message.trim() });
      setMessage("");
      setCategory("operasional");
      setSent(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim laporan");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!isOwner && (
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-black/[0.03] space-y-3">
          <div className="flex items-center gap-2 text-[#001F5B]">
            <MessageSquareWarning className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Kirim Laporan ke Owner</h3>
          </div>
          <p className="text-xs text-slate-500">
            Laporkan masalah operasional, aplikasi, atau hal lain. Owner akan
            mendapat notifikasi.
          </p>

          <label className="block text-xs font-medium text-slate-600">
            Jenis masalah
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
            className={inputClass}
          >
            {REPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {REPORT_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>

          <label className="block text-xs font-medium text-slate-600">
            Keterangan
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Jelaskan masalah yang terjadi…"
            rows={4}
            className={inputClass + " resize-none"}
          />

          {sent && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs bg-emerald-50 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Laporan terkirim. Owner akan mendapat notifikasi.
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={busy}
            className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Kirim ke Owner
          </motion.button>
        </div>
      )}

      {isOwner && (
        <p className="text-xs text-slate-500 px-1">
          Laporan dari karyawan. Anda juga mendapat notifikasi saat ada laporan
          baru.
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
          {isOwner ? "Semua Laporan" : "Riwayat Laporan Saya"}
        </h3>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Belum ada laporan.
          </p>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-[20px] p-4 shadow-sm border border-black/[0.03]"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-xs font-semibold text-[#001F5B]">
                  {REPORT_CATEGORY_LABEL[r.category]}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {formatReportDate(r.created_at)}
                </span>
              </div>
              {isOwner && r.users?.full_name && (
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Dari: {r.users.full_name}
                </p>
              )}
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {r.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
