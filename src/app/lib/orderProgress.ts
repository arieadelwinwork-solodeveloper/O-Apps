import type { Order, OrderStage } from "../types";

/** Persentase tahap pengerjaan yang sudah diinput (selesai / total). */
export function calcStageProgressPercent(
  stages: OrderStage[] | undefined,
  workStatus?: Order["work_status"]
): number {
  const list = stages ?? [];
  if (list.length === 0) {
    if (workStatus === "selesai" || workStatus === "diambil") return 100;
    return 0;
  }
  const done = list.filter((s) => s.status === "selesai").length;
  return Math.round((done / list.length) * 100);
}
