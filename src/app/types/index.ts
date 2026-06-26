export type UserRole = "owner" | "karyawan";

export interface AppUser {
  id: string;
  email?: string;
  businessId: string;
  role: UserRole;
  fullName: string;
}

// ---------- Fase B: Customization Engine ----------
export type CommissionType = "nominal" | "percent";
export type TemplateType = "nota" | "selesai";
export type ServiceUnit = "kg" | "pcs" | "paket" | "layanan";

export interface ServiceStage {
  id: string;
  service_id: string;
  name: string;
  sort_order: number;
  commission_type: CommissionType;
  commission_value: number;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  unit: ServiceUnit | string;
  is_active: boolean;
  created_at: string;
  stages: ServiceStage[];
}

export interface MessageTemplate {
  id: string;
  type: TemplateType;
  name: string;
  body: string;
  is_default: boolean;
  created_at: string;
}

// ---------- Fase C: Kasir / Transaksi ----------
export type PaymentStatus = "lunas_depan" | "dp" | "bayar_belakang";
export type PaymentMethod = "qris" | "tunai" | "transfer";
export type WorkStatus = "antri" | "proses" | "selesai" | "diambil";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface OrderItem {
  id?: string;
  service_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_no: string;
  customer_id: string | null;
  cashier_id: string | null;
  total: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  remaining_amount: number;
  payment_method: PaymentMethod;
  proof_url: string | null;
  note: string | null;
  work_status: WorkStatus;
  membership_used?: number;
  estimated_done_at: string | null;
  picked_up_at?: string | null;
  picked_up_by?: string | null;
  created_at: string;
  customers?: { name: string; phone: string | null } | null;
  returned_by?: { full_name: string } | null;
  items?: OrderItem[];
  stages?: OrderStage[];
}

// ---------- Fase D: Kas Laci & Pengeluaran ----------
export type CashShiftStatus = "open" | "closed";

export interface CashShift {
  id: string;
  opening_cash: number;
  expected_cash: number;
  closing_cash: number | null;
  variance: number | null;
  status: CashShiftStatus;
  note: string | null;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface ShiftBreakdown {
  cashIn: number;
  cashOut: number;
  expected: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  is_cash: boolean;
  cash_shift_id: string | null;
  note: string | null;
  user_id: string | null;
  created_at: string;
}

// ---------- Fase E: Workflow & Komisi ----------
export type OrderStageStatus = "belum" | "selesai";

export interface OrderStage {
  id: string;
  service_id: string | null;
  name: string;
  sort_order: number;
  status: OrderStageStatus;
  commission_type: CommissionType;
  commission_value: number;
  commission_amount: number;
  completed_by: string | null;
  completed_at: string | null;
  users?: { full_name: string } | null;
}

export interface Commission {
  id: string;
  user_id: string;
  order_id: string | null;
  order_stage_id: string | null;
  amount: number;
  period: string;
  created_at: string;
}

export interface CommissionSummary {
  userId: string;
  fullName: string;
  total: number;
}

// ---------- Fase F: Nota & Printer ----------
export interface Business {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  attendance_lat?: number | null;
  attendance_lng?: number | null;
  attendance_radius_m?: number | null;
  /** Kirim WhatsApp nota selesai otomatis setelah semua tahap selesai */
  auto_send_complete_note?: boolean;
}

export interface PrintDevice {
  id: string;
  device_name: string;
  device_id: string | null;
  created_at: string;
}

// ---------- Fase G: Absensi ----------
export type AttendanceType = "masuk" | "pulang";

export interface Attendance {
  id: string;
  user_id: string;
  type: AttendanceType;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
  is_valid: boolean;
  created_at: string;
  users?: { full_name: string } | null;
}

// ---------- Fase H: Penggajian ----------
export type LoanType = "pinjaman" | "hutang" | "kerugian";
export type LoanStatus = "diajukan" | "disetujui" | "ditolak" | "lunas";
export type DeductionMode = "langsung" | "cicil" | "berkala";
export type PayrollStatus = "draft" | "final" | "dibayar";

export interface Loan {
  id: string;
  user_id: string;
  type: LoanType;
  amount: number;
  remaining: number;
  status: LoanStatus;
  deduction_mode: DeductionMode | null;
  deduction_amount: number | null;
  note: string | null;
  requested_by: string | null;
  approved_by: string | null;
  created_at: string;
  users?: { full_name: string } | null;
}

export interface Payroll {
  id: string;
  user_id: string;
  period: string;
  base_salary: number;
  commission_total: number;
  attendance_days: number;
  deductions: number;
  net_pay: number;
  status: PayrollStatus;
  created_at: string;
  users?: { full_name: string } | null;
}

// ---------- Fase I: Membership ----------
export type MembershipType = "saldo" | "kuota";
export type MembershipChangeType = "topup" | "pakai" | "refund";

export interface MembershipPackage {
  id: string;
  type: MembershipType;
  name: string;
  price: number;
  saldo_amount: number | null;
  quota_amount: number | null;
  quota_service_id: string | null;
  is_active: boolean;
  created_at: string;
  services?: { name: string; unit: string } | null;
}

export interface Membership {
  id: string;
  customer_id: string;
  type: MembershipType;
  balance: number;
  quota_service_id: string | null;
  quota_remaining: number;
  package_id: string | null;
  created_at: string;
  customers?: { name: string; phone: string | null } | null;
  services?: { name: string; unit: string } | null;
  membership_packages?: { name: string; price: number } | null;
}

export interface MembershipTransaction {
  id: string;
  order_id: string | null;
  change_type: MembershipChangeType;
  amount: number;
  created_at: string;
}

// ---------- Fase J: Inventori ----------
export type InventoryChangeType = "masuk" | "keluar" | "adjust";

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  last_restock_at: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  change_type: InventoryChangeType;
  qty: number;
  note: string | null;
  created_at: string;
  users?: { full_name: string } | null;
}

