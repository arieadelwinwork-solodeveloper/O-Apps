import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Printer,
  Bluetooth,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  listPrintDevices,
  savePrintDevice,
  deletePrintDevice,
} from "../lib/printDevices";
import {
  isBluetoothSupported,
  connectPrinter,
  setActivePrinter,
  getActivePrinter,
  printText,
} from "../lib/printer";
import type { PrintDevice } from "../types";

export function PrinterView() {
  const [devices, setDevices] = useState<PrintDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connectedName, setConnectedName] = useState<string | null>(
    getActivePrinter()?.device.name ?? null
  );

  const supported = isBluetoothSupported();

  async function load() {
    try {
      setDevices(await listPrintDevices());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat perangkat");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function pair() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const printer = await connectPrinter();
      setActivePrinter(printer);
      const name = printer.device.name ?? "Printer";
      setConnectedName(name);
      // Simpan bila belum ada.
      if (!devices.some((d) => d.device_name === name)) {
        await savePrintDevice(name, printer.device.id);
        await load();
      }
      setInfo(`Terhubung ke ${name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memasangkan printer");
    } finally {
      setBusy(false);
    }
  }

  async function testPrint() {
    setError(null);
    setInfo(null);
    const printer = getActivePrinter();
    if (!printer) {
      setError("Hubungkan printer dulu");
      return;
    }
    setBusy(true);
    try {
      await printText(
        printer,
        "        TES PRINTER\n--------------------------------\nPrinter siap digunakan.\n\n\n"
      );
      setInfo("Tes cetak terkirim");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencetak");
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: PrintDevice) {
    if (!confirm(`Hapus printer "${d.device_name}"?`)) return;
    try {
      await deletePrintDevice(d.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus perangkat");
    }
  }

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {info && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {info}
        </div>
      )}

      {!supported && (
        <div className="bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome di Android
            atau desktop (lewat HTTPS) untuk cetak via Bluetooth.
          </span>
        </div>
      )}

      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-[#001F5B]/10 text-[#001F5B] flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#001F5B]">
              Printer Bluetooth
            </h2>
            <p className="text-xs text-slate-400">
              {connectedName ? `Terhubung: ${connectedName}` : "Belum terhubung"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={pair}
            disabled={busy || !supported}
            className="flex items-center justify-center gap-1.5 bg-[#001F5B] text-white font-medium rounded-xl py-2.5 text-sm disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bluetooth className="w-4 h-4" />
            )}
            Pasangkan
          </motion.button>
          <button
            onClick={testPrint}
            disabled={busy || !connectedName}
            className="flex items-center justify-center gap-1.5 bg-[#001F5B]/5 text-[#001F5B] font-medium rounded-xl py-2.5 text-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Tes Cetak
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-1">
          Perangkat Tersimpan
        </h3>
        {loading ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Belum ada perangkat tersimpan.
          </p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.02] flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="flex-1 text-sm font-medium text-slate-800">
                  {d.device_name}
                </div>
                <button
                  onClick={() => remove(d)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  aria-label="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
