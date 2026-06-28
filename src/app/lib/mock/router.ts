import type { Order, OrderItem, OrderStage } from "../../types";
import { IDS } from "./ids";
import {
  buildChartDaily,
  buildChartMonthly,
} from "./seed";
import { getStore, uid } from "./store";
import type { MockSeed } from "./seed";
import {
  buildCuciKiloanOrderStages,
  buildSetrikaSajaOrderStages,
  isCuciKiloanServiceName,
  isSetrikaSajaServiceName,
  resolveOrderStageName,
} from "../workflowStages";
import { buildFinanceForecast } from "../financeForecast";

function workerForStage(s: MockSeed, stage: OrderStage) {
  if (!stage.completed_by) return stage;
  const name =
    s.users.find((u) => u.id === stage.completed_by)?.full_name ?? "Karyawan";
  return { ...stage, users: { full_name: name } };
}

function stagesForOrder(s: MockSeed, orderId: string, fallback?: OrderStage[]) {
  const list = s.orderStages[orderId] ?? fallback ?? [];
  return list.map((st) => workerForStage(s, st));
}

interface MockCreateOrderInput {
  customerName: string;
  customerPhone: string;
  items: { serviceId: string; qty: number }[];
  paymentStatus: "lunas_depan" | "dp" | "bayar_belakang";
  paymentMethod: "qris" | "tunai" | "transfer";
  paidAmount?: number;
  proofUrl?: string;
  note?: string;
  estimatedDoneAt?: string;
  membershipSaldoAmount?: number;
  membershipQuotaUsages?: { membershipId: string; qty: number }[];
}

function delay(ms = 100): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseUrl(path: string) {
  const q = path.indexOf("?");
  const pathname = q >= 0 ? path.slice(0, q) : path;
  const search = q >= 0 ? path.slice(q + 1) : "";
  return { pathname, params: new URLSearchParams(search) };
}

function body<T>(options: RequestInit): T {
  if (!options.body) return {} as T;
  return JSON.parse(options.body as string) as T;
}

function orderNo(): string {
  const s = getStore();
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  s.orderCounter += 1;
  return `INV-${datePart}-${String(s.orderCounter).padStart(3, "0")}`;
}

function findService(id: string) {
  return getStore().services.find((s) => s.id === id);
}

function createOrderFromInput(input: MockCreateOrderInput): Order {
  const s = getStore();
  let customer = s.customers.find((c) => c.phone === input.customerPhone);
  if (!customer) {
    customer = {
      id: uid("cust"),
      name: input.customerName,
      phone: input.customerPhone,
      member_since: new Date().toISOString(),
      total_transaksi: 0,
      omset_total: 0,
      transaksi_terakhir: null,
    };
    s.customers.unshift(customer);
  }

  const items: OrderItem[] = input.items.map((it) => {
    const svc = findService(it.serviceId);
    const unitPrice = svc?.price ?? 0;
    return {
      id: uid("oi"),
      service_id: it.serviceId,
      name: svc?.name ?? "Layanan",
      qty: it.qty,
      unit_price: unitPrice,
      subtotal: unitPrice * it.qty,
    };
  });

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  const membershipDiscount =
    (input.membershipSaldoAmount ?? 0) +
    (input.membershipQuotaUsages?.reduce((acc, u) => {
      const m = s.memberships.find((x) => x.id === u.membershipId);
      if (!m?.quota_service_id) return acc;
      const svc = findService(m.quota_service_id);
      return acc + (svc?.price ?? 0) * u.qty;
    }, 0) ?? 0);

  const netTotal = Math.max(0, total - membershipDiscount);
  let paidAmount = 0;
  let remaining = netTotal;
  if (input.paymentStatus === "lunas_depan") {
    paidAmount = netTotal;
    remaining = 0;
  } else if (input.paymentStatus === "dp") {
    paidAmount = input.paidAmount ?? 0;
    remaining = netTotal - paidAmount;
  }

  const orderId = uid("order");
  const stageCtx = {
    note: input.note?.trim() || null,
    items,
  };
  const stages: OrderStage[] = [];
  for (const it of input.items) {
    const svc = findService(it.serviceId);
    if (!svc) continue;
    if (isCuciKiloanServiceName(svc.name)) {
      stages.push(
        ...buildCuciKiloanOrderStages(it.serviceId, stageCtx, (p, i) =>
          uid(`${p}-${i}`)
        )
      );
      continue;
    }
    if (isSetrikaSajaServiceName(svc.name)) {
      stages.push(
        ...buildSetrikaSajaOrderStages(it.serviceId, stageCtx, (p, i) =>
          uid(`${p}-${i}`)
        )
      );
      continue;
    }
    for (const st of svc.stages ?? []) {
      stages.push({
        id: uid("os"),
        service_id: it.serviceId,
        name: resolveOrderStageName(st.name, {
          note: stageCtx.note,
          itemNames: items.map((i) => i.name),
        }),
        sort_order: st.sort_order,
        status: "belum",
        commission_type: st.commission_type,
        commission_value: st.commission_value,
        commission_amount: 0,
        completed_by: null,
        completed_at: null,
      });
    }
  }
  stages.sort((a, b) => a.sort_order - b.sort_order);

  const order: Order = {
    id: orderId,
    order_no: orderNo(),
    customer_id: customer.id,
    cashier_id: IDS.karyawan,
    total: netTotal,
    payment_status: input.paymentStatus,
    paid_amount: paidAmount,
    remaining_amount: remaining,
    payment_method: input.paymentMethod,
    proof_url: input.proofUrl ?? null,
    note: input.note?.trim() || null,
    work_status: "proses",
    membership_used: membershipDiscount,
    estimated_done_at: input.estimatedDoneAt ?? null,
    created_at: new Date().toISOString(),
    customers: { name: input.customerName, phone: input.customerPhone },
    items,
    stages,
  };

  s.orderItems[orderId] = items;
  if (stages.length) s.orderStages[orderId] = stages;
  s.orders.unshift(order);
  return order;
}

