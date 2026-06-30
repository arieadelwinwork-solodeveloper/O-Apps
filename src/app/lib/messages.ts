import type { Order, MessageTemplate } from "../types";
import {
  formatMembershipReceiptBlock,
  type MembershipReceiptSnapshot,
} from "./orderMembership";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export interface RenderTemplateExtras {
  membership?: MembershipReceiptSnapshot | null;
}

/** Isi variabel template dengan data order. */
export function renderTemplate(
  body: string,
  order: Order,
  extras?: RenderTemplateExtras
): string {
  const nama = order.customers?.name ?? "";
  const layanan = (order.items ?? []).map((i) => i.name).join(", ");
  const estimasi = order.estimated_done_at
    ? new Date(order.estimated_done_at).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
  const membershipBlock = formatMembershipReceiptBlock(extras?.membership);
  const saldoSisa =
    extras?.membership?.saldoRemaining !== null &&
    extras?.membership?.saldoRemaining !== undefined
      ? rupiah(extras.membership.saldoRemaining)
      : "-";
  const kuotaLines = extras?.membership?.quotas ?? [];
  const kuotaSisa =
    kuotaLines.length > 0
      ? kuotaLines
          .map((q) => `${q.label}: ${q.remaining} ${q.unit}`)
          .join(", ")
      : "-";

  return body
    .replaceAll("{nama}", nama)
    .replaceAll("{layanan}", layanan)
    .replaceAll("{total}", rupiah(order.total))
    .replaceAll("{sisa}", rupiah(order.remaining_amount))
    .replaceAll("{estimasi}", estimasi)
    .replaceAll("{membership}", membershipBlock)
    .replaceAll("{saldo_sisa}", saldoSisa)
    .replaceAll("{kuota_sisa}", kuotaSisa);
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

export function defaultNotaMessage(
  order: Order,
  extras?: RenderTemplateExtras
): string {
  const membershipBlock = formatMembershipReceiptBlock(extras?.membership);
  const lines = [
    `Halo ${order.customers?.name ?? ""}, terima kasih atas pesanan Anda.`,
    "",
    `Nota: ${order.order_no}`,
    `Layanan: ${(order.items ?? []).map((i) => i.name).join(", ")}`,
    `Total: ${rupiah(order.total)}`,
  ];
  if ((order.membership_used ?? 0) > 0) {
    lines.push(`Bayar membership: ${rupiah(order.membership_used ?? 0)}`);
  }
  if (order.remaining_amount > 0) {
    lines.push(`Sisa bayar: ${rupiah(order.remaining_amount)}`);
  }
  if (extras?.membership) {
    lines.push("", membershipBlock);
  }
  return lines.join("\n");
}
