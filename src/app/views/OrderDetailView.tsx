import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { motion } from "motion/react";
import {
  Loader2,
  CheckCircle2,
  Circle,
  MessageCircle,
  Coins,
  Clock,
  Printer,
  PackageCheck,
} from "lucide-react";
import { getOrder, completeStage } from "../lib/orders";
import { useOrderPickup } from "../hooks/useOrderPickup";
import { PickupPaymentDialog } from "../components/order/PickupPaymentDialog";
import { PickupReturnWorkerDialog } from "../components/order/PickupReturnWorkerDialog";
import { listTemplates } from "../lib/customization";
import { listUsers, type BusinessUser } from "../lib/users";
import { getBusiness } from "../lib/printDevices";
import { ensurePrinter, printReceipt } from "../lib/printer";
import {
  renderTemplate,
  pickTemplate,
  waNumber,
  openWhatsApp,
} from "../lib/messages";
import { StageWorkerDialog } from "../components/order/StageWorkerDialog";
import { OrderCompleteWhatsAppDialog } from "../components/order/OrderCompleteWhatsAppDialog";
import { useAuth } from "../hooks/useAuth";
import type { Order, MessageTemplate, OrderStage, Business } from "../types";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatStageCompletedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date}, ${time}`;
}

const PAY_STATUS_LABEL: Record<string, string> = {
  lunas_depan: "Lunas",
  dp: "DP",
  bayar_belakang: "Belum bayar",
};

export function OrderDetailView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingCommission, setSubmittingCommission] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [stagesToComplete, setStagesToComplete] = useState<OrderStage[]>([]);
  const [targetStage, setTargetStage] = useState<OrderStage | null>(null);
  const [waCompleteOpen, setWaCompleteOpen] = useState(false);
  const [waCompleteMessage, setWaCompleteMessage] = useState("");

  const pickup = useOrderPickup((updated) => setOrder(updated));

  const defaultWorkerId = useMemo(
    () => employees.find((e) => e.id === user?.id)?.id ?? employees[0]?.id ?? "",
    [employees, user?.id]
  );

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const [ord, tpl, biz, staff] = await Promise.all([
        getOrder(id),
        listTemplates().catch(() => [] as MessageTemplate[]),
        getBusiness().catch(() => null),
        listUsers().catch(() => [] as BusinessUser[]),
      ]);
      setOrder(ord);
      setTemplates(tpl);
      setBusiness(biz);
      const active = staff.filter((u) => u.is_active);
      const karyawan = active.filter((u) => u.role === "karyawan");
      setEmployees(karyawan.length > 0 ? karyawan : active);
      setCheckedIds(new Set());
      setStagesToComplete([]);
      setTargetStage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function buildSelesaiMessage(ord: Order): string {
    const tpl = pickTemplate(templates, "selesai");
    return tpl
      ? renderTemplate(tpl.body, ord)
      : `Halo ${ord.customers?.name ?? ""}, pesanan laundry Anda (${ord.order_no}) sudah selesai dan siap diambil. Terima kasih!`;
  }

  function toggleStageCheck(stage: OrderStage) {
    if (stage.status === "selesai" || submittingCommission) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(stage.id)) next.delete(stage.id);
      else next.add(stage.id);
      return next;
    });
  }

  function closeWorkerDialog() {
    setWorkerDialogOpen(false);
    setStagesToComplete([]);
    setTargetStage(null);
  }

  function startCommissionInput() {
    if (!order) return;
    const pending = (order.stages ?? []).filter((s) => s.status !== "selesai");
    const checkedPending = pending.filter((s) => checkedIds.has(s.id));
    if (checkedPending.length === 0) {
      setError("Centang minimal satu tahap pengerjaan");
      return;
    }
    const maxOrder = Math.max(...checkedPending.map((s) => s.sort_order));
    const toComplete = pending
      .filter((s) => s.sort_order <= maxOrder)
      .sort((a, b) => a.sort_order - b.sort_order);
    const target =
      checkedPending.find((s) => s.sort_order === maxOrder) ??
      toComplete[toComplete.length - 1];
    setError(null);
    setStagesToComplete(toComplete);
    setTargetStage(target);
    setSelectedWorkerId(defaultWorkerId);
    setWorkerDialogOpen(true);
  }

  async function confirmFinishStage() {
    if (!order || !selectedWorkerId || stagesToComplete.length === 0) return;
    setSubmittingCommission(true);
    setError(null);
    try {
      let lastWorkStatus: string | null = null;
      for (const stage of stagesToComplete) {
        const earnCommission = checkedIds.has(stage.id);
        const result = await completeStage(
          order.id,
          stage.id,
          selectedWorkerId,
          { skipCommission: !earnCommission }
        );
        lastWorkStatus = result.workStatus;
      }
      setCheckedIds(new Set());
      closeWorkerDialog();
      const refreshed = await getOrder(order.id);
      setOrder(refreshed);
      if (lastWorkStatus === "selesai") {
        const message = buildSelesaiMessage(refreshed);
        if (business?.auto_send_complete_note) {
          const phone = waNumber(refreshed.customers?.phone);
          if (phone) {
            openWhatsApp(phone, message);
          } else {
            setError("Pelanggan tidak punya nomor WhatsApp");
          }
        } else {
          setWaCompleteMessage(message);
          setWaCompleteOpen(true);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyelesaikan tahap");
    } finally {
      setSubmittingCommission(false);
    }
  }

  function sendCompleteWhatsApp() {
    if (!order) return;
    const phone = waNumber(order.customers?.phone);
    if (!phone) {
      setError("Pelanggan tidak punya nomor WhatsApp");
      setWaCompleteOpen(false);
      return;
    }
    openWhatsApp(phone, waCompleteMessage);
    setWaCompleteOpen(false);
  }

  async function printNota() {
    if (!order) return;
    setError(null);
    setPrinting(true);
    try {
      const printer = await ensurePrinter();
      await printReceipt(printer, order, business);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencetak nota");
    } finally {
      setPrinting(false);
    }
  }

  function sendMessage(type: MessageTemplate["type"]) {
    if (!order) return;
    const phone = waNumber(order.customers?.phone);
    if (!phone) {
      setError("Pelanggan tidak punya nomor WhatsApp");
      return;
    }
    const tpl = pickTemplate(templates, type);
    const body = tpl
      ? renderTemplate(tpl.body, order)
      : `Halo ${order.customers?.name ?? ""}, pesanan ${order.order_no}.`;
    openWhatsApp(phone, body);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center text-slate-400">
        {error ?? "Transaksi tidak ditemukan"}
      </div>
    );
  }

  const stages = order.stages ?? [];
  const pendingStages = stages.filter((s) => s.status !== "selesai");
  const checkedPendingCount = pendingStages.filter((s) =>
    checkedIds.has(s.id)
  ).length;
  const canInputCommission = checkedPendingCount >= 1;
  const allDone = stages.length > 0 && stages.every((s) => s.status === "selesai");
  const canPickup = order.work_status === "selesai";
  const isPickedUp = order.work_status === "diambil";
  const autoCompleteCount =
    stagesToComplete.length > 0
      ? stagesToComplete.filter((s) => !checkedIds.has(s.id)).length
      : 0;

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

      {/* Header order */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-[#001F5B]">
              {order.customers?.name ?? "Pelanggan"}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <Clock className="w-3 h-3" />
              {order.order_no}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-[#001F5B]">
              {rupiah(order.total)}
            </div>
            <div
              className={`text-xs ${
                order.remaining_amount > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {PAY_STATUS_LABEL[order.payment_status]}
              {order.remaining_amount > 0
                ? ` · sisa ${rupiah(order.remaining_amount)}`
                : ""}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-black/[0.06] pt-3 space-y-1.5">
          {(order.items ?? []).map((it) => (
            <div
              key={it.id ?? it.name}
              className="flex justify-between text-sm text-slate-600"
            >
              <span>
                {it.name} × {it.qty}
              </span>
              <span>{rupiah(it.subtotal)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tahap pengerjaan */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Tahap Pengerjaan
        </h3>
        {stages.length === 0 ? (
          <p className="text-sm text-slate-400">
            Layanan ini tidak punya tahap pengerjaan.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {stages.map((stage) => {
                const saved = stage.status === "selesai";
                const locallyChecked = checkedIds.has(stage.id);
                const workerName = stage.users?.full_name ?? "—";
                return (
                  <div
                    key={stage.id}
                    className={`rounded-xl border p-3 select-none ${
                      saved
                        ? "border-emerald-200 bg-emerald-50/40"
                        : locallyChecked
                          ? "border-[#001F5B]/20 bg-[#001F5B]/5"
                          : "border-black/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {saved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStageCheck(stage);
                          }}
                          disabled={submittingCommission}
                          className="shrink-0 p-2 -m-2 rounded-full disabled:opacity-60 touch-manipulation"
                          aria-label={
                            locallyChecked
                              ? `Batalkan centang ${stage.name}`
                              : `Centang ${stage.name}`
                          }
                        >
                          {locallyChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-[#001F5B]" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300" />
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0 pointer-events-none">
                        <div className="text-sm font-medium text-slate-700">
                          {stage.name}
                        </div>
                        {!saved && stage.commission_value > 0 && (
                          <div className="text-[11px] text-slate-400">
                            Centang setelah tahap selesai dikerjakan
                          </div>
                        )}
                      </div>
                    </div>

                    {saved && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-emerald-100 bg-white text-[11px]">
                        <div className="grid grid-cols-3 gap-1 bg-slate-50 px-2.5 py-2 font-semibold text-slate-500">
                          <span>Oleh</span>
                          <span>Waktu Selesai</span>
                          <span>Status</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 px-2.5 py-2 text-slate-700">
                          <span className="font-medium truncate">{workerName}</span>
                          <span className="text-slate-600">
                            {formatStageCompletedAt(stage.completed_at)}
                          </span>
                          <span className="text-emerald-600 font-medium">Selesai</span>
                        </div>
                        {stage.commission_amount > 0 && (
                          <div className="border-t border-emerald-50 px-2.5 py-1.5 text-emerald-600 flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            Komisi {rupiah(stage.commission_amount)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pendingStages.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={startCommissionInput}
                disabled={!canInputCommission || submittingCommission}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-[#001F5B] text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
              >
                {submittingCommission ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Coins className="w-4 h-4" />
                )}
                Input Komisi
              </motion.button>
            )}
            {pendingStages.length > 0 && !canInputCommission && (
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Centang tahap terakhir yang sudah dikerjakan, lalu Input Komisi.
                Tahap sebelumnya otomatis selesai tanpa komisi.
              </p>
            )}
          </>
        )}
      </div>

      {(canPickup || isPickedUp) && (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Pengambilan
          </h3>
          {isPickedUp ? (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-slate-700 space-y-1">
              <div className="font-medium text-blue-800 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4" />
                Sudah diambil
              </div>
              {order.picked_up_at && (
                <p className="text-xs text-slate-500">
                  {formatStageCompletedAt(order.picked_up_at)}
                </p>
              )}
              {order.returned_by?.full_name && (
                <p className="text-xs text-slate-600">
                  Diserahkan oleh {order.returned_by.full_name}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 mb-3">
                Transaksi wajib lunas. Jika belum, bayar dulu lalu konfirmasi
                karyawan penyerah.
              </p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  pickup.setError(null);
                  pickup.startPickup(order);
                }}
                disabled={pickup.busy}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-60"
              >
                {pickup.busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PackageCheck className="w-4 h-4" />
                )}
                Diambil
              </motion.button>
            </>
          )}
        </div>
      )}

      <StageWorkerDialog
        open={workerDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeWorkerDialog();
          else setWorkerDialogOpen(true);
        }}
        stageName={targetStage?.name ?? ""}
        autoCompleteCount={autoCompleteCount}
        employees={employees}
        selectedId={selectedWorkerId}
        onSelect={setSelectedWorkerId}
        onConfirm={confirmFinishStage}
        onCancel={closeWorkerDialog}
        loading={submittingCommission}
      />

      <OrderCompleteWhatsAppDialog
        open={waCompleteOpen}
        onOpenChange={setWaCompleteOpen}
        customerName={order.customers?.name ?? "Pelanggan"}
        orderNo={order.order_no}
        messagePreview={waCompleteMessage}
        onSend={sendCompleteWhatsApp}
        onSkip={() => setWaCompleteOpen(false)}
      />

      {/* Nota & Pesan */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Nota & Pesan
        </h3>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={printNota}
          disabled={printing}
          className="w-full flex items-center justify-center gap-1.5 bg-[#001F5B] text-white font-medium rounded-xl py-2.5 text-sm mb-2 disabled:opacity-60"
        >
          {printing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          Cetak Nota (Bluetooth)
        </motion.button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => sendMessage("nota")}
            className="flex items-center justify-center gap-1.5 bg-[#001F5B]/5 text-[#001F5B] font-medium rounded-xl py-2.5 text-sm"
          >
            <MessageCircle className="w-4 h-4" /> Nota
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => sendMessage("selesai")}
            disabled={!allDone}
            className="flex items-center justify-center gap-1.5 bg-emerald-500 text-white font-medium rounded-xl py-2.5 text-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> Pesan Selesai
          </motion.button>
        </div>
        {!allDone && stages.length > 0 && (
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Pesan selesai aktif setelah semua tahap selesai.
          </p>
        )}
      </div>

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
