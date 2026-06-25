import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  LockKeyhole,
  Unlock,
} from "lucide-react";
import {
  getCurrentShift,
  openShift,
  closeShift,
  type CurrentShift,
} from "../lib/cash";
import { inputClass } from "../components/formui";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export function CashShiftView() {
  const [data, setData] = useState<CurrentShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [result, setResult] = useState<{
    expected: number;
    variance: number;
  } | null>(null);

  async function load() {
    setError(null);
    try {
      setData(await getCurrentShift());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat kas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleOpen() {
    setError(null);
    setBusy(true);
    try {
      await openShift(Number(openingCash) || 0);
      setOpeningCash("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuka kas");
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    setError(null);
    if (closingCash === "") {
      setError("Isi jumlah uang fisik di laci");
      return;
    }
    setBusy(true);
    try {
      const res = await closeShift(Number(closingCash) || 0);
      setResult({ expected: res.expected, variance: res.variance });
      setClosingCash("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menutup kas");
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

  const shift = data?.shift ?? null;
  const breakdown = data?.breakdown;

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`rounded-[20px] p-5 text-white shadow-lg ${
            result.variance === 0
              ? "bg-emerald-600"
              : result.variance > 0
              ? "bg-blue-600"
              : "bg-red-600"
          }`}
        >
          <h3 className="text-white/80 text-sm font-medium mb-1">
            Kas Ditutup
          </h3>
          <div className="text-2xl font-semibold mb-1">
            {result.variance === 0
              ? "Pas"
              : result.variance > 0
              ? `Lebih ${rupiah(result.variance)}`
              : `Kurang ${rupiah(Math.abs(result.variance))}`}
          </div>
          <p className="text-white/80 text-xs">
            Kas seharusnya {rupiah(result.expected)}
          </p>
        </div>
      )}

      {!shift ? (
        // ---------- Buka kas ----------
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
          <div className="flex items-center gap-2 mb-1">
            <Unlock className="w-5 h-5 text-[#001F5B]" />
            <h2 className="text-base font-semibold text-[#001F5B]">Buka Kas</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Masukkan modal awal uang di laci untuk memulai shift.
          </p>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
            Modal Awal (Rp)
          </label>
          <input
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className={inputClass}
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpen}
            disabled={busy}
            className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Buka Kas
          </motion.button>
        </div>
      ) : (
        // ---------- Shift terbuka: prediksi + tutup ----------
        <>
          <div className="bg-[#001F5B] rounded-[20px] p-6 text-white shadow-[0_8px_16px_rgba(0,31,91,0.2)]">
            <div className="flex items-center gap-2 mb-1 text-white/80 text-sm">
              <Wallet className="w-4 h-4" /> Kas Seharusnya Sekarang
            </div>
            <div className="text-3xl font-semibold mb-4">
              {rupiah(breakdown?.expected ?? shift.opening_cash)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/10 rounded-xl p-2.5">
                <div className="text-white/60 mb-0.5">Modal</div>
                <div className="font-semibold">{rupiah(shift.opening_cash)}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5">
                <div className="text-white/60 mb-0.5 flex items-center gap-1">
                  <ArrowDownCircle className="w-3 h-3" /> Masuk
                </div>
                <div className="font-semibold">
                  {rupiah(breakdown?.cashIn ?? 0)}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5">
                <div className="text-white/60 mb-0.5 flex items-center gap-1">
                  <ArrowUpCircle className="w-3 h-3" /> Keluar
                </div>
                <div className="font-semibold">
                  {rupiah(breakdown?.cashOut ?? 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
            <div className="flex items-center gap-2 mb-1">
              <LockKeyhole className="w-5 h-5 text-[#001F5B]" />
              <h2 className="text-base font-semibold text-[#001F5B]">Tutup Kas</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Hitung uang fisik di laci, sistem cek selisihnya.
            </p>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Uang Fisik di Laci (Rp)
            </label>
            <input
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className={inputClass}
            />
            {closingCash !== "" && breakdown && (
              <p className="text-xs mt-2 ml-1 text-slate-500">
                Selisih:{" "}
                <span
                  className={
                    Number(closingCash) - breakdown.expected === 0
                      ? "text-emerald-600 font-medium"
                      : Number(closingCash) - breakdown.expected > 0
                      ? "text-blue-600 font-medium"
                      : "text-red-600 font-medium"
                  }
                >
                  {rupiah(Number(closingCash) - breakdown.expected)}
                </span>
              </p>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleClose}
              disabled={busy}
              className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Tutup Kas
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
