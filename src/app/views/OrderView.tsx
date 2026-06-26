import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Plus,
  Minus,
  Loader2,
  Package,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { listServices, listTemplates } from "../lib/customization";
import { formatServiceUnit } from "../lib/serviceUnits";
import {
  createOrder,
  uploadPaymentProof,
  type CreateOrderInput,
} from "../lib/orders";
import { listMemberships } from "../lib/membership";
import { getBusiness } from "../lib/printDevices";
import { ensurePrinter, printReceipt } from "../lib/printer";
import {
  openWhatsApp,
  pickTemplate,
  renderTemplate,
  waNumber,
} from "../lib/messages";
import { inputClass } from "../components/formui";
import { PaymentProofField } from "../components/order/PaymentProofField";
import { WhatsAppIcon } from "../components/icons/WhatsAppIcon";
import type {
  Service,
  PaymentStatus,
  PaymentMethod,
  Membership,
  Order,
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

function isPhoneValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8;
}

/** Bukti bayar hanya untuk QRIS/Transfer saat ada pembayaran di muka. */
function requiresPaymentProof(
  method: PaymentMethod,
  status: PaymentStatus,
  netTotal: number,
  dpAmount: string
): boolean {
  if (method === "tunai") return false;
  if (status === "bayar_belakang") return false;
  if (status === "lunas_depan") return netTotal > 0;
  if (status === "dp") return (Number(dpAmount) || 0) > 0;
  return false;
}

export function OrderView() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [printing, setPrinting] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [successError, setSuccessError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNote, setOrderNote] = useState("");
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

  useEffect(() => {
    if (!requiresPaymentProof(paymentMethod, paymentStatus, netTotal, dpAmount)) {
      setProofFile(null);
    }
  }, [paymentMethod, paymentStatus, netTotal, dpAmount]);

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


  const needsProof = requiresPaymentProof(
    paymentMethod,
    paymentStatus,
    netTotal,
    dpAmount
  );

  const submitBlocked =
    submitting ||
    !customerName.trim() ||
    itemCount === 0 ||
    !isPhoneValid(customerPhone) ||
    (needsProof && !proofFile);

  async function submit() {
    setError(null);
    if (!customerName.trim()) {
      setError("Nama pelanggan wajib diisi");
      return;
    }
    if (!isPhoneValid(customerPhone)) {
      setError("Nomor WhatsApp wajib diisi (min. 8 digit)");
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
      setError(
        paymentStatus === "lunas_depan"
          ? "Status Lunas (QRIS/Transfer) wajib melampirkan bukti bayar"
          : "Unggah bukti transfer untuk pembayaran QRIS / Transfer"
      );
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
        customerPhone: customerPhone.trim(),
        items: Object.entries(cart).map(([serviceId, qty]) => ({
          serviceId,
          qty,
        })),
        paymentStatus,
        paymentMethod,
        ...(needsProof && proofUrl ? { proofUrl } : {}),
        ...(orderNote.trim() ? { note: orderNote.trim() } : {}),
        ...(paymentStatus === "dp"
          ? { paidAmount: Number(dpAmount) || 0 }
          : {}),
        ...(saldoMembershipAmount > 0
          ? { membershipSaldoAmount: saldoMembershipAmount }
          : {}),
        ...(quotaUsages.length > 0 ? { membershipQuotaUsages: quotaUsages } : {}),
      };
      const order = await createOrder(payload);
      setSuccessOrder(order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat transaksi");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCustomerName("");
    setCustomerPhone("");
    setOrderNote("");
    setCart({});
    setPaymentStatus("lunas_depan");
    setPaymentMethod("tunai");
    setDpAmount("");
    setProofFile(null);
    setMemberships([]);
    setSaldoToUse("");
    setQuotaToUse({});
    setSuccessOrder(null);
    setSuccessError(null);
  }

  async function printNota() {
    if (!successOrder) return;
    setSuccessError(null);
    setPrinting(true);
    try {
      const business = await getBusiness().catch(() => null);
      const printer = await ensurePrinter();
      await printReceipt(printer, successOrder, business);
    } catch (e) {
      setSuccessError(e instanceof Error ? e.message : "Gagal mencetak nota");
    } finally {
      setPrinting(false);
    }
  }

  async function sendNotaWhatsApp() {
    if (!successOrder) return;
    const phone = waNumber(
      successOrder.customers?.phone ?? customerPhone.trim()
    );
    if (!phone) {
      setSuccessError("Nomor WhatsApp pelanggan tidak valid");
      return;
    }
    setSuccessError(null);
    setSendingWa(true);
    try {
      const templates = await listTemplates().catch(() => []);
      const tpl = pickTemplate(templates, "nota");
      const body = tpl
        ? renderTemplate(tpl.body, successOrder)
        : `Halo ${successOrder.customers?.name ?? ""}, terima kasih atas pesanan Anda.\n\nNota: ${successOrder.order_no}\nTotal: ${rupiah(successOrder.total)}`;
      openWhatsApp(phone, body);
    } catch (e) {
      setSuccessError(
        e instanceof Error ? e.message : "Gagal membuka WhatsApp"
      );
    } finally {
      setSendingWa(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (successOrder) {
    return (
      <div className="p-6 flex flex-col items-center text-center pt-16">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold text-[#001F5B]">Transaksi Dibuat</h2>
        <p className="text-sm text-slate-500 mt-1">
          Nomor nota{" "}
          <span className="font-semibold">{successOrder.order_no}</span>
        </p>

        {successError && (
          <div className="mt-4 w-full max-w-xs text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {successError}
          </div>
        )}

        <div className="flex flex-col gap-2.5 mt-6 w-full max-w-xs">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={printNota}
            disabled={printing}
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-[#001F5B] font-semibold rounded-xl py-3 disabled:opacity-60"
          >
            {printing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Cetak Nota
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={sendNotaWhatsApp}
            disabled={sendingWa}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold rounded-xl py-3 disabled:opacity-60 shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
          >
            {sendingWa ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <WhatsAppIcon className="w-5 h-5" />
            )}
            Kirim Nota ke WhatsApp
          </motion.button>
        </div>

        <div className="flex gap-3 mt-6 w-full max-w-xs">
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
            placeholder="No. WhatsApp"
            inputMode="tel"
            required
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

      {/* Keterangan */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03] mb-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Keterangan</h2>
        <textarea
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
          placeholder="Catatan pesanan (opsional), mis. permintaan khusus pelanggan"
          rows={3}
          maxLength={500}
          className={`${inputClass} resize-none min-h-[88px]`}
        />
      </div>

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
                  type="button"
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
          <div className="pt-4 mt-4 border-t border-slate-100">
            <PaymentProofField file={proofFile} onChange={setProofFile} />
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
          disabled={submitBlocked}
          className="w-full bg-[#001F5B] text-white font-medium rounded-2xl py-4 shadow-[0_4px_12px_rgba(0,31,91,0.2)] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Buat Pesanan
        </motion.button>
      </div>
    </div>
  );
}
