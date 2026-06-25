import type { Order, MessageTemplate } from "../types";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

/** Isi variabel template dengan data order. */
export function renderTemplate(body: string, order: Order): string {
  const nama = order.customers?.name ?? "";
  const layanan = (order.items ?? []).map((i) => i.name).join(", ");
  const estimasi = order.estimated_done_at
    ? new Date(order.estimated_done_at).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
  return body
    .replaceAll("{nama}", nama)
    .replaceAll("{layanan}", layanan)
    .replaceAll("{total}", rupiah(order.total))
    .replaceAll("{sisa}", rupiah(order.remaining_amount))
    .replaceAll("{estimasi}", estimasi);
}

/** Pilih template default sesuai tipe, fallback ke yang pertama. */
export function pickTemplate(
  templates: MessageTemplate[],
  type: MessageTemplate["type"]
): MessageTemplate | null {
  const ofType = templates.filter((t) => t.type === type);
  if (ofType.length === 0) return null;
  return ofType.find((t) => t.is_default) ?? ofType[0];
}

/** Normalisasi nomor Indonesia ke format wa.me (62...). */
export function waNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("0") ? "62" + digits.slice(1) : digits;
}

/** Buka WhatsApp dengan pesan terisi. */
export function openWhatsApp(phone: string, message: string): void {
  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}
