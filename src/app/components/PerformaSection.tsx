import { useEffect, useState } from "react";
import { Clock, Star } from "lucide-react";
import { getPerforma } from "../lib/dashboard";
import type { PerformaSummary } from "../types";
import { Skeleton } from "./ui/skeleton";

function formatScore(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/** Skor 1–10: merah di bawah 5, hijau di atas 5, gradien sesuai nilai. */
function serviceScoreColor(score: number): string {
  if (score <= 0) return "#94a3b8";
  const s = Math.max(1, Math.min(10, score));
  if (s < 5) {
    const t = (s - 1) / 4;
    return `hsl(0, ${78 - t * 12}%, ${38 + t * 20}%)`;
  }
  if (s > 5) {
    const t = (s - 5) / 5;
    return `hsl(${105 + t * 25}, ${52 + t * 18}%, ${38 - t * 6}%)`;
  }
  return "#64748b";
}

function punctualityColor(score: number, passing: number): string {
  if (score <= 0) return "#94a3b8";
  if (score < passing) {
    const t = Math.max(0, score / passing);
    return `hsl(0, ${75 - t * 15}%, ${40 + t * 10}%)`;
  }
  const t = (score - passing) / (10 - passing);
  return `hsl(${105 + t * 25}, ${50 + t * 20}%, ${40 - t * 5}%)`;
}

function PerformaSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

export function PerformaSection() {
  const [data, setData] = useState<PerformaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getPerforma());
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Gagal memuat performa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <PerformaSkeleton />;

  const passing = data?.punctualityPassing ?? 8.5;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-amber-50 text-amber-800 text-sm rounded-xl px-4 py-3 border border-amber-100">
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

      <p className="text-sm font-medium text-slate-700">Karyawan</p>

      {data && data.employees.length === 0 && (
        <p className="text-xs text-slate-400 py-2">
          Belum ada data karyawan.
        </p>
      )}

      {data && data.employees.length > 0 && (
        <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center px-4 py-3 bg-slate-50/80 border-b border-slate-200/80">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">
              Karyawan
            </span>
            <div className="flex flex-col items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500 text-center border-l border-slate-200/80">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#001F5B]/10 text-[#001F5B]">
                <Star className="size-3.5" aria-hidden />
              </span>
              Layanan
            </div>
            <div className="flex flex-col items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500 text-center border-l border-slate-200/80">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#001F5B]/10 text-[#001F5B]">
                <Clock className="size-3.5" aria-hidden />
              </span>
              Ketepatan
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {data.employees.map((emp) => (
              <div
                key={emp.userId}
                className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center px-4 py-3"
              >
                <span className="text-sm font-semibold text-slate-800 truncate pr-2">
                  {emp.fullName}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums text-center border-l border-slate-100"
                  style={{ color: serviceScoreColor(emp.servicePerformance) }}
                >
                  {formatScore(emp.servicePerformance)}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums text-center border-l border-slate-100"
                  style={{
                    color: punctualityColor(emp.punctuality, passing),
                  }}
                >
                  {formatScore(emp.punctuality)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
