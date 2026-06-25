import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Plus, Crown, RefreshCw } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { inputClass } from "../components/formui";
import { listCustomers } from "../lib/orders";
import { listServices } from "../lib/customization";
import {
  listMemberships,
  createMembership,
  topupMembership,
  formatRupiah,
  MEMBERSHIP_TYPE_LABEL,
  CHANGE_TYPE_LABEL,
  listMembershipTransactions,
} from "../lib/membership";
import type {
  Membership,
  MembershipType,
  Customer,
  Service,
  MembershipTransaction,
} from "../types";

export function MembershipView() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<MembershipType>("saldo");
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [initialAmount, setInitialAmount] = useState("");

  const [topupId, setTopupId] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [txMap, setTxMap] = useState<Record<string, MembershipTransaction[]>>(
    {}
  );

  async function load() {
    setError(null);
    try {
      const [m, c, s] = await Promise.all([
        listMemberships(),
        listCustomers(),
        listServices(),
      ]);
      setMemberships(m);
      setCustomers(c);
      setServices(s.filter((x) => x.is_active));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleTx(m: Membership) {
    if (expandedId === m.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(m.id);
    if (!txMap[m.id]) {
      try {
        const tx = await listMembershipTransactions(m.id);
        setTxMap((prev) => ({ ...prev, [m.id]: tx }));
      } catch {
        setError("Gagal memuat riwayat");
      }
    }
  }

  async function submitCreate() {
    const amt = Number(initialAmount) || 0;
    if (!customerId || amt <= 0) {
      setError("Pelanggan dan nominal wajib diisi");
      return;
    }
    if (formType === "kuota" && !serviceId) {
      setError("Pilih layanan untuk kuota");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createMembership({
        customerId,
        type: formType,
        initialAmount: amt,
        ...(formType === "kuota" ? { quotaServiceId: serviceId } : {}),
      });
      setShowForm(false);
      setInitialAmount("");
      setCustomerId("");
      setServiceId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat membership");
    } finally {
      setBusy(false);
    }
  }

  async function submitTopup() {
    if (!topupId) return;
    const amt = Number(topupAmount) || 0;
    if (amt <= 0) {
      setError("Nominal top-up wajib diisi");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await topupMembership(topupId, amt);
      setTopupId(null);
      setTopupAmount("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal top-up");
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

      {isOwner && (
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="flex-1 bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Buat Membership
          </motion.button>
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
      )}

      {memberships.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Belum ada membership terdaftar.
        </p>
      ) : (
        <div className="space-y-3">
          {memberships.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-[20px] p-4 shadow-sm border border-black/[0.03]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    {m.customers?.name ?? "Pelanggan"}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {MEMBERSHIP_TYPE_LABEL[m.type]}
                    {m.type === "kuota" && m.services
                      ? ` · ${m.services.name}`
                      : ""}
                  </div>
                </div>
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                  {m.type === "saldo"
                    ? formatRupiah(m.balance)
                    : `${m.quota_remaining} ${m.services?.unit ?? "unit"}`}
                </span>
              </div>

              {isOwner && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setTopupId(m.id);
                      setTopupAmount("");
                    }}
                    className="text-xs font-medium text-[#001F5B] bg-[#001F5B]/10 rounded-lg px-3 py-1.5"
                  >
                    Top-up
                  </button>
                  <button
                    onClick={() => toggleTx(m)}
                    className="text-xs font-medium text-slate-500"
                  >
                    {expandedId === m.id ? "Sembunyikan" : "Riwayat"}
                  </button>
                </div>
              )}

              {expandedId === m.id && txMap[m.id] && (
                <div className="mt-3 pt-3 border-t border-dashed border-black/[0.06] space-y-1.5">
                  {txMap[m.id].length === 0 ? (
                    <p className="text-xs text-slate-400">Belum ada mutasi.</p>
                  ) : (
                    txMap[m.id].map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between text-xs text-slate-600"
                      >
                        <span>{CHANGE_TYPE_LABEL[tx.change_type]}</span>
                        <span
                          className={
                            tx.amount > 0 ? "text-emerald-600" : "text-red-500"
                          }
                        >
                          {m.type === "saldo"
                            ? formatRupiah(Math.abs(tx.amount))
                            : `${tx.amount > 0 ? "+" : ""}${tx.amount}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowForm(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-[#001F5B] mb-4">
              Buat Membership Baru
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["saldo", "kuota"] as MembershipType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    className={`rounded-xl py-2 text-xs font-medium ${
                      formType === t
                        ? "bg-[#001F5B] text-white"
                        : "bg-[#F5F5F7] text-slate-600"
                    }`}
                  >
                    {MEMBERSHIP_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih pelanggan</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </option>
                ))}
              </select>
              {formType === "kuota" && (
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih layanan</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.unit})
                    </option>
                  ))}
                </select>
              )}
              <input
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder={
                  formType === "saldo"
                    ? "Saldo awal (Rp)"
                    : "Kuota awal (jumlah)"
                }
                inputMode="numeric"
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

      {topupId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setTopupId(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl">
            <h3 className="font-semibold text-[#001F5B] mb-4">Top-up Membership</h3>
            <input
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="Nominal"
              inputMode="numeric"
              className={inputClass + " mb-3"}
              autoFocus
            />
            <button
              onClick={submitTopup}
              disabled={busy}
              className="w-full bg-emerald-600 text-white font-semibold rounded-xl py-3 disabled:opacity-60"
            >
              Top-up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
