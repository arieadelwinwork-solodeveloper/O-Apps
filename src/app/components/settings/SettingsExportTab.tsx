import { useState } from "react";
import {
  Loader2,
  MessageSquareHeart,
  ExternalLink,
  Download,
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react";
import { DEV_FEEDBACK_FORM_URL } from "../../config/devFeedback";
import {
  INTERNAL_EXPORT_ITEMS,
  runInternalExport,
  type InternalExportId,
} from "../../lib/internalExports";

export function SettingsExportTab() {
  const [exportingId, setExportingId] = useState<InternalExportId | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const hasFeedbackUrl = DEV_FEEDBACK_FORM_URL.trim().length > 0;

  async function handleExport(id: InternalExportId) {
    if (exportingId) return;
    setExportingId(id);
    setError(null);
    try {
      await runInternalExport(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengekspor data");
    } finally {
      setExportingId(null);
    }
  }

  function openFeedbackForm() {
    if (!hasFeedbackUrl) return;
    window.open(DEV_FEEDBACK_FORM_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Laporan ke Developer */}
      <div className="bg-gradient-to-br from-violet-600 to-[#001F5B] rounded-[20px] p-5 text-white shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <MessageSquareHeart className="w-5 h-5" />
            </span>
            <span className="text-xs font-medium uppercase tracking-wide opacity-80">
              Untuk Developer
            </span>
          </div>
          <h3 className="text-base font-semibold leading-snug">
            Laporan Aplikasi kepada Dev
          </h3>
          <p className="text-sm opacity-85 mt-2 leading-relaxed">
            Temukan bug, ide fitur baru, atau masukan UX? Kirim kritik & saran
            langsung ke tim pengembang aplikasi.
          </p>

          {hasFeedbackUrl ? (
            <button
              type="button"
              onClick={openFeedbackForm}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-white text-[#001F5B] text-sm font-semibold rounded-xl hover:bg-white/95 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Isi Form Kritik & Saran
            </button>
          ) : (
            <div className="mt-4 rounded-xl bg-white/10 border border-white/20 px-4 py-3">
              <p className="text-xs opacity-90 leading-relaxed">
                Form kritik & saran akan segera tersedia. Link form akan
                diaktifkan oleh tim developer.
              </p>
              <button
                type="button"
                disabled
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-white/20 text-white/70 text-sm font-medium rounded-xl cursor-not-allowed"
              >
                <ExternalLink className="w-4 h-4" />
                Form belum diaktifkan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Laporan Internal */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-3">
          <FileSpreadsheet className="w-4 h-4 text-[#001F5B]" />
          <h3 className="text-sm font-semibold text-slate-800">
            Laporan Internal
          </h3>
        </div>
        <p className="text-xs text-slate-500 px-1 mb-3 leading-relaxed">
          Unduh data bisnis Anda dalam format CSV (kompatibel Excel). Data
          tersimpan di perangkat Anda setelah diunduh.
        </p>

        <div className="bg-white rounded-[20px] border border-black/[0.03] shadow-sm overflow-hidden divide-y divide-slate-100">
          {INTERNAL_EXPORT_ITEMS.map((item) => {
            const busy = exportingId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!!exportingId}
                onClick={() => handleExport(item.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/80 disabled:opacity-60 active:bg-slate-100/80"
              >
                <span className="shrink-0 w-10 h-10 rounded-xl bg-[#001F5B]/8 flex items-center justify-center">
                  {busy ? (
                    <Loader2 className="w-5 h-5 text-[#001F5B] animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-[#001F5B]" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {item.desc}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {item.filename}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
