import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { inputClass } from "../formui";
import { PaymentProofField } from "./PaymentProofField";
import { uploadPaymentProof } from "../../lib/orders";
import type { Order, PaymentMethod, PaymentStatus } from "../../types";

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

function needsProof(
  method: PaymentMethod,
  status: PaymentStatus,
  amount: number
): boolean {
  if (method === "tunai" || status === "bayar_belakang") return false;
  return amount > 0;
}

interface PickupPaymentDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onPaid: () => void;
  onSettle: (input: {
    paidAmount: number;
    paymentMethod: PaymentMethod;
    proofUrl?: string;
  }) => Promise<void>;
}

export function PickupPaymentDialog({
  open,
  order,
  onClose,
  onPaid,
  onSettle,
}: PickupPaymentDialogProps) {
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("lunas_depan");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tunai");
  const [dpAmount, setDpAmount] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !order) return;
    setPaymentStatus("lunas_depan");
    setPaymentMethod(order.payment_method ?? "tunai");
    setDpAmount(String(order.remaining_amount));
    setProofFile(null);
    setError(null);
  }, [open, order]);

  if (!open || !order) return null;

  const remaining = order.remaining_amount;
  const payAmount =
    paymentStatus === "lunas_depan"
      ? remaining
      : paymentStatus === "dp"
        ? Number(dpAmount) || 0
        : 0;
  const showProof = needsProof(paymentMethod, paymentStatus, payAmount);

  async function handleSubmit() {
    setError(null);
    if (paymentStatus === "bayar_belakang") {
      setError("Pengambilan wajib setelah transaksi lunas");
      return;
    }
    if (payAmount <= 0) {
      setError("Nominal pembayaran wajib diisi");
      return;
    }
    if (payAmount < remaining) {
      setError(`Pembayaran kurang. Sisa tagihan ${rupiah(remaining)}`);
      return;
    }
    if (payAmount > remaining) {
      setError("Pembayaran melebihi sisa tagihan");
      return;
    }
    if (showProof && !proofFile) {
      setError("Bukti bayar wajib untuk QRIS/Transfer");
      return;
    }

    setBusy(true);
    try {
      let proofUrl: string | undefined;
      if (proofFile) proofUrl = await uploadPaymentProof(proofFile);
      await onSettle({
        paidAmount: payAmount,
        paymentMethod,
        proofUrl,
      });
      onPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencatat pembayaran");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#001F5B]">Pembayaran</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 text-slate-500"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-4">
          Sisa tagihan <strong>{rupiah(remaining)}</strong> harus dilunasi
          sebelum pesanan diambil.
        </p>

        {error && (
          <div className="mb-3 bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
          Status
        </label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PAYMENT_STATUS.map((p) => (
            <button
              key={p.id}
              type="button"
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
              Nominal bayar (Rp)
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

        {showProof && (
          <div className="pt-2 mb-4 border-t border-slate-100">
            <PaymentProofField file={proofFile} onChange={setProofFile} />
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Bayar & Lanjut
        </button>
      </div>
    </div>
  );
}
