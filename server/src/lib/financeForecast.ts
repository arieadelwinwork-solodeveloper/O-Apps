/** Prediksi omset akhir bulan: (omset MTD / hari berjalan) × hari dalam bulan. */
export function calcForecastOmset(
  revenueMonthToDate: number,
  daysElapsed: number,
  daysInMonth: number
): number {
  if (daysElapsed <= 0) return revenueMonthToDate;
  return Math.round((revenueMonthToDate / daysElapsed) * daysInMonth);
}

/**
 * Prediksi pengeluaran akhir bulan:
 * pengeluaran bulan lalu + (gaji rata-rata bulan lalu / hari kerja penuh × hari berjalan) × karyawan aktif.
 * Untuk prediksi akhir bulan, `daysForSalary` = jumlah hari dalam bulan berjalan.
 */
export function calcForecastPengeluaran(
  lastMonthTotalExpense: number,
  avgSalaryLastMonth: number,
  workDaysFullMonth: number,
  daysForSalary: number,
  activeEmployeeCount: number
): number {
  if (workDaysFullMonth <= 0 || activeEmployeeCount <= 0) {
    return Math.round(lastMonthTotalExpense);
  }
  const salaryEstimate =
    (avgSalaryLastMonth / workDaysFullMonth) *
    daysForSalary *
    activeEmployeeCount;
  return Math.round(lastMonthTotalExpense + salaryEstimate);
}

export function calcForecastLabaBersih(
  forecastOmset: number,
  forecastPengeluaran: number
): number {
  return forecastOmset - forecastPengeluaran;
}

export function previousMonthPeriod(ref: Date = new Date()): string {
  const d = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthCalendarMeta(ref: Date = new Date()) {
  const daysElapsed = ref.getDate();
  const daysInMonth = new Date(
    ref.getFullYear(),
    ref.getMonth() + 1,
    0
  ).getDate();
  const monthLabel = ref.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  return { daysElapsed, daysInMonth, monthLabel };
}
