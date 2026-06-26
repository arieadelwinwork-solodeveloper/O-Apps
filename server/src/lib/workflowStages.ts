/** Logika tahap pengerjaan — mirror frontend workflowStages.ts */
export const DYNAMIC_FINISH_STAGE_LABEL = "Lipat / Setrika & Packing";

export const SETRIKA_SAJA_STAGE_TEMPLATES = [
  { name: "Penerimaan", sort_order: 1, commission_type: "nominal" as const, commission_value: 1500 },
  { name: "Sortir", sort_order: 2, commission_type: "nominal" as const, commission_value: 1500 },
  { name: "Setrika", sort_order: 3, commission_type: "nominal" as const, commission_value: 3500 },
  { name: "Packaging", sort_order: 4, commission_type: "nominal" as const, commission_value: 1500 },
];

export function isSetrikaSajaServiceName(name: string): boolean {
  return name.toLowerCase().includes("setrika saja");
}

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
