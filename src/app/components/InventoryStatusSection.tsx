import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { formatRupiah, getInventoryStatus } from "../lib/dashboard";
import type { InventoryStatusItem } from "../types";
import { Skeleton } from "./ui/skeleton";

const COLS =
  "grid-cols-[minmax(72px,1.1fr)_3rem_3rem_3rem_4.25rem] sm:grid-cols-[minmax(88px,1.2fr)_3.5rem_3.5rem_3.5rem_5rem]";

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function stockColor(current: number, min: number): string {
  if (current < min) return "#EF4444";
  if (current <= min) return "#EAB308";
  return "#22C55E";
}

function InventorySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function InventoryStatusSection() {
  const [items, setItems] = useState<InventoryStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getInventoryStatus();
      setItems(res.items);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Gagal memuat inventori");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <InventorySkeleton />;

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

      <h2 className="text-lg font-semibold text-[#001F5B] tracking-tight">
        Status Inventori
      </h2>

      {items.length === 0 && !error && (
        <p className="text-xs text-slate-400 py-2">
          Belum ada barang inventori.
        </p>
      )}

      {items.length > 0 && (
        <div className="border border-slate-200/80 rounded-xl overflow-x-auto bg-white">
          <div
            className={`grid ${COLS} items-end min-w-[320px] px-3 sm:px-4 py-3 bg-slate-50/80 border-b border-slate-200/80`}
          >
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">
              Barang
            </span>
            <HeaderCol icon={Package} label="Saat ini" />
            <HeaderCol icon={ArrowDownToLine} label="Min" />
            <HeaderCol icon={ShoppingCart} label="Beli" />
            <HeaderCol icon={Wallet} label="Prediksi" />
          </div>

          <div className="divide-y divide-slate-100 min-w-[320px]">
            {items.map((item) => (
              <div
                key={item.id}
                className={`grid ${COLS} items-center px-3 sm:px-4 py-3`}
              >
                <div className="min-w-0 pr-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-400">{item.unit}</p>
                </div>
                <Cell
                  value={formatQty(item.currentStock)}
                  color={stockColor(item.currentStock, item.minStock)}
                />
                <Cell value={formatQty(item.minStock)} />
                <Cell
                  value={formatQty(item.needToBuy)}
                  color={item.needToBuy > 0 ? "#EAB308" : "#94A3B8"}
                  emphasize={item.needToBuy > 0}
                />
                <Cell
                  value={
                    item.predictedExpense !== null
                      ? formatRupiah(item.predictedExpense)
                      : "?"
                  }
                  color={
                    item.predictedExpense !== null ? "#001F5B" : "#94A3B8"
                  }
                  small
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {items.some((i) => i.needToBuy > 0) && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          Prediksi dari harga pembelian terakhir (catatan mutasi / pengeluaran).
        </p>
      )}
    </div>
  );
}

function HeaderCol({
  icon: Icon,
  label,
}: {
  icon: typeof Package;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-[9px] sm:text-[10px] font-medium text-slate-500 text-center border-l border-slate-200/80">
      <span className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-[#001F5B]/10 text-[#001F5B]">
        <Icon className="size-3 sm:size-3.5" aria-hidden />
      </span>
      {label}
    </div>
  );
}

function Cell({
  value,
  color = "#334155",
  emphasize,
  small,
}: {
  value: string;
  color?: string;
  emphasize?: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={`tabular-nums text-center border-l border-slate-100 font-semibold ${
        small ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"
      } ${emphasize ? "font-bold" : ""}`}
      style={{ color }}
    >
      {value}
    </span>
  );
}
