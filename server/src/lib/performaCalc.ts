/** Performa layanan 1–10: (komisi karyawan / komisi total) × 10 */
export function calcServicePerformance(
  employeeCommission: number,
  totalCommission: number
): number {
  if (totalCommission <= 0 || employeeCommission <= 0) return 0;
  const raw = (employeeCommission / totalCommission) * 10;
  return Math.min(10, Math.round(raw * 10) / 10);
}

/** Ketepatan waktu 1–10: hari tepat waktu × (10 / hari efektif kerja) */
export function calcPunctuality(
  onTimeDays: number,
  effectiveDays: number
): number {
  if (effectiveDays <= 0) return 0;
  const raw = onTimeDays * (10 / effectiveDays);
  return Math.min(10, Math.round(raw * 10) / 10);
}

/** Jam masuk standar bila belum dikonfigurasi di bisnis (08:00). */
export const DEFAULT_WORK_START = { hour: 8, minute: 0 };

export function isOnTimeAttendance(
  createdAt: string,
  workStartHour: number,
  workStartMinute: number
): boolean {
  const d = new Date(createdAt);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins <= workStartHour * 60 + workStartMinute;
}
