import { WhatsAppIcon } from "../icons/WhatsAppIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Loader2 } from "lucide-react";

interface OrderCompleteWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  orderNo: string;
  messagePreview: string;
  onSend: () => void;
  onSkip: () => void;
  sending?: boolean;
}

export function OrderCompleteWhatsAppDialog({
  open,
  onOpenChange,
  customerName,
  orderNo,
  messagePreview,
  onSend,
  onSkip,
  sending,
}: OrderCompleteWhatsAppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#001F5B]">Pesanan Selesai!</DialogTitle>
          <DialogDescription>
            Semua tahap pengerjaan untuk <strong>{customerName}</strong> (
            {orderNo}) sudah selesai. Kirim pemberitahuan ke WhatsApp pelanggan?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-[#F5F5F7] p-3 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
          {messagePreview}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onSkip}
            disabled={sending}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-slate-100 text-slate-600 disabled:opacity-60"
          >
            Nanti
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-[#25D366] text-white disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <WhatsAppIcon className="w-5 h-5" />
            )}
            Kirim WhatsApp
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
