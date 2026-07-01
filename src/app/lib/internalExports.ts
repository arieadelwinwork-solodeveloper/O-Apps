import { listOrders } from "./orders";
import { listExpenses } from "./cash";
import { listPayrolls, currentPeriod } from "./payroll";
import { listAttendance } from "./attendance";
import { listUsers } from "./users";
import { listInventory } from "./inventory";
import { downloadCsv, formatDateId } from "./exportReports";

export type InternalExportId =
  | "transaksi"
  | "keuangan"
  | "gaji_absensi"
  | "karyawan"
  | "pengeluaran"
  | "inventori";

export interface InternalExportItem {
  id: InternalExportId;
  title: string;
  desc: string;
  filename: string;
}

export const INTERNAL_EXPORT_ITEMS: InternalExportItem[] = [
  {
    id: "transaksi",
    title: "Transaksi",
    desc: "Semua order, pelanggan, total & status",
    filename: "transaksi.csv",
  },
  {
    id: "keuangan",
    title: "Ringkasan Keuangan",
    desc: "Transaksi, pengeluaran & ringkasan laba",
    filename: "laporan-keuangan.csv",
  },
  {
    id: "gaji_absensi",
    title: "Gaji & Absensi",
    desc: "Slip gaji & catatan absensi bulan ini",
    filename: "gaji-absensi.csv",
  },
  {
    id: "karyawan",
    title: "Data Karyawan",
    desc: "Nama, email, gaji pokok & status aktif",
    filename: "karyawan.csv",
  },
  {
    id: "pengeluaran",
    title: "Pengeluaran",
    desc: "Semua catatan beban operasional",
    filename: "pengeluaran.csv",
  },
  {
    id: "inventori",
    title: "Inventori",
    desc: "Stok barang, satuan & batas minimum",
    filename: "inventori.csv",
  },
];

export async function runInternalExport(id: InternalExportId): Promise<void> {
  switch (id) {
    case "transaksi":
      return exportTransactions();
    case "keuangan":
      return exportFinance();
    case "gaji_absensi":
      return exportPayrollAttendance();
    case "karyawan":
      return exportEmployees();
    case "pengeluaran":
      return exportExpenses();
    case "inventori":
      return exportInventory();
  }
}

async function exportTransactions(): Promise<void> {
  const orders = await listOrders();
  const rows: string[][] = [
    ["No", "Tanggal", "No Order", "Pelanggan", "Total", "Diskon", "Status"],
  ];
  orders.forEach((o, i) => {
    rows.push([
      String(i + 1),
      formatDateId(o.created_at),
      o.order_no,
      o.customers?.name ?? "—",
      String(o.total),
      String(o.discount_amount ?? 0),
      o.work_status,
    ]);
  });
  downloadCsv("transaksi.csv", rows);
}

async function exportFinance(): Promise<void> {
  const [orders, expenses] = await Promise.all([listOrders(), listExpenses()]);
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const rows: string[][] = [
    ["Laporan Keuangan"],
    [],
    ["No", "Tanggal", "Pelanggan", "Total", "Diskon", "Status Bayar"],
  ];
  orders.forEach((o, i) => {
    rows.push([
      String(i + 1),
      formatDateId(o.created_at),
      o.customers?.name ?? "—",
      String(o.total),
      String(o.discount_amount ?? 0),
      o.payment_status,
    ]);
  });
  rows.push([]);
  rows.push(["Pengeluaran"]);
  rows.push(["Tanggal", "Kategori", "Nominal", "Keterangan"]);
  expenses.forEach((e) => {
    rows.push([
      formatDateId(e.created_at),
      e.category,
      String(e.amount),
      e.note ?? "",
    ]);
  });
  rows.push([]);
  rows.push(["Ringkasan"]);
  rows.push(["Total Omset", String(revenue)]);
  rows.push(["Total Pengeluaran", String(expenseTotal)]);
  rows.push(["Laba Bersih", String(revenue - expenseTotal)]);
  downloadCsv("laporan-keuangan.csv", rows);
}

async function exportPayrollAttendance(): Promise<void> {
  const period = currentPeriod();
  const [payrolls, attendance] = await Promise.all([
    listPayrolls(period),
    listAttendance(),
  ]);
  const rows: string[][] = [
    ["Gaji", period],
    ["Nama", "Gaji Pokok", "Komisi", "Potongan", "Net"],
  ];
  payrolls.forEach((p) => {
    rows.push([
      p.users?.full_name ?? "—",
      String(p.base_salary),
      String(p.commission_total),
      String(p.deductions),
      String(p.net_pay),
    ]);
  });
  rows.push([]);
  rows.push(["Absensi"]);
  rows.push(["Nama", "Tipe", "Tanggal", "Valid"]);
  attendance.forEach((a) => {
    rows.push([
      a.users?.full_name ?? "—",
      a.type,
      formatDateId(a.created_at),
      a.is_valid ? "Ya" : "Tidak",
    ]);
  });
  downloadCsv(`gaji-absensi-${period}.csv`, rows);
}

async function exportEmployees(): Promise<void> {
  const users = await listUsers();
  const rows: string[][] = [
    ["Nama", "Email", "Peran", "Gaji Pokok", "Status"],
  ];
  users
    .filter((u) => u.role === "karyawan")
    .forEach((u) => {
      rows.push([
        u.full_name,
        u.email ?? "—",
        u.role,
        String(u.base_salary ?? 0),
        u.is_active ? "Aktif" : "Nonaktif",
      ]);
    });
  downloadCsv("karyawan.csv", rows);
}

async function exportExpenses(): Promise<void> {
  const expenses = await listExpenses();
  const rows: string[][] = [
    ["Tanggal", "Kategori", "Nominal", "Keterangan"],
  ];
  expenses.forEach((e) => {
    rows.push([
      formatDateId(e.created_at),
      e.category,
      String(e.amount),
      e.note ?? "",
    ]);
  });
  downloadCsv("pengeluaran.csv", rows);
}

async function exportInventory(): Promise<void> {
  const items = await listInventory();
  const rows: string[][] = [
    ["Nama", "Satuan", "Stok", "Min. Stok", "Status"],
  ];
  items.forEach((item) => {
    const low = item.current_stock <= item.min_stock;
    rows.push([
      item.name,
      item.unit,
      String(item.current_stock),
      String(item.min_stock),
      low ? "Menipis" : "Aman",
    ]);
  });
  downloadCsv("inventori.csv", rows);
}
