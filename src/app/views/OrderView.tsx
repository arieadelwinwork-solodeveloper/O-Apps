import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Plus,
  Minus,
  Loader2,
  Package,
  CheckCircle2,
  Upload,
  X,
} from "lucide-react";
import { listServices } from "../lib/customization";
import { formatServiceUnit } from "../lib/serviceUnits";
import {
  createOrder,
  uploadPaymentProof,
  type CreateOrderInput,
} from "../lib/orders";
import { listMemberships } from "../lib/membership";
import { inputClass } from "../components/formui";
import type {
  Service,
  PaymentStatus,
  PaymentMethod,
  Membership,
} from "../types";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const PAYMENT_STATUS: { id: PaymentStatus; label: string }[] = [
  { id: "lunas_depan", label: "Lunas" },
  { id: "dp", label: "DP" },
  { id: "bayar_belakang", label: "Bayar Nanti" },
];

const PAYMENT_METHOD: { id: PaymentMethod; label: string }[] = [
  { id: "tunai", label: "Tunai" },
  { id: "qris", label: "QRIS" },
  { id: "transfer", label: "Transfer" },
];

export function OrderView() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successNo, setSuccessNo] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("lunas_depan");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tunai");
  const [dpAmount, setDpAmount] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [saldoToUse, setSaldoToUse] = useState("");
  const [quotaToUse, setQuotaToUse] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const list = await listServices();
        setServices(list.filter((s) => s.is_active));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat layanan");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const phone = customerPhone.trim();
    if (phone.length < 8) {
      setMemberships([]);
      setSaldoToUse("");
      setQuotaToUse({});
      return;
    }
    const t = setTimeout(async () => {
      try {
        const list = await listMemberships({ phone });
        setMemberships(list);
        setSaldoToUse("");
        setQuotaToUse({});
      } catch {
        setMemberships([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [customerPhone]);

  const saldoMembership = memberships.find((m) => m.type === "saldo");
  const quotaMemberships = memberships.filter((m) => m.type === "kuota");

  const total = useMemo(
    () =>
      services.reduce(
        (sum, s) => sum + (cart[s.id] ? s.price * cart[s.id] : 0),
        0
      ),
    [services, cart]
  );
  const itemCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart]
  );

  const quotaDiscount = useMemo(() => {
    let d = 0;
    for (const m of quotaMemberships) {
      if (!m.quota_service_id) continue;
      const cartQty = cart[m.quota_service_id] ?? 0;
      if (cartQty <= 0) continue;
      const useQty = Math.min(
        Number(quotaToUse[m.id]) || 0,
        cartQty,
        m.quota_remaining
      );
      const svc = services.find((s) => s.id === m.quota_service_id);
      if (svc && useQty > 0) d += svc.price * useQty;
    }
    return d;
  }, [quotaMemberships, cart, quotaToUse, services]);

  const netBeforeSaldo = total - quotaDiscount;
  const saldoMembershipAmount = Math.min(
    Number(saldoToUse) || 0,
    saldoMembership?.balance ?? 0,
    Math.max(0, netBeforeSaldo)
  );
  const membershipDiscount = quotaDiscount + saldoMembershipAmount;
  const netTotal = Math.max(0, total - membershipDiscount);

  const applicableQuotas = quotaMemberships.filter(
    (m) => m.quota_service_id && (cart[m.quota_service_id] ?? 0) > 0
  );

  function setQty(serviceId: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[serviceId];
      else next[serviceId] = qty;
      return next;
    });
  }

  const needsProof =
    paymentMethod !== "tunai" &&
    paymentStatus !== "bayar_belakang" &&
    netTotal > 0;

  async function submit() {
    setError(null);
    if (!customerName.trim()) {
      setError("Nama pelanggan wajib diisi");
      return;
    }
    if (itemCount === 0) {
      setError("Pilih minimal satu layanan");
      return;
    }
    if (paymentStatus === "dp") {
      const dp = Number(dpAmount) || 0;
      if (dp <= 0 || dp >= netTotal) {
        setError("Nominal DP harus lebih dari 0 dan kurang dari sisa tagihan");
        return;
      }
    }
    if (needsProof && !proofFile) {
      setError("Unggah bukti bayar untuk pembayaran non-tunai");
      return;
    }

    setSubmitting(true);
    try {
      let proofUrl: string | undefined;
      if (needsProof && proofFile) {
        proofUrl = await uploadPaymentProof(proofFile);
      }

      const quotaUsages = applicableQuotas
        .map((m) => ({
          membershipId: m.id,
          qty: Math.min(
            Number(quotaToUse[m.id]) || 0,
            cart[m.quota_service_id!] ?? 0,
            m.quota_remaining
          ),
        }))
        .filter((u) => u.qty > 0);

      const payload: CreateOrderInput = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        items: Object.entries(cart).map(([serviceId, qty]) => ({
          serviceId,
          qty,
        })),
        paymentStatus,
        paymentMethod,
        proofUrl,
        ...(paymentStatus === "dp"
          ? { paidAmount: Number(dpAmount) || 0 }
          : {}),
        ...(saldoMembershipAmount > 0
          ? { membershipSaldoAmount: saldoMembershipAmount }
          : {}),
        ...(quotaUsages.length > 0 ? { membershipQuotaUsages: quotaUsages } : {}),
      };
      const order = await createOrder(payload);
      setSuccessNo(order.order_no);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat transaksi");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCustomerName("");
    setCustomerPhone("");
    setCart({});
    setPaymentStatus("lunas_depan");
    setPaymentMethod("tunai");
    setDpAmount("");
    setProofFile(null);
    setMemberships([]);
    setSaldoToUse("");
    setQuotaToUse({});
    setSuccessNo(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (successNo) {
    return (
      <div className="p-6 flex flex-col items-center text-center pt-16">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold text-[#001F5B]">Transaksi Dibuat</h2>
        <p className="text-sm text-slate-500 mt-1">
          Nomor nota <span className="font-semibold">{successNo}</span>
        </p>
        <div className="flex gap-3 mt-8 w-full max-w-xs">
          <button
            onClick={reset}
            className="flex-1 bg-[#001F5B] text-white font-semibold rounded-xl py-3"
          >
            Transaksi Baru
          </button>
          <button
            onClick={() => navigate("/transaksi")}
            className="flex-1 bg-[#001F5B]/10 text-[#001F5B] font-semibold rounded-xl py-3"
          >
            Lihat Daftar
          </button>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-16 px-6 text-slate-400">
        <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">
          Belum ada layanan aktif. Owner perlu menambahkannya di menu Layanan.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-40">
      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Pelanggan */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03] mb-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Data Pelanggan</h2>
        <div className="space-y-3">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nama pelanggan"
            className={inputClass}
          />
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="No. WhatsApp (opsional)"
            inputMode="tel"
            className={inputClass}
          />
        </div>
      </div>

      {/* Layanan */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03] mb-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Pilih Layanan</h2>
        <div className="space-y-2.5">
          {services.map((s) => {
            const qty = cart[s.id] ?? 0;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  qty > 0 ? "border-[#001F5B] bg-[#001F5B]/5" : "border-black/5"
                }`}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">
                    {s.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {rupiah(s.price)} / {formatServiceUnit(s.unit)}
                  </div>
                </div>
                {qty === 0 ? (
                  <button
                    onClick={() => setQty(s.id, 1)}
                    className="w-8 h-8 rounded-lg bg-[#001F5B] text-white flex items-center justify-center"
                    aria-label="Tambah"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(s.id, qty - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center"
                      aria-label="Kurang"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      value={qty}
                      onChange={(e) =>
                        setQty(s.id, Math.max(0, Number(e.target.value) || 0))
                      }
                      inputMode="numeric"
                      className="w-12 text-center bg-[#F5F5F7] rounded-lg py-1.5 text-sm font-medium outline-none"
                    />
                    <button
                      onClick={() => setQty(s.id, qty + 1)}
                      className="w-8 h-8 rounded-lg bg-[#001F5B] text-white flex items-center justify-center"
                      aria-label="Tambah"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Membership */}
      {memberships.length > 0 && itemCount > 0 && (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-amber-100">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Membership
          </h2>
          {saldoMembership && (
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">
                Saldo tersedia: {rupiah(saldoMembership.balance)}
              </div>
              <input
                value={saldoToUse}
                onChange={(e) => setSaldoToUse(e.target.value)}
                placeholder="Pakai saldo (Rp)"
                inputMode="numeric"
                className={inputClass}
              />
            </div>
          )}
          {applicableQuotas.map((m) => {
            const svc = services.find((s) => s.id === m.quota_service_id);
            const max = Math.min(
              cart[m.quota_service_id!] ?? 0,
              m.quota_remaining
            );
            return (
              <div key={m.id} className="mb-2 last:mb-0">
                <div className="text-xs text-slate-500 mb-1">
                  Kuota {svc?.name}: {m.quota_remaining} {svc?.unit} tersisa
                </div>
                <input
                  value={quotaToUse[m.id] ?? ""}
                  onChange={(e) =>
                    setQuotaToUse((prev) => ({
                      ...prev,
                      [m.id]: e.target.value,
                    }))
                  }
                  placeholder={`Pakai kuota (max ${max})`}
                  inputMode="numeric"
                  className={inputClass}
                />
              </div>
            );
          })}
          {membershipDiscount > 0 && (
            <div className="text-xs text-emerald-600 mt-2 font-medium">
              Potongan membership: − {rupiah(membershipDiscount)}
            </div>
          )}
        </div>
      )}

      {/* Pembayaran */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Pembayaran</h2>

        <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
          Status
        </label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PAYMENT_STATUS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPaymentStatus(p.id)}
              className={`rounded-xl py-2.5 text-xs font-medium transition-colors ${
                paymentStatus === p.id
                  ? "bg-[#001F5B] text-white"
                  : "bg-[#F5F5F7] text-slate-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {paymentStatus === "dp" && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Nominal DP (Rp)
            </label>
            <input
              value={dpAmount}
              onChange={(e) => setDpAmount(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className={inputClass}
            />
          </div>
        )}

        {paymentStatus !== "bayar_belakang" && (
          <>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Metode
            </label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PAYMENT_METHOD.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`rounded-xl py-2.5 text-xs font-medium transition-colors ${
                    paymentMethod === m.id
                      ? "bg-[#001F5B] text-white"
                      : "bg-[#F5F5F7] text-slate-600"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}

        {needsProof && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Bukti Bayar (wajib non-tunai)
            </label>
            {proofFile ? (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{proofFile.name}</span>
                <button onClick={() => setProofFile(null)} aria-label="Hapus">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 bg-[#F5F5F7] text-slate-600 rounded-xl px-3 py-3 text-sm cursor-pointer">
                <Upload className="w-4 h-4" />
                Pilih / foto bukti
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) =>
                    setProofFile(e.target.files?.[0] ?? null)
                  }
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Bar total + submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-black/5 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">
            {itemCount} item
            {membershipDiscount > 0 && (
              <span className="text-emerald-600 ml-1">
                · hemat {rupiah(membershipDiscount)}
              </span>
            )}
          </span>
          <div className="text-right">
            {membershipDiscount > 0 && (
              <div className="text-xs text-slate-400 line-through">
                {rupiah(total)}
              </div>
            )}
            <span className="text-lg font-semibold text-[#001F5B]">
              {rupiah(netTotal)}
            </span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={submit}
          disabled={submitting}
          className="w-full bg-[#001F5B] text-white font-medium rounded-2xl py-4 shadow-[0_4px_12px_rgba(0,31,91,0.2)] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Buat Pesanan
        </motion.button>
      </div>
    </div>
  );
}
