/**
 * Skor layanan 0–100.
 * Benchmark 100% = total komisi ÷ jumlah karyawan (rata-rata per orang).
 * Di atas benchmark tetap maks. 100%.
 */
export function calcServicePerformanceScore100(
  employeeCommission: number,
  totalCommission: number,
  employeeCount: number
): number {
  if (
    totalCommission <= 0 ||
    employeeCommission <= 0 ||
    employeeCount <= 0
  ) {
    return 0;
  }
  const benchmark = totalCommission / employeeCount;
  if (benchmark <= 0) return 0;
  return Math.min(100, Math.round((employeeCommission / benchmark) * 100));
}

/** Alias bulanan / tabel owner — skor 0–100. */
export function calcServicePerformance(
  employeeCommission: number,
  totalCommission: number,
  employeeCount: number
): number {
  return calcServicePerformanceScore100(
    employeeCommission,
    totalCommission,
    employeeCount
  );
}

/** Skor layanan harian (chart) — logika sama, per hari. */
export function calcDailyServiceScore100(
  employeeCommission: number,
  totalCommission: number,
  employeeCount: number
): number {
  return calcServicePerformanceScore100(
    employeeCommission,
    totalCommission,
    employeeCount
  );
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

/** Ketepatan satu hari: 100 tepat waktu, 0 terlambat/tidak hadir. */
export function calcDailyPunctualityScore100(
  attended: boolean,
  onTime: boolean
): number | null {
  if (!attended) return null;
  return onTime ? 100 : 0;
}

/** Persentase ketepatan periode: hari tepat waktu / total hari periode × 100. */
export function calcPeriodPunctualityPercent(
  onTimeDays: number,
  periodDays: number
): number {
  if (periodDays <= 0) return 0;
  return Math.min(100, Math.round((onTimeDays / periodDays) * 100));
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
