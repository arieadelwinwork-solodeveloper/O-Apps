import { useEffect, useState } from "react";
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
} from "lucide-react";
import { getOrder, completeStage } from "../lib/orders";
import { listTemplates } from "../lib/customization";
import { getBusiness } from "../lib/printDevices";
import { ensurePrinter, printReceipt } from "../lib/printer";
import {
  renderTemplate,
  pickTemplate,
  waNumber,
  openWhatsApp,
} from "../lib/messages";
import type { Order, MessageTemplate, OrderStage, Business } from "../types";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const PAY_STATUS_LABEL: Record<string, string> = {
  lunas_depan: "Lunas",
  dp: "DP",
  bayar_belakang: "Belum bayar",
};

export function OrderDetailView() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyStage, setBusyStage] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const [ord, tpl, biz] = await Promise.all([
        getOrder(id),
        listTemplates().catch(() => [] as MessageTemplate[]),
        getBusiness().catch(() => null),
      ]);
      setOrder(ord);
      setTemplates(tpl);
      setBusiness(biz);
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

  async function finishStage(stage: OrderStage) {
    if (!order) return;
    setBusyStage(stage.id);
    setError(null);
    try {
      await completeStage(order.id, stage.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyelesaikan tahap");
    } finally {
      setBusyStage(null);
    }
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
  const allDone = stages.length > 0 && stages.every((s) => s.status === "selesai");

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
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
          <div className="space-y-2">
            {stages.map((stage) => {
              const done = stage.status === "selesai";
              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    done ? "border-emerald-200 bg-emerald-50/50" : "border-black/5"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">
                      {stage.name}
                    </div>
                    {done && stage.commission_amount > 0 && (
                      <div className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        Komisi {rupiah(stage.commission_amount)}
                      </div>
                    )}
                  </div>
                  {!done && (
                    <button
                      onClick={() => finishStage(stage)}
                      disabled={busyStage === stage.id}
                      className="text-xs font-medium text-[#001F5B] bg-[#001F5B]/5 px-3 py-1.5 rounded-lg disabled:opacity-60 flex items-center gap-1"
                    >
                      {busyStage === stage.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Selesai"
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}
