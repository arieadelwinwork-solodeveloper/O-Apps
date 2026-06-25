import { apiFetch } from "./api";
import type { PrintDevice, Business } from "../types";

export async function getBusiness(): Promise<Business> {
  const { business } = await apiFetch<{ business: Business }>("/api/business");
  return business;
}

export async function listPrintDevices(): Promise<PrintDevice[]> {
  const { devices } = await apiFetch<{ devices: PrintDevice[] }>(
    "/api/print-devices"
  );
  return devices;
}

export async function savePrintDevice(
  deviceName: string,
  deviceId?: string
): Promise<PrintDevice> {
  const { device } = await apiFetch<{ device: PrintDevice }>(
    "/api/print-devices",
    { method: "POST", body: JSON.stringify({ deviceName, deviceId }) }
  );
  return device;
}

export async function deletePrintDevice(id: string): Promise<void> {
  await apiFetch(`/api/print-devices/${id}`, { method: "DELETE" });
}
