import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Plus,
  RefreshCw,
  Package,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Settings2,
  Trash2,
  History,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { inputClass } from "../components/formui";
import {
  listInventory,
  listInventoryMovements,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  recordInventoryMovement,
  isLowStock,
  formatStock,
  CHANGE_TYPE_LABEL,
} from "../lib/inventory";
import type { InventoryItem, InventoryMovement, InventoryChangeType } from "../types";

export function InventoryView() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUnit, setFormUnit] = useState("pcs");
  const [formMin, setFormMin] = useState("");
  const [formInitial, setFormInitial] = useState("");

  const [moving, setMoving] = useState<{
    item: InventoryItem;
    type: InventoryChangeType;
  } | null>(null);
  const [moveQty, setMoveQty] = useState("");
  const [moveNote, setMoveNote] = useState("");

  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [editMin, setEditMin] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [movMap, setMovMap] = useState<Record<string, InventoryMovement[]>>({});

  async function load() {
    setError(null);
    try {
      setItems(await listInventory());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat inventori");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const lowStockItems = items.filter(isLowStock);

  async function toggleHistory(item: InventoryItem) {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    if (!movMap[item.id]) {
      try {
        const mov = await listInventoryMovements(item.id);
        setMovMap((prev) => ({ ...prev, [item.id]: mov }));
      } catch {
        setError("Gagal memuat riwayat");
      }
    }
  }

  async function submitCreate() {
    if (!formName.trim()) {
      setError("Nama barang wajib diisi");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createInventoryItem({
        name: formName.trim(),
        unit: formUnit.trim() || "pcs",
        minStock: Number(formMin) || 0,
        initialStock: Number(formInitial) || 0,
      });
      setShowForm(false);
      setFormName("");
      setFormMin("");
      setFormInitial("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah barang");
    } finally {
      setBusy(false);
    }
  }

  async function submitMovement() {
    if (!moving) return;
    const qty = Number(moveQty) || 0;
    if (qty <= 0) {
      setError("Jumlah wajib diisi");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await recordInventoryMovement(moving.item.id, {
        changeType: moving.type,
        qty,
        note: moveNote.trim() || undefined,
      });
      setMoving(null);
      setMoveQty("");
      setMoveNote("");
      setMovMap({});
      setExpandedId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencatat mutasi");
    } finally {
      setBusy(false);
    }
  }

  async function submitEditMin() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await updateInventoryItem(editing.id, {
        minStock: Number(editMin) || 0,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: InventoryItem) {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteInventoryItem(item.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus");
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

      <div className="flex gap-2">
        {isOwner && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="flex-1 bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Barang
          </motion.button>
        )}
        <button
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="px-4 rounded-xl bg-white border border-black/5 text-[#001F5B]"
          aria-label="Muat ulang"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 rounded-[20px] p-4 border border-amber-100">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Perlu Dibeli ({lowStockItems.length})
          </h3>
          <div className="space-y-1.5">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between text-sm text-amber-900"
              >
                <span>{item.name}</span>
                <span className="font-medium">
                  {formatStock(Number(item.current_stock), item.unit)}
                  <span className="text-amber-600 font-normal">
                    {" "}
                    / min {item.min_stock}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Belum ada barang inventori.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const low = isLowStock(item);
            return (
              <div
                key={item.id}
                className={`bg-white rounded-[20px] p-4 shadow-sm border ${
                  low ? "border-amber-200" : "border-black/[0.03]"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Min: {item.min_stock} {item.unit}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      low ? "text-amber-600" : "text-[#001F5B]"
                    }`}
                  >
                    {formatStock(Number(item.current_stock), item.unit)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {isOwner && (
                    <button
                      onClick={() =>
                        setMoving({ item, type: "masuk" })
                      }
                      className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center gap-1"
                    >
                      <ArrowDown className="w-3 h-3" />
                      Restock
                    </button>
                  )}
                  <button
                    onClick={() => setMoving({ item, type: "keluar" })}
                    className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-700 flex items-center gap-1"
                  >
                    <ArrowUp className="w-3 h-3" />
                    Pakai
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() =>
                          setMoving({ item, type: "adjust" })
                        }
                        className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 flex items-center gap-1"
                      >
                        <Settings2 className="w-3 h-3" />
                        Koreksi
                      </button>
                      <button
                        onClick={() => {
                          setEditing(item);
                          setEditMin(String(item.min_stock));
                        }}
                        className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-[#001F5B]/10 text-[#001F5B]"
                      >
                        Min Stok
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={busy}
                        className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 disabled:opacity-60"
                        aria-label="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => toggleHistory(item)}
                    className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg text-slate-500 flex items-center gap-1"
                  >
                    <History className="w-3 h-3" />
                    Riwayat
                  </button>
                </div>

                {expandedId === item.id && movMap[item.id] && (
                  <div className="mt-3 pt-3 border-t border-dashed border-black/[0.06] space-y-1.5">
                    {movMap[item.id].length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada mutasi.</p>
                    ) : (
                      movMap[item.id].map((m) => (
                        <div
                          key={m.id}
                          className="flex justify-between text-xs text-slate-600"
                        >
                          <span>
                            {CHANGE_TYPE_LABEL[m.change_type]}
                            {m.users?.full_name
                              ? ` · ${m.users.full_name}`
                              : ""}
                          </span>
                          <span
                            className={
                              m.change_type === "masuk"
                                ? "text-emerald-600"
                                : m.change_type === "keluar"
                                ? "text-red-500"
                                : "text-slate-600"
                            }
                          >
                            {m.change_type === "adjust"
                              ? `→ ${m.qty}`
                              : m.change_type === "masuk"
                              ? `+${m.qty}`
                              : `−${m.qty}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowForm(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl">
            <h3 className="font-semibold text-[#001F5B] mb-4">Tambah Barang</h3>
            <div className="space-y-3">
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama barang"
                className={inputClass}
                autoFocus
              />
              <input
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="Satuan (kg, pcs, liter)"
                className={inputClass}
              />
              <input
                value={formMin}
                onChange={(e) => setFormMin(e.target.value)}
                placeholder="Stok minimal"
                inputMode="decimal"
                className={inputClass}
              />
              <input
                value={formInitial}
                onChange={(e) => setFormInitial(e.target.value)}
                placeholder="Stok awal (opsional)"
                inputMode="decimal"
                className={inputClass}
              />
              <button
                onClick={submitCreate}
                disabled={busy}
                className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 disabled:opacity-60"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {moving && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoving(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl">
            <h3 className="font-semibold text-[#001F5B] mb-1">
              {CHANGE_TYPE_LABEL[moving.type]} — {moving.item.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Stok kini:{" "}
              {formatStock(
                Number(moving.item.current_stock),
                moving.item.unit
              )}
              {moving.type === "adjust" && " · isi nilai stok akhir"}
            </p>
            <input
              value={moveQty}
              onChange={(e) => setMoveQty(e.target.value)}
              placeholder={
                moving.type === "adjust" ? "Stok akhir" : "Jumlah"
              }
              inputMode="decimal"
              className={inputClass + " mb-3"}
              autoFocus
            />
            <input
              value={moveNote}
              onChange={(e) => setMoveNote(e.target.value)}
              placeholder="Catatan (opsional)"
              className={inputClass + " mb-3"}
            />
            <button
              onClick={submitMovement}
              disabled={busy}
              className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 disabled:opacity-60"
            >
              Simpan
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditing(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl">
            <h3 className="font-semibold text-[#001F5B] mb-4">
              Min Stok — {editing.name}
            </h3>
            <input
              value={editMin}
              onChange={(e) => setEditMin(e.target.value)}
              placeholder="Ambang notifikasi"
              inputMode="decimal"
              className={inputClass + " mb-3"}
              autoFocus
            />
            <button
              onClick={submitEditMin}
              disabled={busy}
              className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 disabled:opacity-60"
            >
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