export async function mockApiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  await delay();
  const method = (options.method ?? "GET").toUpperCase();
  const { pathname, params } = parseUrl(path);
  const s = getStore();

  // --- Services ---
  if (pathname === "/api/services" && method === "GET") {
    return { services: s.services } as T;
  }
  if (pathname === "/api/services" && method === "POST") {
    const input = body<{ name: string; price: number; unit: string; isActive?: boolean }>(options);
    const service = {
      id: uid("svc"),
      name: input.name,
      price: input.price,
      unit: input.unit,
      is_active: input.isActive ?? true,
      created_at: new Date().toISOString(),
      stages: [],
    };
    s.services.push(service);
    return { service } as T;
  }
  if (pathname.match(/^\/api\/services\/[^/]+$/) && method === "PATCH") {
    return {} as T;
  }
  if (pathname.match(/^\/api\/services\/[^/]+$/) && method === "DELETE") {
    return {} as T;
  }

  // --- Templates ---
  if (pathname === "/api/templates" && method === "GET") {
    return { templates: s.templates } as T;
  }
  if (pathname === "/api/templates" && method === "POST") {
    const input = body<{ type: string; name: string; body: string; isDefault?: boolean }>(options);
    const template = {
      id: uid("tpl"),
      type: input.type as "nota" | "selesai",
      name: input.name,
      body: input.body,
      is_default: input.isDefault ?? false,
      created_at: new Date().toISOString(),
    };
    s.templates.push(template);
    return { template } as T;
  }

  // --- Orders ---
  if (pathname === "/api/orders" && method === "GET") {
    const status = params.get("status");
    let list = [...s.orders];
    if (status) list = list.filter((o) => o.work_status === status);
    return {
      orders: list.map((o) => ({
        ...o,
        stages: stagesForOrder(s, o.id, o.stages),
      })),
    } as T;
  }
  if (pathname === "/api/orders" && method === "POST") {
    const input = body<MockCreateOrderInput>(options);
    const order = createOrderFromInput(input);
    return { order } as T;
  }
  const orderDetail = pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (orderDetail && method === "GET") {
    const id = orderDetail[1];
    const order = s.orders.find((o) => o.id === id);
    if (!order) throw new Error("Pesanan tidak ditemukan");
    return {
      order: {
        ...order,
        items: s.orderItems[id] ?? order.items,
        stages: stagesForOrder(s, id, order.stages),
      },
    } as T;
  }
  const orderStatus = pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (orderStatus && method === "PATCH") {
    const { workStatus } = body<{ workStatus: string }>(options);
    if (workStatus === "diambil") {
      throw new Error("Gunakan proses pengambilan");
    }
    const order = s.orders.find((o) => o.id === orderStatus[1]);
    if (order) order.work_status = workStatus as Order["work_status"];
    return {} as T;
  }
  const orderPickup = pathname.match(/^\/api\/orders\/([^/]+)\/pickup$/);
  if (orderPickup && method === "PATCH") {
    const orderId = orderPickup[1];
    const input = body<{ returnedByUserId: string }>(options);
    const order = s.orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Transaksi tidak ditemukan");
    if (order.work_status !== "selesai") {
      throw new Error("Pesanan belum selesai");
    }
    if (order.remaining_amount > 0) {
      throw new Error("Transaksi wajib lunas");
    }
    const now = new Date().toISOString();
    order.work_status = "diambil";
    order.picked_up_at = now;
    order.picked_up_by = input.returnedByUserId;
    const worker = s.users.find((u) => u.id === input.returnedByUserId);
    order.returned_by = worker ? { full_name: worker.full_name } : undefined;
    return { order, pickedUpAt: now } as T;
  }
  const orderSettle = pathname.match(/^\/api\/orders\/([^/]+)\/settle$/);
  if (orderSettle && method === "PATCH") {
    const input = body<{ paidAmount: number; paymentMethod: string; proofUrl?: string }>(options);
    const order = s.orders.find((o) => o.id === orderSettle[1]);
    if (order) {
      order.paid_amount += input.paidAmount;
      order.remaining_amount = Math.max(0, order.total - order.paid_amount);
      order.payment_method = input.paymentMethod as Order["payment_method"];
      if (input.proofUrl) order.proof_url = input.proofUrl;
      if (order.remaining_amount <= 0) order.payment_status = "lunas_depan";
    }
    return {} as T;
  }
  const stageComplete = pathname.match(/^\/api\/orders\/([^/]+)\/stages\/([^/]+)\/complete$/);
  if (stageComplete && method === "PATCH") {
    const [, orderId, stageId] = stageComplete;
    const input = body<{ completedByUserId: string; skipCommission?: boolean }>(
      options
    );
    const stages = s.orderStages[orderId] ?? [];
    const stage = stages.find((st) => st.id === stageId);
    if (stage) {
      stage.status = "selesai";
      stage.completed_at = new Date().toISOString();
      stage.completed_by = input.completedByUserId ?? IDS.karyawan;
      stage.commission_amount = input.skipCommission
        ? 0
        : stage.commission_value || 5000;
    }
    const doneCount = stages.filter((st) => st.status === "selesai").length;
    let workStatus: "proses" | "selesai" | null = null;
    if (stages.length > 0 && doneCount === stages.length) workStatus = "selesai";
    else if (doneCount > 0) workStatus = "proses";
    const order = s.orders.find((o) => o.id === orderId);
    if (order && workStatus) order.work_status = workStatus;
    return { commission: stage?.commission_amount ?? 0, workStatus } as T;
  }

  // --- Customers ---
  if (pathname === "/api/customers" && method === "GET") {
    return {
      customers: s.customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        created_at: c.member_since,
      })),
    } as T;
  }
  if (pathname === "/api/customers/stats" && method === "GET") {
    let list = [...s.customers];
    const q = params.get("q")?.toLowerCase();
    if (q) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)
      );
    }
    return { customers: list } as T;
  }
  const custDetail = pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (custDetail && method === "GET") {
    const id = custDetail[1];
    const customer = s.customers.find((c) => c.id === id);
    if (!customer) throw new Error("Pelanggan tidak ditemukan");
    const orders = s.orders
      .filter((o) => o.customer_id === id)
      .map((o) => ({
        id: o.id,
        order_no: o.order_no,
        total: o.total,
        work_status: o.work_status,
        payment_status: o.payment_status,
        created_at: o.created_at,
      }));
    const memberships = s.memberships.filter((m) => m.customer_id === id);
    return { customer, orders, memberships } as T;
  }

  // --- Membership packages ---
  if (pathname === "/api/membership-packages" && method === "GET") {
    const activeOnly = params.get("activeOnly") === "1";
    let list = s.membershipPackages;
    if (activeOnly) list = list.filter((p) => p.is_active);
    return { packages: list } as T;
  }
  if (pathname === "/api/membership-packages" && method === "POST") {
    const input = body<{
      type: "saldo" | "kuota";
      name: string;
      price: number;
      saldoAmount?: number;
      quotaAmount?: number;
      quotaServiceId?: string;
    }>(options);
    const svc =
      input.type === "kuota" && input.quotaServiceId
        ? s.services.find((x) => x.id === input.quotaServiceId)
        : null;
    const pkg = {
      id: uid("pkg"),
      type: input.type,
      name: input.name.trim(),
      price: input.price,
      saldo_amount: input.type === "saldo" ? (input.saldoAmount ?? 0) : null,
      quota_amount: input.type === "kuota" ? (input.quotaAmount ?? 0) : null,
      quota_service_id:
        input.type === "kuota" ? (input.quotaServiceId ?? null) : null,
      is_active: true,
      created_at: new Date().toISOString(),
      services:
        svc && input.type === "kuota"
          ? { name: svc.name, unit: svc.unit }
          : null,
    };
    s.membershipPackages.unshift(pkg);
    return { package: pkg } as T;
  }
  const pkgPatch = pathname.match(/^\/api\/membership-packages\/([^/]+)$/);
  if (pkgPatch && method === "PATCH") {
    const { isActive } = body<{ isActive: boolean }>(options);
    const pkg = s.membershipPackages.find((p) => p.id === pkgPatch[1]);
    if (pkg) pkg.is_active = isActive;
    return { package: pkg } as T;
  }

  // --- Memberships ---
  if (pathname === "/api/memberships" && method === "GET") {
    const phone = params.get("phone");
    const customerId = params.get("customerId");
    let list = s.memberships;
    if (phone) {
      const cust = s.customers.find((c) => c.phone === phone);
      list = cust ? list.filter((m) => m.customer_id === cust.id) : [];
    }
    if (customerId) list = list.filter((m) => m.customer_id === customerId);
    return { memberships: list } as T;
  }
  if (pathname === "/api/memberships" && method === "POST") {
    const input = body<{ customerId: string; packageId: string }>(options);
    const pkg = s.membershipPackages.find((p) => p.id === input.packageId);
    if (!pkg || !pkg.is_active) throw new Error("Paket tidak ditemukan");
    const cust = s.customers.find((c) => c.id === input.customerId);
    const credit =
      pkg.type === "saldo" ? (pkg.saldo_amount ?? 0) : (pkg.quota_amount ?? 0);

    if (pkg.type === "saldo") {
      const existing = s.memberships.find(
        (m) => m.customer_id === input.customerId && m.type === "saldo"
      );
      if (existing) {
        existing.balance += credit;
        existing.package_id = pkg.id;
        existing.membership_packages = { name: pkg.name, price: pkg.price };
        return { membership: existing } as T;
      }
      const membership: (typeof s.memberships)[0] = {
        id: uid("mem"),
        customer_id: input.customerId,
        type: "saldo",
        balance: credit,
        quota_service_id: null,
        quota_remaining: 0,
        package_id: pkg.id,
        created_at: new Date().toISOString(),
        customers: cust
          ? { name: cust.name, phone: cust.phone ?? null }
          : undefined,
        membership_packages: { name: pkg.name, price: pkg.price },
      };
      s.memberships.push(membership);
      return { membership } as T;
    }

    const existingQ = s.memberships.find(
      (m) =>
        m.customer_id === input.customerId &&
        m.type === "kuota" &&
        m.quota_service_id === pkg.quota_service_id
    );
    const svc = s.services.find((x) => x.id === pkg.quota_service_id);
    if (existingQ) {
      existingQ.quota_remaining += credit;
      existingQ.package_id = pkg.id;
      existingQ.membership_packages = { name: pkg.name, price: pkg.price };
      return { membership: existingQ } as T;
    }
    const membership: (typeof s.memberships)[0] = {
      id: uid("mem"),
      customer_id: input.customerId,
      type: "kuota",
      balance: 0,
      quota_service_id: pkg.quota_service_id,
      quota_remaining: credit,
      package_id: pkg.id,
      created_at: new Date().toISOString(),
      customers: cust
        ? { name: cust.name, phone: cust.phone ?? null }
        : undefined,
      services: svc ? { name: svc.name, unit: svc.unit } : undefined,
      membership_packages: { name: pkg.name, price: pkg.price },
    };
    s.memberships.push(membership);
    return { membership } as T;
  }
  const membTx = pathname.match(/^\/api\/memberships\/([^/]+)\/transactions$/);
  if (membTx && method === "GET") {
    return { transactions: s.membershipTransactions[membTx[1]] ?? [] } as T;
  }
  const membTopup = pathname.match(/^\/api\/memberships\/([^/]+)\/topup$/);
  if (membTopup && method === "POST") {
    const { amount } = body<{ amount: number }>(options);
    const m = s.memberships.find((x) => x.id === membTopup[1]);
    if (m) {
      if (m.type === "saldo") m.balance += amount;
      else m.quota_remaining += amount;
    }
    return {} as T;
  }

  // --- Dashboard ---
  if (pathname === "/api/dashboard/summary" && method === "GET") {
    const range = params.get("range") ?? "today";
    const mult = range === "month" ? 28 : range === "week" ? 6 : 1;
    return {
      range,
      revenue: 720_000 * mult,
      orderCount: 3 * mult,
      expenses: 75_000 * mult,
      commissions: 42_000 * mult,
      netProfit: 603_000 * mult,
      growthPercent: 12,
      employeePerformance: [
        {
          userId: IDS.karyawan,
          fullName: "Siti Kasir",
          commissionTotal: 420_000,
          attendanceDays: 14,
        },
        {
          userId: IDS.karyawan2,
          fullName: "Andi Operator",
          commissionTotal: 280_000,
          attendanceDays: 12,
        },
      ],
      queueToday: { antri: 2, proses: 3, selesai: 5, diambil: 8, total: 18 },
    } as T;
  }
  if (pathname === "/api/dashboard/queue" && method === "GET") {
    return {
      queue: { antri: 2, proses: 3, selesai: 5, diambil: 8 },
      total: 18,
    } as T;
  }
  if (pathname === "/api/dashboard/me-today" && method === "GET") {
    return {
      attendance: { daysPresent: 14, daysTarget: 24 },
      activitiesToday: [
        {
          id: "act-1",
          stageName: "Sortir",
          transactionCode: "INV-20260624-002",
          customerName: "Budi Santoso",
          serviceName: "Setrika Saja",
        },
        {
          id: "act-2",
          stageName: "Setrika",
          transactionCode: "INV-20260624-001",
          customerName: "Arie",
          serviceName: "Cuci Kiloan",
        },
      ],
      toFinish: { total: 4, late: 2 },
      orderCountToday: 3,
      expensesToday: 75_000,
      cashDrawer: { expectedCash: 1_250_000 },
    } as T;
  }
  if (pathname === "/api/dashboard/owner-omset" && method === "GET") {
    const d = new Date();
    const chartMonthly = buildChartMonthly();
    const revenueMonth = chartMonthly[chartMonthly.length - 1].revenue;
    return {
      revenueMonth,
      revenueToday: 720_000,
      avgDailyRevenue: Math.round(revenueMonth / 20),
      forecastMonthRevenue: Math.round(revenueMonth * 1.08),
      daysElapsed: d.getDate(),
      daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
      todayLabel: d.toLocaleDateString("id-ID", { day: "numeric", month: "long" }),
      monthLabel: d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      chartDaily: buildChartDaily(),
      chartWeekly: buildChartDaily(),
      chartMonthly,
    } as T;
  }
  if (pathname === "/api/dashboard/finance-forecast" && method === "GET") {
    const d = new Date();
    const chartMonthly = buildChartMonthly();
    const revenueMonth = chartMonthly[chartMonthly.length - 1].revenue;
    const daysElapsed = d.getDate();
    const daysInMonth = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0
    ).getDate();
    const activeEmployees = s.users.filter(
      (u) => u.role === "karyawan" && u.is_active
    );
    const avgSalary =
      activeEmployees.reduce((sum, u) => sum + (u.base_salary ?? 0), 0) /
      Math.max(1, activeEmployees.length);
    return buildFinanceForecast({
      revenueMonth,
      lastMonthExpenses: 1_800_000,
      lastMonthCommissions: 950_000,
      avgSalaryLastMonth: Math.round(avgSalary),
      workDaysFullMonth: 24,
      activeEmployeeCount: activeEmployees.length,
      daysElapsed,
      daysInMonth,
      monthLabel: d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      }),
    }) as T;
  }
  if (pathname === "/api/dashboard/performa" && method === "GET") {
    return {
      effectiveDays: 20,
      punctualityPassing: 80,
      employees: [
        {
          userId: IDS.karyawan,
          fullName: "Siti Kasir",
          servicePerformance: 92,
          punctuality: 88,
          commission: 420_000,
          onTimeDays: 18,
        },
        {
          userId: IDS.karyawan2,
          fullName: "Andi Operator",
          servicePerformance: 85,
          punctuality: 76,
          commission: 280_000,
          onTimeDays: 15,
        },
      ],
    } as T;
  }
  if (pathname === "/api/dashboard/inventory-status" && method === "GET") {
    return {
      items: s.inventory.map((item) => {
        const need = Math.max(0, item.min_stock - item.current_stock);
        const price =
          item.name === "Deterjen Cair"
            ? 15_000
            : item.name === "Pewangi"
              ? 28_000
              : item.name === "Plastik Kemasan"
                ? 45_000
                : item.name === "Softener"
                  ? 22_000
                  : 35_000;
        return {
          id: item.id,
          name: item.name,
          unit: item.unit,
          currentStock: item.current_stock,
          minStock: item.min_stock,
          needToBuy: need,
          lastUnitPrice: price,
          predictedExpense: need > 0 ? need * price : null,
        };
      }),
    } as T;
  }

  // --- Notifications ---
  if (pathname === "/api/notifications" && method === "GET") {
    const unreadOnly = params.get("unread") === "1";
    const list = unreadOnly
      ? s.notifications.filter((n) => !n.is_read)
      : s.notifications;
    return {
      notifications: list,
      unreadCount: s.notifications.filter((n) => !n.is_read).length,
    } as T;
  }
  if (pathname === "/api/notifications/read-all" && method === "PATCH") {
    s.notifications.forEach((n) => {
      n.is_read = true;
    });
    return {} as T;
  }
  const notifRead = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notifRead && method === "PATCH") {
    const n = s.notifications.find((x) => x.id === notifRead[1]);
    if (n) n.is_read = true;
    return {} as T;
  }

  // --- Inventory ---
  if (pathname === "/api/inventory" && method === "GET") {
    const lowOnly = params.get("lowStock") === "1";
    let items = s.inventory;
    if (lowOnly) {
      items = items.filter((i) => i.current_stock <= i.min_stock);
    }
    return { items } as T;
  }
  if (pathname === "/api/inventory" && method === "POST") {
    const input = body<{ name: string; unit: string; minStock: number; initialStock: number }>(options);
    const item = {
      id: uid("inv"),
      name: input.name,
      unit: input.unit,
      current_stock: input.initialStock,
      min_stock: input.minStock,
      last_restock_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    s.inventory.push(item);
    return { item } as T;
  }
  const invMove = pathname.match(/^\/api\/inventory\/([^/]+)\/movements$/);
  if (invMove && method === "GET") {
    return { movements: s.inventoryMovements[invMove[1]] ?? [] } as T;
  }
  if (invMove && method === "POST") {
    const input = body<{ changeType: string; qty: number; note?: string }>(options);
    const item = s.inventory.find((i) => i.id === invMove[1]);
    if (item) {
      if (input.changeType === "masuk") item.current_stock += input.qty;
      else if (input.changeType === "keluar") item.current_stock -= input.qty;
      else item.current_stock = input.qty;
    }
    return { currentStock: item?.current_stock ?? 0 } as T;
  }

  // --- Users ---
  if (pathname === "/api/users" && method === "GET") {
    return { users: s.users } as T;
  }

  // --- Cash ---
  if (pathname === "/api/cash-shifts/current" && method === "GET") {
    return {
      shift: s.cashShift,
      breakdown: { cashIn: 850_000, cashOut: 75_000, expected: 1_250_000 },
    } as T;
  }
  if (pathname === "/api/cash-shifts" && method === "GET") {
    return { shifts: s.shifts } as T;
  }
  if (pathname === "/api/cash-shifts/open" && method === "POST") {
    const input = body<{ openingCash: number; note?: string }>(options);
    const shift = {
      id: uid("shift"),
      opening_cash: input.openingCash,
      expected_cash: input.openingCash,
      closing_cash: null,
      variance: null,
      status: "open" as const,
      note: input.note ?? null,
      opened_by: IDS.karyawan,
      closed_by: null,
      opened_at: new Date().toISOString(),
      closed_at: null,
    };
    s.cashShift = shift;
    s.shifts.unshift(shift);
    return { shift } as T;
  }
  if (pathname === "/api/cash-shifts/close" && method === "POST") {
    const input = body<{ closingCash: number; note?: string }>(options);
    const expected = s.cashShift?.expected_cash ?? 0;
    const variance = input.closingCash - expected;
    if (s.cashShift) {
      s.cashShift.status = "closed";
      s.cashShift.closing_cash = input.closingCash;
      s.cashShift.variance = variance;
      s.cashShift.closed_at = new Date().toISOString();
    }
    return { shift: s.cashShift, expected, variance } as T;
  }

  // --- Expenses ---
  if (pathname === "/api/expenses" && method === "GET") {
    return { expenses: s.expenses } as T;
  }
  if (pathname === "/api/expenses" && method === "POST") {
    const input = body<{ category: string; amount: number; isCash: boolean; note?: string }>(options);
    const expense = {
      id: uid("exp"),
      category: input.category,
      amount: input.amount,
      is_cash: input.isCash,
      cash_shift_id: s.cashShift?.id ?? null,
      note: input.note ?? null,
      user_id: IDS.karyawan,
      created_at: new Date().toISOString(),
    };
    s.expenses.unshift(expense);
    return { expense } as T;
  }

  // --- Attendance ---
  if (pathname === "/api/attendance/today" && method === "GET") {
    return { records: s.attendance } as T;
  }
  if (pathname === "/api/attendance" && method === "GET") {
    return { records: s.attendance } as T;
  }
  if (pathname === "/api/attendance" && method === "POST") {
    const input = body<{ type: string; lat: number; lng: number; photoUrl?: string }>(options);
    const record = {
      id: uid("att"),
      user_id: IDS.karyawan,
      type: input.type as "masuk" | "pulang",
      photo_url: input.photoUrl ?? null,
      lat: input.lat,
      lng: input.lng,
      distance_m: 15,
      is_valid: true,
      created_at: new Date().toISOString(),
      users: { full_name: "Siti Kasir" },
    };
    s.attendance.unshift(record);
    return { record, distance: 15 } as T;
  }

  // --- Business ---
  if (pathname === "/api/business" && method === "GET") {
    return { business: s.business } as T;
  }
  if (pathname === "/api/business" && method === "PATCH") {
    const input = body<{ autoSendCompleteNote?: boolean }>(options);
    if (input.autoSendCompleteNote !== undefined) {
      s.business.auto_send_complete_note = input.autoSendCompleteNote;
    }
    Object.assign(s.business, input);
    return { business: s.business } as T;
  }

  // --- Print devices ---
  if (pathname === "/api/print-devices" && method === "GET") {
    return { devices: s.printDevices } as T;
  }
  if (pathname === "/api/print-devices" && method === "POST") {
    const input = body<{ deviceName: string; deviceId?: string }>(options);
    const device = {
      id: uid("prt"),
      device_name: input.deviceName,
      device_id: input.deviceId ?? null,
      created_at: new Date().toISOString(),
    };
    s.printDevices.push(device);
    return { device } as T;
  }

  // --- Loans ---
  if (pathname === "/api/loans" && method === "GET") {
    return { loans: s.loans } as T;
  }
  if (pathname === "/api/loans" && method === "POST") {
    const input = body<{ userId?: string; type: string; amount: number; note?: string }>(options);
    const loan = {
      id: uid("loan"),
      user_id: input.userId ?? IDS.karyawan,
      type: input.type as "pinjaman",
      amount: input.amount,
      remaining: input.amount,
      status: "diajukan" as const,
      deduction_mode: null,
      deduction_amount: null,
      note: input.note ?? null,
      requested_by: IDS.karyawan,
      approved_by: null,
      created_at: new Date().toISOString(),
      users: { full_name: "Siti Kasir" },
    };
    s.loans.unshift(loan);
    return { loan } as T;
  }

  // --- Payrolls ---
  if (pathname === "/api/payrolls" && method === "GET") {
    return { payrolls: s.payrolls } as T;
  }
  if (pathname === "/api/payrolls/generate" && method === "POST") {
    return {} as T;
  }

  // --- Commissions ---
  if (pathname === "/api/commissions" && method === "GET") {
    const total = s.commissions.reduce((a, c) => a + c.amount, 0);
    return { commissions: s.commissions, total } as T;
  }
  if (pathname === "/api/commissions/summary" && method === "GET") {
    return {
      summary: [
        { userId: IDS.karyawan, fullName: "Siti Kasir", total: 420_000 },
        { userId: IDS.karyawan2, fullName: "Andi Operator", total: 280_000 },
      ],
    } as T;
  }

  console.warn(`[mock-api] Belum disimulasikan: ${method} ${pathname}`);
  return {} as T;
}
