import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Loader2, Search, Users, ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { inputClass } from "../components/formui";
import {
  listCustomerStats,
  formatRupiah,
  formatMemberDuration,
} from "../lib/customers";
import type { CustomerStats } from "../types";

type SortKey = "omset" | "transaksi" | "terbaru";

const SORT_OPTIONS: { id: SortKey; label: string; ownerOnly?: boolean }[] = [
  { id: "omset", label: "Omset", ownerOnly: true },
  { id: "transaksi", label: "Transaksi" },
  { id: "terbaru", label: "Terbaru" },
];

export function CustomersView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [customers, setCustomers] = useState<CustomerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>(isOwner ? "omset" : "transaksi");

  async function load(q = query, s = sort) {
    setError(null);
    try {
      const list = await listCustomerStats({
        q: q.trim() || undefined,
        sort: s,
      });
      setCustomers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat konsumen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sort]);

  const sortOptions = SORT_OPTIONS.filter((o) => !o.ownerOnly || isOwner);

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau nomor HP"
          className={inputClass + " pl-10"}
        />
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex gap-1.5 flex-1 overflow-x-auto">
          {sortOptions.map((o) => (
            <button
              key={o.id}
              onClick={() => setSort(o.id)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full ${
                sort === o.id
                  ? "bg-[#001F5B] text-white"
                  : "bg-white text-slate-600 border border-black/5"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="p-2 rounded-xl bg-white border border-black/5 text-[#001F5B] shrink-0"
          aria-label="Muat ulang"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">
          {query ? "Tidak ada konsumen cocok." : "Belum ada data konsumen."}
        </p>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/konsumen/${c.id}`)}
              className="w-full bg-white rounded-[20px] p-4 shadow-sm border border-black/[0.03] text-left flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[#001F5B]/10 text-[#001F5B] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {c.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {c.phone || "—"} · Member {formatMemberDuration(c.member_since)}
                </div>
                <div className="flex gap-3 mt-1.5 text-[11px] text-slate-500">
                  <span>{c.total_transaksi} transaksi</span>
                  {isOwner && c.omset_total !== undefined && (
                    <span className="text-[#001F5B] font-medium">
                      {formatRupiah(c.omset_total)}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      {!isOwner && (
        <p className="text-[11px] text-slate-400 text-center px-4">
          Tampilan terbatas — detail omset hanya untuk owner.
        </p>
      )}
    </div>
  );
}
