import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Plus, Crown, RefreshCw, Package } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { inputClass, Field } from "../components/formui";
import { listCustomers } from "../lib/orders";
import { listServices } from "../lib/customization";
import {
  listMemberships,
  listMembershipPackages,
  registerMembership,
  createMembershipPackage,
  setMembershipPackageActive,
  topupMembership,
  formatRupiah,
  describePackage,
  MEMBERSHIP_TYPE_LABEL,
  CHANGE_TYPE_LABEL,
  listMembershipTransactions,
} from "../lib/membership";
import type {
  Membership,
  MembershipPackage,
  MembershipType,
  Customer,
  Service,
  MembershipTransaction,
} from "../types";

type Tab = "terdaftar" | "paket";

export function MembershipView() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [tab, setTab] = useState<Tab>("terdaftar");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [registerCustomerId, setRegisterCustomerId] = useState("");
  const [registerPackageId, setRegisterPackageId] = useState("");

  const [showPackageForm, setShowPackageForm] = useState(false);
  const [pkgType, setPkgType] = useState<MembershipType>("saldo");
  const [pkgName, setPkgName] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgSaldo, setPkgSaldo] = useState("");
  const [pkgQuota, setPkgQuota] = useState("");
  const [pkgServiceId, setPkgServiceId] = useState("");

  const [topupId, setTopupId] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [txMap, setTxMap] = useState<Record<string, MembershipTransaction[]>>(
    {}
  );

  const activePackages = useMemo(
    () => packages.filter((p) => p.is_active),
    [packages]
  );

  async function load() {
    setError(null);
    try {
      const [m, p, c, s] = await Promise.all([
        listMemberships(),
        listMembershipPackages(),
        listCustomers(),
        listServices(),
      ]);
      setMemberships(m);
      setPackages(p);
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

  function resetPackageForm() {
    setPkgName("");
    setPkgPrice("");
    setPkgSaldo("");
    setPkgQuota("");
    setPkgServiceId("");
    setPkgType("saldo");
  }

  async function submitRegister() {
    if (!registerCustomerId || !registerPackageId) {
      setError("Pilih pelanggan dan paket membership");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await registerMembership({
        customerId: registerCustomerId,
        packageId: registerPackageId,
      });
      setShowRegister(false);
      setRegisterCustomerId("");
      setRegisterPackageId("");
      await load();
      setTab("terdaftar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mendaftarkan membership");
    } finally {
      setBusy(false);
    }
  }

  async function submitPackage() {
    const price = Number(pkgPrice) || 0;
    if (!pkgName.trim() || price <= 0) {
      setError("Nama paket dan harga wajib diisi");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (pkgType === "saldo") {
        const saldo = Number(pkgSaldo) || 0;
        if (saldo <= 0) {
          setError("Saldo paket wajib diisi");
          setBusy(false);
          return;
        }
        await createMembershipPackage({
          type: "saldo",
          name: pkgName.trim(),
          price,
          saldoAmount: saldo,
        });
      } else {
        const quota = Number(pkgQuota) || 0;
        if (!pkgServiceId || quota <= 0) {
          setError("Layanan dan kuota wajib diisi");
          setBusy(false);
          return;
        }
        await createMembershipPackage({
          type: "kuota",
          name: pkgName.trim(),
          price,
          quotaAmount: quota,
          quotaServiceId: pkgServiceId,
        });
      }
      setShowPackageForm(false);
      resetPackageForm();
      await load();
      setTab("paket");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan paket");
    } finally {
      setBusy(false);
    }
  }

  async function togglePackageActive(pkg: MembershipPackage) {
    setBusy(true);
    setError(null);
    try {
      await setMembershipPackageActive(pkg.id, !pkg.is_active);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui paket");
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("terdaftar")}
          className={`flex-1 rounded-xl py-2.5 text-xs font-semibold ${
            tab === "terdaftar"
              ? "bg-[#001F5B] text-white"
              : "bg-white border border-black/5 text-slate-600"
          }`}
        >
          Terdaftar
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={() => setTab("paket")}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold ${
              tab === "paket"
                ? "bg-[#001F5B] text-white"
                : "bg-white border border-black/5 text-slate-600"
            }`}
          >
            Kelola Paket
          </button>
        )}
      </div>

      {isOwner && (
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (tab === "paket") {
                resetPackageForm();
                setShowPackageForm(true);
              } else {
                setRegisterCustomerId("");
                setRegisterPackageId("");
                setShowRegister(true);
              }
            }}
            className="flex-1 bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {tab === "paket" ? "Tambah Paket" : "Daftar Membership"}
          </motion.button>
          <button
            type="button"
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

      {tab === "terdaftar" && (
        <>
          {memberships.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Belum ada membership terdaftar. Pilih pelanggan dan paket untuk
              mendaftar.
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
                        {m.membership_packages
                          ? ` · ${m.membership_packages.name}`
                          : ""}
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
                        type="button"
                        onClick={() => {
                          setTopupId(m.id);
                          setTopupAmount("");
                        }}
                        className="text-xs font-medium text-[#001F5B] bg-[#001F5B]/10 rounded-lg px-3 py-1.5"
                      >
                        Top-up manual
                      </button>
                      <button
                        type="button"
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
        </>
      )}

      {tab === "paket" && isOwner && (
        <>
          {packages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Belum ada paket membership. Tambahkan paket saldo atau kuota.
            </p>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-[20px] p-4 shadow-sm border ${
                    pkg.is_active
                      ? "border-black/[0.03]"
                      : "border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#001F5B]" />
                        {pkg.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {MEMBERSHIP_TYPE_LABEL[pkg.type]} · {describePackage(pkg)}
                      </div>
                      <div className="text-xs font-medium text-[#001F5B] mt-1">
                        Harga {formatRupiah(pkg.price)}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => togglePackageActive(pkg)}
                      className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${
                        pkg.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {pkg.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowRegister(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-[#001F5B] mb-1">
              Daftar Membership
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Pilih pelanggan dan paket yang akan didaftarkan.
            </p>
            <div className="space-y-3">
              <Field label="Pelanggan">
                <select
                  value={registerCustomerId}
                  onChange={(e) => setRegisterCustomerId(e.target.value)}
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
              </Field>
              <Field label="Paket membership">
                <select
                  value={registerPackageId}
                  onChange={(e) => setRegisterPackageId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih paket</option>
                  {activePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — {formatRupiah(pkg.price)} (
                      {describePackage(pkg)})
                    </option>
                  ))}
                </select>
              </Field>
              {activePackages.length === 0 && (
                <p className="text-xs text-amber-600">
                  Belum ada paket aktif. Buat paket di tab Kelola Paket.
                </p>
              )}
              <button
                type="button"
                onClick={submitRegister}
                disabled={busy || activePackages.length === 0}
                className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 disabled:opacity-60"
              >
                Daftarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {showPackageForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPackageForm(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-[#001F5B] mb-4">Tambah Paket</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["saldo", "kuota"] as MembershipType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPkgType(t)}
                    className={`rounded-xl py-2 text-xs font-medium ${
                      pkgType === t
                        ? "bg-[#001F5B] text-white"
                        : "bg-[#F5F5F7] text-slate-600"
                    }`}
                  >
                    {MEMBERSHIP_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              <Field label="Nama paket">
                <input
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="Contoh: Paket Silver"
                  className={inputClass}
                />
              </Field>
              <Field label="Harga paket">
                <input
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(e.target.value)}
                  placeholder="Harga jual (Rp)"
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
              {pkgType === "saldo" ? (
                <Field label="Saldo">
                  <input
                    value={pkgSaldo}
                    onChange={(e) => setPkgSaldo(e.target.value)}
                    placeholder="Saldo yang didapat pelanggan (Rp)"
                    inputMode="numeric"
                    className={inputClass}
                  />
                </Field>
              ) : (
                <>
                  <Field label="Kuota layanan">
                    <input
                      value={pkgQuota}
                      onChange={(e) => setPkgQuota(e.target.value)}
                      placeholder="Jumlah kuota"
                      inputMode="numeric"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Layanan">
                    <select
                      value={pkgServiceId}
                      onChange={(e) => setPkgServiceId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Pilih layanan</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.unit})
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              <button
                type="button"
                onClick={submitPackage}
                disabled={busy}
                className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 disabled:opacity-60"
              >
                Simpan Paket
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
            <h3 className="font-semibold text-[#001F5B] mb-4">
              Top-up Manual
            </h3>
            <input
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="Nominal"
              inputMode="numeric"
              className={inputClass + " mb-3"}
              autoFocus
            />
            <button
              type="button"
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