// ---------- Fase K: CRM Konsumen ----------
export interface CustomerStats {
  id: string;
  name: string;
  phone: string | null;
  member_since: string;
  total_transaksi: number;
  omset_total?: number;
  transaksi_terakhir: string | null;
}

export interface CustomerOrderSummary {
  id: string;
  order_no: string;
  total?: number;
  work_status: WorkStatus;
  payment_status: PaymentStatus;
  created_at: string;
}

// ---------- Fase L: Dashboard Owner ----------
export type DashboardRange = "today" | "week" | "month";
export type NotificationType = "stok_menipis" | "pinjaman" | "info";

export interface EmployeePerformance {
  userId: string;
  fullName: string;
  commissionTotal: number;
  attendanceDays: number;
}

export interface QueueToday {
  antri: number;
  proses: number;
  selesai: number;
  diambil: number;
  total: number;
}

export interface DashboardSummary {
  range: DashboardRange;
  revenue: number;
  orderCount: number;
  expenses: number;
  commissions: number;
  netProfit: number;
  growthPercent: number | null;
  employeePerformance: EmployeePerformance[];
  queueToday: QueueToday;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ---------- Fase M: Dashboard Karyawan ----------
export interface MeTodayActivity {
  id: string;
  stageName: string;
  transactionCode: string;
  customerName: string;
  serviceName: string;
}

export interface MeTodaySummary {
  attendance: { daysPresent: number; daysTarget: number };
  activitiesToday: MeTodayActivity[];
  toFinish: { total: number; late: number };
  orderCountToday: number;
  expensesToday: number;
  cashDrawer: { expectedCash: number } | null;
}

export interface OmsetChartPoint {
  label: string;
  revenue: number;
}

export interface OwnerOmsetSummary {
  revenueMonth: number;
  revenueToday: number;
  avgDailyRevenue: number;
  forecastMonthRevenue: number;
  daysElapsed: number;
  daysInMonth: number;
  todayLabel: string;
  monthLabel: string;
  chartDaily: OmsetChartPoint[];
  chartWeekly: OmsetChartPoint[];
  chartMonthly: OmsetChartPoint[];
}

export interface FinanceForecast {
  monthLabel: string;
  daysElapsed: number;
  daysInMonth: number;
  revenueMonth: number;
  lastMonthTotalExpense: number;
  avgSalaryLastMonth: number;
  workDaysFullMonth: number;
  activeEmployeeCount: number;
  forecastOmset: number;
  forecastPengeluaran: number;
  forecastLabaBersih: number;
}

export interface EmployeePerforma {
  userId: string;
  fullName: string;
  servicePerformance: number;
  punctuality: number;
  commission: number;
  onTimeDays: number;
}

export interface PerformaSummary {
  effectiveDays: number;
  punctualityPassing: number;
  employees: EmployeePerforma[];
}

export interface InventoryStatusItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  needToBuy: number;
  lastUnitPrice: number | null;
  predictedExpense: number | null;
}

export interface ViewProps {
  embedded?: boolean;
}
