import type { ReactNode } from "react";
import type { Order } from "../../types";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const PAY_LABEL: Record<string, string> = {
  lunas_depan: "Lunas",
  dp: "DP",
  bayar_belakang: "Belum bayar",
};

function formatTransactionDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function payStatusClass(order: Order): string {
  if (order.remaining_amount <= 0) return "text-emerald-700 font-semibold";
  return "text-amber-700 font-semibold";
}

interface TrackingOrderInfoCardProps {
  order: Order;
}

function InfoCell({
  label,
  children,
  alignRight,
}: {
  label: string;
  children: ReactNode;
  alignRight?: boolean;
}) {
  return (
    <div
      className={`min-w-0 text-left ${alignRight ? "pl-4" : ""}`}
    >
      <div className="text-[10px] text-slate-500">{label} :</div>
      <div className="text-[13px] sm:text-sm text-slate-800 font-semibold mt-0.5 truncate tabular-nums leading-snug">
        {children}
      </div>
    </div>
  );
}

function TwoColRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-1">{left}{right}</div>
  );
}

export function TrackingOrderInfoCard({ order }: TrackingOrderInfoCardProps) {
  const statusLabel = PAY_LABEL[order.payment_status] ?? order.payment_status;
  const hasRemaining = order.remaining_amount > 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-[#F5F6F8] px-2.5 py-2 w-[255px] min-w-[255px] max-w-full space-y-1.5 shrink-0 box-border">
      <InfoCell label="Kode Transaksi">{order.order_no}</InfoCell>

      <TwoColRow
        left={
          <InfoCell label="Tanggal Transaksi">
            {formatTransactionDate(order.created_at)}
          </InfoCell>
        }
        right={
          <InfoCell label="Harga" alignRight>
            <span className="text-[#001F5B] font-semibold">
              {rupiah(order.total)}
            </span>
          </InfoCell>
        }
      />

      <TwoColRow
        left={
          <InfoCell label="Status bayar">
            <span className={payStatusClass(order)}>{statusLabel}</span>
          </InfoCell>
        }
        right={
          <InfoCell label="Sisa Bayar" alignRight>
            {hasRemaining ? (
              <span className="text-amber-700 font-semibold">
                {rupiah(order.remaining_amount)}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </InfoCell>
        }
      />
    </div>
  );
}
