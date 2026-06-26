import type { OrderItem, OrderStage, ServiceStage } from "../types";

/** Nama template tahap 5 — di-resolve saat snapshot ke order. */
export const DYNAMIC_FINISH_STAGE_LABEL = "Lipat / Setrika & Packing";

export const CUCI_KILOAN_STAGE_TEMPLATES: Omit<
  ServiceStage,
  "id" | "service_id"
>[] = [
  {
    name: "Penerimaan",
    sort_order: 1,
    commission_type: "nominal",
    commission_value: 2000,
  },
  {
    name: "Sortir",
    sort_order: 2,
    commission_type: "nominal",
    commission_value: 2000,
  },
  {
    name: "Cuci",
    sort_order: 3,
    commission_type: "nominal",
    commission_value: 3000,
  },
  {
    name: "Kering",
    sort_order: 4,
    commission_type: "nominal",
    commission_value: 2000,
  },
  {
    name: DYNAMIC_FINISH_STAGE_LABEL,
    sort_order: 5,
    commission_type: "nominal",
    commission_value: 2500,
  },
  {
    name: "Packaging",
    sort_order: 6,
    commission_type: "nominal",
    commission_value: 1500,
  },
];

export const SETRIKA_SAJA_STAGE_TEMPLATES: Omit<
  ServiceStage,
  "id" | "service_id"
>[] = [
  {
    name: "Penerimaan",
    sort_order: 1,
    commission_type: "nominal",
    commission_value: 1500,
  },
  {
    name: "Sortir",
    sort_order: 2,
    commission_type: "nominal",
    commission_value: 1500,
  },
  {
    name: "Setrika",
    sort_order: 3,
    commission_type: "nominal",
    commission_value: 3500,
  },
  {
    name: "Packaging",
    sort_order: 4,
    commission_type: "nominal",
    commission_value: 1500,
  },
];

export function isSetrikaSajaServiceName(name: string): boolean {
  return name.toLowerCase().includes("setrika saja");
}

export function isCuciKiloanServiceName(name: string): boolean {
  return name.toLowerCase().includes("cuci kiloan");
}

/** Tahap 5: setrika jika ada layanan/note setrika, selain itu lipat. */
export function resolveFinishStageName(opts: {
  note?: string | null;
  itemNames?: string[];
}): "Lipat" | "Setrika" {
  const note = (opts.note ?? "").toLowerCase();
  const items = opts.itemNames ?? [];
  const hasSetrika = items.some((n) => n.toLowerCase().includes("setrika"));
  if (hasSetrika || note.includes("setrika")) return "Setrika";
  return "Lipat";
}

export function resolveOrderStageName(
  templateName: string,
  opts: { note?: string | null; itemNames?: string[] }
): string {
  if (
    templateName === DYNAMIC_FINISH_STAGE_LABEL ||
    templateName.includes("Lipat / Setrika")
  ) {
    return resolveFinishStageName(opts);
  }
  return templateName;
}

export function buildOrderStagesFromTemplates(
  serviceId: string,
  templates: Pick<
    ServiceStage,
    "name" | "sort_order" | "commission_type" | "commission_value"
  >[],
  ctx: { note?: string | null; items?: Pick<OrderItem, "name">[] },
  idFn: (prefix: string, index: number) => string = (p, i) =>
    `${p}-${i}-${Math.random().toString(36).slice(2, 8)}`
): OrderStage[] {
  const itemNames = (ctx.items ?? []).map((i) => i.name);
  return templates.map((t, index) => ({
    id: idFn("os", index),
    service_id: serviceId,
    name: resolveOrderStageName(t.name, {
      note: ctx.note,
      itemNames,
    }),
    sort_order: t.sort_order,
    status: "belum" as const,
    commission_type: t.commission_type,
    commission_value: t.commission_value,
    commission_amount: 0,
    completed_by: null,
    completed_at: null,
  }));
}

export function buildCuciKiloanOrderStages(
  serviceId: string,
  ctx: { note?: string | null; items?: Pick<OrderItem, "name">[] },
  idFn?: (prefix: string, index: number) => string
): OrderStage[] {
  return buildOrderStagesFromTemplates(
    serviceId,
    CUCI_KILOAN_STAGE_TEMPLATES,
    ctx,
    idFn
  );
}

export function buildSetrikaSajaOrderStages(
  serviceId: string,
  ctx: { note?: string | null; items?: Pick<OrderItem, "name">[] },
  idFn?: (prefix: string, index: number) => string
): OrderStage[] {
  return buildOrderStagesFromTemplates(
    serviceId,
    SETRIKA_SAJA_STAGE_TEMPLATES,
    ctx,
    idFn
  );
}
