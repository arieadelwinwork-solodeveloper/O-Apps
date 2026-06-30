import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Loader2,
  Package,
  MessageCircle,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { listOrders } from "../lib/orders";
import { calcStageProgressPercent } from "../lib/orderProgress";
import { useOrderPickup } from "../hooks/useOrderPickup";
import { PickupPaymentDialog } from "../components/order/PickupPaymentDialog";
import { PickupReturnWorkerDialog } from "../components/order/PickupReturnWorkerDialog";
import { StageProgressRing } from "../components/order/StageProgressRing";
import { TrackingPipeline } from "../components/order/TrackingPipeline";
import { TrackingOrderInfoCard } from "../components/order/TrackingOrderInfoCard";
import type { Order, WorkStatus } from "../types";

const STATUS_COLOR: Record<WorkStatus, string> = {
  antri: "bg-slate-100 text-slate-600",
  proses: "bg-amber-100 text-amber-700",
  selesai: "bg-emerald-100 text-emerald-700",
  diambil: "bg-blue-100 text-blue-700",
};

const PICKUP_BADGE = {
  belum: "bg-orange-100 text-orange-700",
  sudah: "bg-blue-100 text-blue-700",
} as const;

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function statusBadge(status: WorkStatus): { label: string; className: string } {
  if (status === "diambil") {
    return { label: "Sudah Diambil", className: PICKUP_BADGE.sudah };
  }
  if (status === "selesai") {
    return { label: "Belum Diambil", className: PICKUP_BADGE.belum };
  }
  return {
    label: "Proses",
    className: STATUS_COLOR.proses,
  };
}

export function TrackingView() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pickup = useOrderPickup((updated) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
    );
  });

  async function load() {
    try {
      setOrders(await listOrders());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  async function advance(order: Order) {
    if (order.work_status !== "selesai") return;
    pickup.setError(null);
    await pickup.startPickup(order);
  }

  function sendWhatsApp(order: Order) {
    const phone = order.customers?.phone?.replace(/\D/g, "");
    if (!phone) {
      setError("Pelanggan tidak punya nomor WhatsApp");
      return;
    }
    const normalized = phone.startsWith("0") ? "62" + phone.slice(1) : phone;
    const msg = `Halo ${order.customers?.name ?? ""}, pesanan ${
      order.order_no
    } total ${rupiah(order.total)}. Status: ${order.work_status}.`;
    window.open(
      `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {pickup.error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {pickup.error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada transaksi.</p>
        </div>
      ) : (
        orders.map((order) => {
          const badge = statusBadge(order.work_status);
          const name = order.customers?.name ?? "Pelanggan";
          const canPickup = order.work_status === "selesai";
          const pickupDisabled =
            order.work_status !== "selesai" || pickup.busy;
          const progress = calcStageProgressPercent(
            order.stages,
            order.work_status
          );
          return (
            <div
              key={order.id}
              className="bg-white rounded-[20px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]"
            >
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <StageProgressRing percent={progress} />
                    <h3 className="font-semibold text-slate-800 text-base truncate">
                      {name}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="pl-[52px]">
                  <div className="w-[255px] min-w-[255px] max-w-full shrink-0 space-y-1.5">
                    <TrackingOrderInfoCard order={order} />
                    <TrackingPipeline workStatus={order.work_status} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] border-t border-slate-50 pt-3 mt-1">
                  <button
                    onClick={() => navigate(`/transaksi/${order.id}`)}
                    className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg font-normal"
                  >
                    <ListChecks className="w-3 h-3" /> Detail
                  </button>
                  <button
                    onClick={() => sendWhatsApp(order)}
                    className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg font-normal"
                  >
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </button>
                  <button
                    onClick={() => advance(order)}
                    disabled={pickupDisabled}
                    className="flex items-center gap-1 text-[#001F5B] bg-[#001F5B]/5 px-2.5 py-1.5 rounded-lg font-normal disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {pickup.busy && canPickup ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        Diambil
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
              </div>
            </div>
          );
        })
      )}

      <PickupPaymentDialog
        open={pickup.paymentOpen}
        order={pickup.pickupOrder}
        onClose={() => pickup.setPaymentOpen(false)}
        onPaid={() => {}}
        onSettle={pickup.handleSettle}
      />
      <PickupReturnWorkerDialog
        open={pickup.workerOpen}
        onOpenChange={(open) => {
          if (!open) pickup.closeAll();
          else pickup.setWorkerOpen(true);
        }}
        employees={pickup.employees}
        selectedId={pickup.selectedWorkerId}
        onSelect={pickup.setSelectedWorkerId}
        onConfirm={pickup.confirmPickup}
        onCancel={pickup.closeAll}
        loading={pickup.busy}
      />
    </div>
  );
}
