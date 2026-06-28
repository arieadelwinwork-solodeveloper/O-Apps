import type {
  Service,
  MessageTemplate,
  Order,
  OrderItem,
  OrderStage,
  CustomerStats,
  InventoryItem,
  InventoryMovement,
  Membership,
  MembershipPackage,
  MembershipTransaction,
  Expense,
  CashShift,
  Attendance,
  Loan,
  Payroll,
  Commission,
  AppNotification,
  PrintDevice,
  Business,
} from "../../types";
import type { BusinessUser } from "../users";
import {
  CUCI_KILOAN_STAGE_TEMPLATES,
  SETRIKA_SAJA_STAGE_TEMPLATES,
  buildCuciKiloanOrderStages,
  buildSetrikaSajaOrderStages,
} from "../workflowStages";
import { IDS } from "./ids";

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
};

export function buildChartDaily() {
  const pts = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    pts.push({
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      revenue: [420_000, 380_000, 510_000, 290_000, 640_000, 480_000, 720_000][6 - i],
    });
  }
  return pts;
}

export function buildChartMonthly() {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];
  const values = [8_200_000, 9_100_000, 7_800_000, 10_400_000, 11_200_000, 12_600_000];
  return months.map((label, i) => ({ label, revenue: values[i] }));
}

export function createSeedData() {
  const services: Service[] = [
    {
      id: IDS.svcCuci,
      name: "Cuci Kiloan",
      price: 8000,
      unit: "kg",
      is_active: true,
      created_at: iso(daysAgo(90)),
      stages: CUCI_KILOAN_STAGE_TEMPLATES.map((t, i) => ({
        id: [
          IDS.stageCuci1,
          IDS.stageCuci2,
          IDS.stageCuci3,
          IDS.stageCuci4,
          IDS.stageCuci5,
          IDS.stageCuci6,
        ][i],
        service_id: IDS.svcCuci,
        ...t,
      })),
    },
    {
      id: IDS.svcSetrika,
      name: "Setrika Saja",
      price: 5000,
      unit: "kg",
      is_active: true,
      created_at: iso(daysAgo(80)),
      stages: SETRIKA_SAJA_STAGE_TEMPLATES.map((t, i) => ({
        id: [
          IDS.stageSetrika1,
          IDS.stageSetrika2,
          IDS.stageSetrika3,
          IDS.stageSetrika4,
        ][i],
        service_id: IDS.svcSetrika,
        ...t,
      })),
    },
    {
      id: IDS.svcDry,
      name: "Dry Clean",
      price: 25000,
      unit: "pcs",
      is_active: true,
      created_at: iso(daysAgo(70)),
      stages: [],
    },
  ];

  const templates: MessageTemplate[] = [
    {
      id: IDS.templateNota,
      type: "nota",
      name: "Nota Standar",
      body: "Halo {nama}, pesanan {layanan} total {total}. Estimasi selesai {estimasi}.",
      is_default: true,
      created_at: iso(daysAgo(60)),
    },
    {
      id: IDS.templateSelesai,
      type: "selesai",
      name: "Pesanan Selesai",
      body: "Halo {nama}, pesanan {layanan} sudah selesai dan siap diambil. Sisa bayar {sisa}. Terima kasih!",
      is_default: true,
      created_at: iso(daysAgo(60)),
    },
  ];

  const customers: CustomerStats[] = [
    {
      id: IDS.custArie,
      name: "Arie",
      phone: "08099219291",
      member_since: iso(daysAgo(120)),
      total_transaksi: 18,
      omset_total: 2_450_000,
      transaksi_terakhir: iso(daysAgo(2)),
    },
    {
      id: IDS.custBudi,
      name: "Budi Santoso",
      phone: "081234567890",
      member_since: iso(daysAgo(200)),
      total_transaksi: 42,
      omset_total: 6_800_000,
      transaksi_terakhir: iso(daysAgo(0)),
    },
    {
      id: IDS.custSiti,
      name: "Siti Rahayu",
      phone: "085678901234",
      member_since: iso(daysAgo(45)),
      total_transaksi: 7,
      omset_total: 890_000,
      transaksi_terakhir: iso(daysAgo(5)),
    },
  ];

  const orderItems: Record<string, OrderItem[]> = {
    [IDS.order1]: [
      {
        id: "oi-001",
        service_id: IDS.svcCuci,
        name: "Cuci Kiloan",
        qty: 3,
        unit_price: 8000,
        subtotal: 24000,
      },
    ],
    [IDS.order2]: [
      {
        id: "oi-002",
        service_id: IDS.svcSetrika,
        name: "Setrika Saja",
        qty: 2,
        unit_price: 5000,
        subtotal: 10000,
      },
    ],
    [IDS.order3]: [
      {
        id: "oi-003",
        service_id: IDS.svcDry,
        name: "Dry Clean",
        qty: 1,
        unit_price: 25000,
        subtotal: 25000,
      },
    ],
  };

  const order1Stages = buildCuciKiloanOrderStages(
    IDS.svcCuci,
    {
      note: "Pewangi lavender",
      items: [{ name: "Cuci Kiloan" }],
    },
    (_, i) => `os-arie-${i + 1}`,
  );

  const order2Stages = buildSetrikaSajaOrderStages(
    IDS.svcSetrika,
    {
      note: "Kemeja kerja & celana",
      items: [{ name: "Setrika Saja" }],
    },
    (_, i) => `os-budi-${i + 1}`,
  );

  const orderStages: Record<string, OrderStage[]> = {
    [IDS.order1]: order1Stages,
    [IDS.order2]: order2Stages,
  };

  const orders: Order[] = [
    {
      id: IDS.order1,
      order_no: "INV-20260624-001",
      customer_id: IDS.custArie,
      cashier_id: IDS.karyawan,
      total: 24000,
      payment_status: "lunas_depan",
      paid_amount: 24000,
      remaining_amount: 0,
      payment_method: "qris",
      proof_url: "https://placehold.co/400x300/png?text=Bukti+Bayar",
      note: "Pewangi lavender",
      work_status: "proses",
      estimated_done_at: iso(daysAgo(-1)),
      created_at: iso(daysAgo(0)),
      customers: { name: "Arie", phone: "08099219291" },
      items: orderItems[IDS.order1],
      stages: order1Stages,
    },
    {
      id: IDS.order2,
      order_no: "INV-20260624-002",
      customer_id: IDS.custBudi,
      cashier_id: IDS.karyawan,
      total: 10000,
      payment_status: "dp",
      paid_amount: 5000,
      remaining_amount: 5000,
      payment_method: "tunai",
      proof_url: null,
      note: "Kemeja kerja & celana",
      work_status: "proses",
      estimated_done_at: iso(daysAgo(-2)),
      created_at: iso(daysAgo(1)),
      customers: { name: "Budi Santoso", phone: "081234567890" },
      items: orderItems[IDS.order2],
      stages: order2Stages,
    },
    {
      id: IDS.order3,
      order_no: "INV-20260623-003",
      customer_id: IDS.custSiti,
      cashier_id: IDS.karyawan,
      total: 25000,
      payment_status: "bayar_belakang",
      paid_amount: 0,
      remaining_amount: 25000,
      payment_method: "transfer",
      proof_url: null,
      note: "Jas pesta",
      work_status: "selesai",
      estimated_done_at: iso(daysAgo(1)),
      created_at: iso(daysAgo(2)),
      customers: { name: "Siti Rahayu", phone: "085678901234" },
      items: orderItems[IDS.order3],
    },
  ];

  const membershipPackages: MembershipPackage[] = [
    {
      id: IDS.pkgSaldoSilver,
      type: "saldo",
      name: "Paket Silver",
      price: 100_000,
      saldo_amount: 120_000,
      quota_amount: null,
      quota_service_id: null,
      is_active: true,
      created_at: iso(daysAgo(60)),
    },
    {
      id: IDS.pkgSaldoGold,
      type: "saldo",
      name: "Paket Gold",
      price: 250_000,
      saldo_amount: 300_000,
      quota_amount: null,
      quota_service_id: null,
      is_active: true,
      created_at: iso(daysAgo(60)),
    },
    {
      id: IDS.pkgKuotaCuci,
      type: "kuota",
      name: "Paket Cuci 10 kg",
      price: 70_000,
      saldo_amount: null,
      quota_amount: 10,
      quota_service_id: IDS.svcCuci,
      is_active: true,
      created_at: iso(daysAgo(45)),
      services: { name: "Cuci Kiloan", unit: "kg" },
    },
  ];

  const memberships: Membership[] = [
    {
      id: IDS.membSaldo,
      customer_id: IDS.custArie,
      type: "saldo",
      balance: 150_000,
      quota_service_id: null,
      quota_remaining: 0,
      package_id: IDS.pkgSaldoSilver,
      created_at: iso(daysAgo(100)),
      customers: { name: "Arie", phone: "08099219291" },
      membership_packages: { name: "Paket Silver", price: 100_000 },
    },
    {
      id: IDS.membKuota,
      customer_id: IDS.custBudi,
      type: "kuota",
      balance: 0,
      quota_service_id: IDS.svcCuci,
      quota_remaining: 5,
      package_id: IDS.pkgKuotaCuci,
      created_at: iso(daysAgo(30)),
      customers: { name: "Budi Santoso", phone: "081234567890" },
      services: { name: "Cuci Kiloan", unit: "kg" },
      membership_packages: { name: "Paket Cuci 10 kg", price: 70_000 },
    },
  ];

  const membershipTransactions: Record<string, MembershipTransaction[]> = {
    [IDS.membSaldo]: [
      {
        id: "mt-001",
        order_id: null,
        change_type: "topup",
        amount: 200_000,
        created_at: iso(daysAgo(30)),
      },
      {
        id: "mt-002",
        order_id: IDS.order1,
        change_type: "pakai",
        amount: 50_000,
        created_at: iso(daysAgo(5)),
      },
    ],
  };

  const inventory: InventoryItem[] = [
    {
      id: IDS.inv1,
      name: "Deterjen Cair",
      unit: "liter",
      current_stock: 5,
      min_stock: 10,
      last_restock_at: iso(daysAgo(14)),
      created_at: iso(daysAgo(90)),
    },
    {
      id: IDS.inv2,
      name: "Pewangi",
      unit: "botol",
      current_stock: 12,
      min_stock: 8,
      last_restock_at: iso(daysAgo(7)),
      created_at: iso(daysAgo(90)),
    },
    {
      id: IDS.inv3,
      name: "Plastik Kemasan",
      unit: "roll",
      current_stock: 2,
      min_stock: 10,
      last_restock_at: iso(daysAgo(21)),
      created_at: iso(daysAgo(90)),
    },
    {
      id: IDS.inv4,
      name: "Softener",
      unit: "liter",
      current_stock: 3,
      min_stock: 6,
      last_restock_at: iso(daysAgo(10)),
      created_at: iso(daysAgo(60)),
    },
    {
      id: IDS.inv5,
      name: "Pembersih Noda",
      unit: "botol",
      current_stock: 0,
      min_stock: 4,
      last_restock_at: iso(daysAgo(45)),
      created_at: iso(daysAgo(60)),
    },
  ];

  const inventoryMovements: Record<string, InventoryMovement[]> = {
    [IDS.inv1]: [
      {
        id: "im-001",
        change_type: "masuk",
        qty: 20,
        note: "Restock bulanan",
        created_at: iso(daysAgo(14)),
        users: { full_name: "Budi Owner" },
      },
      {
        id: "im-002",
        change_type: "keluar",
        qty: 3,
        note: "Pemakaian harian",
        created_at: iso(daysAgo(2)),
        users: { full_name: "Siti Kasir" },
      },
    ],
  };

  const users: BusinessUser[] = [
    {
      id: IDS.karyawan,
      full_name: "Siti Kasir",
      role: "karyawan",
      is_active: true,
      base_salary: 3_500_000,
    },
    {
      id: IDS.karyawan2,
      full_name: "Andi Operator",
      role: "karyawan",
      is_active: true,
      base_salary: 3_200_000,
    },
  ];

  const cashShift: CashShift = {
    id: IDS.shiftOpen,
    opening_cash: 500_000,
    expected_cash: 1_250_000,
    closing_cash: null,
    variance: null,
    status: "open",
    note: null,
    opened_by: IDS.karyawan,
    closed_by: null,
    opened_at: iso(daysAgo(0)),
    closed_at: null,
  };

  const expenses: Expense[] = [
    {
      id: "exp-001",
      category: "Listrik",
      amount: 45_000,
      is_cash: true,
      cash_shift_id: IDS.shiftOpen,
      note: "Token listrik",
      user_id: IDS.karyawan,
      created_at: iso(daysAgo(0)),
    },
    {
      id: "exp-002",
      category: "Konsumsi",
      amount: 30_000,
      is_cash: true,
      cash_shift_id: IDS.shiftOpen,
      note: "Snack tim",
      user_id: IDS.karyawan,
      created_at: iso(daysAgo(0)),
    },
  ];

  const attendance: Attendance[] = [
    {
      id: "att-001",
      user_id: IDS.karyawan,
      type: "masuk",
      photo_url: null,
      lat: -6.2,
      lng: 106.8,
      distance_m: 12,
      is_valid: true,
      created_at: iso(daysAgo(0)),
      users: { full_name: "Siti Kasir" },
    },
  ];

  const loans: Loan[] = [
    {
      id: IDS.loan1,
      user_id: IDS.karyawan,
      type: "pinjaman",
      amount: 500_000,
      remaining: 300_000,
      status: "disetujui",
      deduction_mode: "cicil",
      deduction_amount: 100_000,
      note: "Keperluan darurat",
      requested_by: IDS.karyawan,
      approved_by: IDS.owner,
      created_at: iso(daysAgo(20)),
      users: { full_name: "Siti Kasir" },
    },
  ];

  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const payrolls: Payroll[] = [
    {
      id: IDS.payroll1,
      user_id: IDS.karyawan,
      period,
      base_salary: 3_500_000,
      commission_total: 420_000,
      attendance_days: 14,
      deductions: 100_000,
      net_pay: 3_820_000,
      status: "draft",
      created_at: iso(daysAgo(1)),
      users: { full_name: "Siti Kasir" },
    },
  ];

  const commissions: Commission[] = [];

  const notifications: AppNotification[] = [
    {
      id: "notif-001",
      type: "stok_menipis",
      title: "Stok Deterjen menipis",
      body: "Sisa 5 liter, minimum 10 liter.",
      is_read: false,
      created_at: iso(daysAgo(0)),
    },
    {
      id: "notif-002",
      type: "pinjaman",
      title: "Pengajuan pinjaman",
      body: "Siti Kasir mengajukan pinjaman Rp 500.000.",
      is_read: false,
      created_at: iso(daysAgo(2)),
    },
    {
      id: "notif-003",
      type: "info",
      title: "Selamat datang di O'Apps",
      body: "Mode demo — data simulasi untuk preview UI.",
      is_read: true,
      created_at: iso(daysAgo(3)),
    },
  ];

  const printDevices: PrintDevice[] = [
    {
      id: IDS.printer1,
      device_name: "Printer Kasir",
      device_id: "BT-PRINTER-001",
      created_at: iso(daysAgo(30)),
    },
  ];

  const business: Business = {
    id: IDS.business,
    name: "Laundry Demo",
    address: "Jl. Melati No. 12, Jakarta",
    phone: "021-1234567",
    attendance_lat: -6.2,
    attendance_lng: 106.816666,
    attendance_radius_m: 100,
    auto_send_complete_note: false,
  };

  return {
    services,
    templates,
    customers,
    orders,
    orderItems,
    orderStages,
    memberships,
    membershipPackages,
    membershipTransactions,
    inventory,
    inventoryMovements,
    users,
    cashShift,
    shifts: [cashShift],
    expenses,
    attendance,
    loans,
    payrolls,
    commissions,
    notifications,
    printDevices,
    business,
    orderCounter: 4,
  };
}

export type MockSeed = ReturnType<typeof createSeedData>;
