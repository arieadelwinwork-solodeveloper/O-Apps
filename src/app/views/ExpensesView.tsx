import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Receipt, Loader2, Trash2, Banknote, CreditCard } from "lucide-react";
import {
  listExpenses,
  createExpense,
  deleteExpense,
} from "../lib/cash";
import { inputClass } from "../components/formui";
import { useAuth } from "../hooks/useAuth";
import type { Expense } from "../types";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday)
    return "Hari ini " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function ExpensesView() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [isCash, setIsCash] = useState(true);

  async function load() {
    setError(null);
    try {
      setExpenses(await listExpenses());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pengeluaran");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setError(null);
    if (!category.trim()) {
      setError("Keterangan wajib diisi");
      return;
    }
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      setError("Nominal harus lebih dari 0");
      return;
    }
    setSaving(true);
    try {
      await createExpense({ category: category.trim(), amount: amt, isCash });
      setCategory("");
      setAmount("");
      setIsCash(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan pengeluaran");
    } finally {
      setSaving(false);
    }
  }

  async function remove(exp: Expense) {
    if (!confirm(`Hapus pengeluaran "${exp.category}"?`)) return;
    setError(null);
    try {
      await deleteExpense(exp.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus pengeluaran");
    }
  }

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03] mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Catat Pengeluaran
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Keterangan
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Contoh: Beli sabun..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Nominal (Rp)
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Sumber Dana
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCash(true)}
                className={`rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  isCash ? "bg-[#001F5B] text-white" : "bg-[#F5F5F7] text-slate-600"
                }`}
              >
                <Banknote className="w-4 h-4" /> Tunai (laci)
              </button>
              <button
                type="button"
                onClick={() => setIsCash(false)}
                className={`rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  !isCash ? "bg-[#001F5B] text-white" : "bg-[#F5F5F7] text-slate-600"
                }`}
              >
                <CreditCard className="w-4 h-4" /> Non-tunai
              </button>
            </div>
            {isCash && (
              <p className="text-[11px] text-slate-400 mt-1.5 ml-1">
                Mengurangi kas laci pada shift yang terbuka.
              </p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={save}
            disabled={saving}
            className="w-full bg-[#001F5B]/10 text-[#001F5B] font-semibold rounded-xl py-3 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Simpan Pengeluaran
          </motion.button>
        </div>
      </div>

      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-1">
        Riwayat Terbaru
      </h3>
      {loading ? (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Belum ada pengeluaran.
        </p>
      ) : (
        <div className="space-y-3">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.02] flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800">
                  {exp.category}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  {timeLabel(exp.created_at)}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      exp.is_cash
                        ? "bg-[#001F5B]/10 text-[#001F5B]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {exp.is_cash ? "Tunai" : "Non-tunai"}
                  </span>
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {rupiah(exp.amount)}
              </div>
              {isOwner && (
                <button
                  onClick={() => remove(exp)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  aria-label="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
