import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  Loader2,
  Package,
  MessageCircle,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { listOrders, updateOrderStatus } from "../lib/orders";
import { useOrderPickup } from "../hooks/useOrderPickup";
import { PickupPaymentDialog } from "../components/order/PickupPaymentDialog";
import { PickupReturnWorkerDialog } from "../components/order/PickupReturnWorkerDialog";
import type { Order, WorkStatus } from "../types";

const STEPS: { id: WorkStatus; label: string }[] = [
  { id: "antri", label: "Antri" },
  { id: "proses", label: "Proses" },
  { id: "selesai", label: "Selesai" },
  { id: "diambil", label: "Diambil" },
];

const STATUS_COLOR: Record<WorkStatus, string> = {
  antri: "bg-slate-100 text-slate-600",
  proses: "bg-amber-100 text-amber-700",
  selesai: "bg-emerald-100 text-emerald-700",
  diambil: "bg-blue-100 text-blue-700",
};

const PAY_LABEL: Record<string, string> = {
  lunas_depan: "Lunas",
  dp: "DP",
  bayar_belakang: "Belum bayar",
};

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function stepIndex(s: WorkStatus): number {
  return STEPS.findIndex((x) => x.id === s);
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrackingView() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
  }, []);

  async function advance(order: Order) {
    const idx = stepIndex(order.work_status);
    if (idx >= STEPS.length - 1) return;
    const next = STEPS[idx + 1].id;
    if (next === "diambil") {
      pickup.setError(null);
      await pickup.startPickup(order);
      return;
    }
    setBusyId(order.id);
    setError(null);
    try {
      await updateOrderStatus(order.id, next);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, work_status: next } : o))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui status");
    } finally {
      setBusyId(null);
    }
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
          const idx = stepIndex(order.work_status);
          const name = order.customers?.name ?? "Pelanggan";
          return (
            <div
              key={order.id}
              className="bg-white rounded-[20px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#001F5B]/10 text-[#001F5B] flex items-center justify-center font-medium text-sm">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {timeLabel(order.created_at)} • {order.order_no}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                    STATUS_COLOR[order.work_status]
                  }`}
                >
                  {STEPS[idx]?.label}
                </span>
              </div>

              {/* Pipeline */}
              <div className="relative mt-2 mb-3">
                <div className="absolute top-3 left-3 right-3 h-0.5 bg-slate-100 -z-10" />
                <div
                  className="absolute top-3 left-3 h-0.5 bg-[#001F5B] -z-10 transition-all duration-500"
                  style={{
                    width: `${(idx / (STEPS.length - 1)) * 100}%`,
                  }}
                />
                <div className="flex justify-between relative z-0">
                  {STEPS.map((step, i) => {
                    const done = i <= idx;
                    return (
                      <div
                        key={step.id}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white text-[10px] font-semibold ${
                            done
                              ? "border-[#001F5B] bg-[#001F5B] text-white"
                              : "border-slate-200 text-slate-300"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            i === idx ? "text-[#001F5B]" : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs border-t border-slate-50 pt-3">
                <span className="text-slate-500">
                  {rupiah(order.total)} •{" "}
                  <span
                    className={
                      order.remaining_amount > 0
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }
                  >
                    {PAY_LABEL[order.payment_status]}
                    {order.remaining_amount > 0
                      ? ` (sisa ${rupiah(order.remaining_amount)})`
                      : ""}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/transaksi/${order.id}`)}
                    className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg font-medium"
                  >
                    <ListChecks className="w-3.5 h-3.5" /> Detail
                  </button>
                  <button
                    onClick={() => sendWhatsApp(order)}
                    className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg font-medium"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WA
                  </button>
                  {idx < STEPS.length - 1 && (
                    <button
                      onClick={() => advance(order)}
                      disabled={busyId === order.id}
                      className="flex items-center gap-1 text-[#001F5B] bg-[#001F5B]/5 px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-60"
                    >
                      {busyId === order.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          {STEPS[idx + 1].label}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
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
