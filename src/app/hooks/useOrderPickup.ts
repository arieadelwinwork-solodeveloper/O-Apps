import { useState } from "react";
import {
  getOrder,
  isOrderLunas,
  markOrderPickedUp,
  settlePayment,
} from "../lib/orders";
import { listUsers, type BusinessUser } from "../lib/users";
import type { Order, PaymentMethod } from "../types";
import { useAuth } from "./useAuth";

export function useOrderPickup(onUpdated?: (order: Order) => void) {
  const { user } = useAuth();
  const [pickupOrder, setPickupOrder] = useState<Order | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [employees, setEmployees] = useState<BusinessUser[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeAll() {
    setPaymentOpen(false);
    setWorkerOpen(false);
    setPickupOrder(null);
    setError(null);
  }

  async function openWorkerStep(order: Order) {
    const staff = await listUsers().catch(() => [] as BusinessUser[]);
    const active = staff.filter((u) => u.is_active);
    const karyawan = active.filter((u) => u.role === "karyawan");
    const list = karyawan.length > 0 ? karyawan : active;
    setEmployees(list);
    setSelectedWorkerId(
      list.find((e) => e.id === user?.id)?.id ?? list[0]?.id ?? ""
    );
    setPickupOrder(order);
    setWorkerOpen(true);
  }

  async function startPickup(order: Order) {
    setError(null);
    if (order.work_status !== "selesai") {
      setError("Pesanan harus selesai dikerjakan sebelum diambil");
      return;
    }
    if (order.work_status === "diambil") return;

    setPickupOrder(order);
    if (isOrderLunas(order)) {
      await openWorkerStep(order);
    } else {
      setPaymentOpen(true);
    }
  }

  async function handleSettle(input: {
    paidAmount: number;
    paymentMethod: PaymentMethod;
    proofUrl?: string;
  }) {
    if (!pickupOrder) return;
    await settlePayment(pickupOrder.id, input);
    const refreshed = await getOrder(pickupOrder.id);
    setPickupOrder(refreshed);
    onUpdated?.(refreshed);
    setPaymentOpen(false);
    if (isOrderLunas(refreshed)) {
      await openWorkerStep(refreshed);
    }
  }

  async function confirmPickup() {
    if (!pickupOrder || !selectedWorkerId) return;
    setBusy(true);
    setError(null);
    try {
      const { order } = await markOrderPickedUp(
        pickupOrder.id,
        selectedWorkerId
      );
      onUpdated?.(order);
      closeAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencatat pengambilan");
    } finally {
      setBusy(false);
    }
  }

  return {
    error,
    setError,
    busy,
    pickupOrder,
    paymentOpen,
    workerOpen,
    employees,
    selectedWorkerId,
    setSelectedWorkerId,
    startPickup,
    closeAll,
    setPaymentOpen,
    setWorkerOpen,
    handleSettle,
    confirmPickup,
  };
}
