import { CheckCircle2, Loader2 } from "lucide-react";
import { WhatsAppIcon } from "../icons/WhatsAppIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { formatRupiah } from "../../lib/membership";
import type { PaymentMethod } from "../../types";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  tunai: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
};

export interface MembershipSuccessInfo {
  customerName: string;
  customerPhone: string;
  packageName: string;
  packagePrice: number;
  benefit: string;
  savings: string | null;
  paymentMethod: PaymentMethod;
  balanceLabel?: string | null;
}

interface MembershipSuccessDialogProps {
  open: boolean;
  info: MembershipSuccessInfo | null;
  error: string | null;
  sending: boolean;
  onOpenChange: (open: boolean) => void;
  onSendNota: () => void;
  onNewTransaction: () => void;
}

export function MembershipSuccessDialog({
  open,
  info,
  error,
  sending,
  onOpenChange,
  onSendNota,
  onNewTransaction,
}: MembershipSuccessDialogProps) {
  function handleClose(next: boolean) {
    if (!next) onNewTransaction();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl max-w-sm gap-0 p-0 overflow-hidden">
        <div className="p-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-[#001F5B] text-lg">
              Membership Berhasil
            </DialogTitle>
            {info && (
              <DialogDescription className="text-slate-500">
                <strong>{info.packageName}</strong> untuk{" "}
                <strong>{info.customerName}</strong>
                <br />
                <span className="text-[#001F5B] font-semibold">
                  {formatRupiah(info.packagePrice)}
                </span>
                <span className="text-slate-400">
                  {" "}
                  · {PAYMENT_LABEL[info.paymentMethod]}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {info && (
            <div className="mt-4 rounded-xl bg-[#F5F5F7] p-3 text-left text-xs text-slate-600 space-y-1">
              <p>{info.benefit}</p>
              {info.savings && (
                <p className="text-emerald-700 font-medium">{info.savings}</p>
              )}
              {info.balanceLabel && (
                <p className="text-slate-500">{info.balanceLabel}</p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 text-left">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 pt-2 space-y-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onSendNota}
            disabled={sending || !info}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-60 shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <WhatsAppIcon className="w-5 h-5" />
            )}
            Kirim Nota ke WhatsApp
          </button>
          <button
            type="button"
            onClick={onNewTransaction}
            className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 text-sm"
          >
            Buat Transaksi Lagi
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
