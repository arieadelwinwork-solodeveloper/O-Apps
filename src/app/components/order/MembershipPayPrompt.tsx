import { HelpCircle } from "lucide-react";

interface MembershipPayPromptProps {
  open: boolean;
  customerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function MembershipPayPrompt({
  open,
  customerName,
  onAccept,
  onDecline,
}: MembershipPayPromptProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative w-full max-w-md bg-white rounded-[24px] p-5 shadow-xl">
        <div className="flex items-center gap-2 text-[#001F5B] mb-2">
          <HelpCircle className="w-5 h-5" />
          <h3 className="font-semibold">Membership Terdeteksi</h3>
        </div>
        <p className="text-sm text-slate-600 mb-5">
          {customerName.trim() || "Pelanggan ini"} memiliki membership saldo/kuota.
          Gunakan membership untuk pembayaran transaksi ini?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 rounded-xl py-3 text-sm font-medium bg-slate-100 text-slate-700"
          >
            Tidak
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-xl py-3 text-sm font-semibold bg-[#001F5B] text-white"
          >
            Ya, Pakai Membership
          </button>
        </div>
      </div>
    </div>
  );
}
