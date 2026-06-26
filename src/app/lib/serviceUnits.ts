export const SERVICE_UNITS = [
  { value: "kg", label: "Kg" },
  { value: "pcs", label: "Pcs" },
  { value: "paket", label: "Paket" },
  { value: "layanan", label: "Per-Layanan" },
] as const;

export type ServiceUnit = (typeof SERVICE_UNITS)[number]["value"];

export function formatServiceUnit(unit: string): string {
  const found = SERVICE_UNITS.find((u) => u.value === unit.toLowerCase());
  return found?.label ?? unit;
}

export function isServiceUnit(unit: string): unit is ServiceUnit {
  return SERVICE_UNITS.some((u) => u.value === unit.toLowerCase());
}
