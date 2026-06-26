import type { FinanceForecast } from "../types";

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

export function buildFinanceForecast(input: {
  revenueMonth: number;
  lastMonthExpenses: number;
  lastMonthCommissions: number;
  avgSalaryLastMonth: number;
  workDaysFullMonth: number;
  activeEmployeeCount: number;
  daysElapsed: number;
  daysInMonth: number;
  monthLabel: string;
}): FinanceForecast {
  const lastMonthTotalExpense =
    input.lastMonthExpenses + input.lastMonthCommissions;
  const forecastOmset = calcForecastOmset(
    input.revenueMonth,
    input.daysElapsed,
    input.daysInMonth
  );
  const forecastPengeluaran = calcForecastPengeluaran(
    lastMonthTotalExpense,
    input.avgSalaryLastMonth,
    input.workDaysFullMonth,
    input.daysInMonth,
    input.activeEmployeeCount
  );
  const forecastLabaBersih = calcForecastLabaBersih(
    forecastOmset,
    forecastPengeluaran
  );

  return {
    monthLabel: input.monthLabel,
    daysElapsed: input.daysElapsed,
    daysInMonth: input.daysInMonth,
    revenueMonth: input.revenueMonth,
    lastMonthTotalExpense,
    avgSalaryLastMonth: input.avgSalaryLastMonth,
    workDaysFullMonth: input.workDaysFullMonth,
    activeEmployeeCount: input.activeEmployeeCount,
    forecastOmset,
    forecastPengeluaran,
    forecastLabaBersih,
  };
}
