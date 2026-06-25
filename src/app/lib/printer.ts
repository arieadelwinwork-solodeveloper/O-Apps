import type { Order, Business } from "../types";

// =====================================================================
// Web Bluetooth thermal printer (ESC/POS) — tipe minimal & helper.
// Catatan: Web Bluetooth hanya tersedia di browser Chromium (Android/desktop)
// melalui HTTPS atau localhost. iOS Safari belum mendukung.
// =====================================================================

// Tipe minimal Web Bluetooth (tidak selalu ada di lib DOM default).
interface BTCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  writeValue(value: BufferSource): Promise<void>;
}
interface BTService {
  getCharacteristics(): Promise<BTCharacteristic[]>;
}
interface BTServer {
  connect(): Promise<BTServer>;
  getPrimaryServices(): Promise<BTService[]>;
}
interface BTDevice {
  name?: string;
  id?: string;
  gatt?: BTServer;
}

interface BluetoothLike {
  requestDevice(opts: unknown): Promise<BTDevice>;
}

function getBluetooth(): BluetoothLike | null {
  const nav = navigator as unknown as { bluetooth?: BluetoothLike };
  return nav.bluetooth ?? null;
}

export function isBluetoothSupported(): boolean {
  return getBluetooth() !== null;
}

// UUID layanan umum printer thermal BLE (untuk filter opsional).
const COMMON_SERVICES = [
  0x18f0,
  0xff00,
  0xffe0,
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
];

export interface ConnectedPrinter {
  device: BTDevice;
  characteristic: BTCharacteristic;
}

/** Minta user memilih printer & temukan characteristic yang bisa ditulis. */
export async function connectPrinter(): Promise<ConnectedPrinter> {
  const bt = getBluetooth();
  if (!bt) throw new Error("Browser ini tidak mendukung Bluetooth");

  const device = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: COMMON_SERVICES,
  });
  if (!device.gatt) throw new Error("Perangkat tidak punya GATT");

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    const writable = chars.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse
    );
    if (writable) return { device, characteristic: writable };
  }
  throw new Error("Tidak menemukan jalur cetak pada perangkat");
}

/** Kirim byte ke printer dalam potongan kecil (BLE MTU terbatas). */
async function writeChunks(
  char: BTCharacteristic,
  data: Uint8Array
): Promise<void> {
  const CHUNK = 180;
  for (let i = 0; i < data.length; i += CHUNK) {
    const slice = data.slice(i, i + CHUNK);
    if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) {
      await char.writeValueWithoutResponse(slice);
    } else {
      await char.writeValue(slice);
    }
    // jeda kecil agar buffer printer tidak penuh
    await new Promise((r) => setTimeout(r, 20));
  }
}

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const PAY_LABEL: Record<string, string> = {
  lunas_depan: "LUNAS",
  dp: "DP",
  bayar_belakang: "BELUM BAYAR",
};

/** Susun teks struk (lebar 32 kolom umum printer 58mm). */
export function buildReceiptText(
  order: Order,
  business?: Business | null
): string {
  const W = 32;
  const line = (ch = "-") => ch.repeat(W);
  const center = (s: string) =>
    s.length >= W ? s : " ".repeat(Math.floor((W - s.length) / 2)) + s;
  const lr = (l: string, r: string) => {
    const space = Math.max(1, W - l.length - r.length);
    return l + " ".repeat(space) + r;
  };

  const rows: string[] = [];
  rows.push(center((business?.name ?? "NOTA").toUpperCase()));
  if (business?.address) rows.push(center(business.address));
  if (business?.phone) rows.push(center(business.phone));
  rows.push(line());
  rows.push(lr("No", order.order_no));
  rows.push(lr("Tgl", new Date(order.created_at).toLocaleString("id-ID")));
  if (order.customers?.name) rows.push(lr("Plg", order.customers.name));
  rows.push(line());
  for (const it of order.items ?? []) {
    rows.push(it.name);
    rows.push(lr(`  ${it.qty} x ${rupiah(it.unit_price)}`, rupiah(it.subtotal)));
  }
  rows.push(line());
  rows.push(lr("TOTAL", rupiah(order.total)));
  rows.push(lr("Bayar", rupiah(order.paid_amount)));
  if (order.remaining_amount > 0)
    rows.push(lr("Sisa", rupiah(order.remaining_amount)));
  rows.push(lr("Status", PAY_LABEL[order.payment_status] ?? order.payment_status));
  rows.push(lr("Metode", order.payment_method.toUpperCase()));
  rows.push(line());
  rows.push(center("Terima kasih"));
  rows.push("");
  rows.push("");
  rows.push("");
  return rows.join("\n") + "\n";
}

/** Encode teks struk menjadi byte ESC/POS (init + teks + feed + cut). */
export function encodeReceipt(text: string): Uint8Array {
  const encoder = new TextEncoder();
  const body = encoder.encode(text);
  const init = new Uint8Array([0x1b, 0x40]); // ESC @ reset
  const feedCut = new Uint8Array([0x1d, 0x56, 0x42, 0x00]); // GS V B 0 (partial cut)
  const out = new Uint8Array(init.length + body.length + feedCut.length);
  out.set(init, 0);
  out.set(body, init.length);
  out.set(feedCut, init.length + body.length);
  return out;
}

/** Cetak struk order ke printer terhubung. */
export async function printReceipt(
  printer: ConnectedPrinter,
  order: Order,
  business?: Business | null
): Promise<void> {
  const text = buildReceiptText(order, business);
  await writeChunks(printer.characteristic, encodeReceipt(text));
}

/** Cetak teks bebas (untuk uji coba). */
export async function printText(
  printer: ConnectedPrinter,
  text: string
): Promise<void> {
  await writeChunks(printer.characteristic, encodeReceipt(text));
}

// ---------- Koneksi aktif (dibagikan antar halaman) ----------
let activePrinter: ConnectedPrinter | null = null;

export function getActivePrinter(): ConnectedPrinter | null {
  return activePrinter;
}

export function setActivePrinter(p: ConnectedPrinter | null): void {
  activePrinter = p;
}

/** Pastikan ada printer terhubung; jika belum, minta user memilih. */
export async function ensurePrinter(): Promise<ConnectedPrinter> {
  if (activePrinter) return activePrinter;
  const p = await connectPrinter();
  activePrinter = p;
  return p;
}
