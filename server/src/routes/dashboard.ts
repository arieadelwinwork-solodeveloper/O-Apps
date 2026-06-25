import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  getDateRangeBounds,
  growthPercent,
  formatTransactionCode,
  type DashboardRange,
} from "../lib/dateRange.js";
import {
  buildDailyChart,
  buildWeeklyChart,
  buildMonthlyChart,
} from "../lib/omsetChart.js";
import {
  calcServicePerformance,
  calcPunctuality,
  isOnTimeAttendance,
  DEFAULT_WORK_START,
} from "../lib/performaCalc.js";
import { buildInventoryStatusRows } from "../lib/inventoryStatus.js";

export const dashboardRouter = Router();

const rangeSchema = z.enum(["today", "week", "month"]);

async function sumOrders(
  businessId: string,
  start: string,
  end: string
): Promise<{ revenue: number; count: number }> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("total")
    .eq("business_id", businessId)
    .gte("created_at", start)
    .lte("created_at", end);
  if (error) throw error;
  const rows = data ?? [];
  return {
    revenue: rows.reduce((s, o) => s + (o.total ?? 0), 0),
    count: rows.length,
  };
}

async function sumExpenses(
  businessId: string,
  start: string,
  end: string
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("amount")
    .eq("business_id", businessId)
    .gte("created_at", start)
    .lte("created_at", end);
  if (error) throw error;
  return (data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
}

async function sumCommissions(
  businessId: string,
  start: string,
  end: string
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("commissions")
    .select("amount")
    .eq("business_id", businessId)
    .gte("created_at", start)
    .lte("created_at", end);
  if (error) throw error;
  return (data ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);
}

interface BusinessDashboardSettings {
  daysTarget: number;
  cashDrawerVisibility: "all" | "selected";
  cashDrawerUserIds: string[];
}

/** Ambil setting dashboard; fallback default bila migration 0014 belum dijalankan. */
async function getBusinessDashboardSettings(
  businessId: string
): Promise<BusinessDashboardSettings> {
  const defaults: BusinessDashboardSettings = {
    daysTarget: 24,
    cashDrawerVisibility: "all",
    cashDrawerUserIds: [],
  };

  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("work_days_target, cash_drawer_visibility, cash_drawer_user_ids")
    .eq("id", businessId)
    .single();

  if (error) {
    console.warn("[DASHBOARD] business settings fallback:", error.message);
    return defaults;
  }

  return {
    daysTarget: data.work_days_target ?? 24,
    cashDrawerVisibility: data.cash_drawer_visibility ?? "all",
    cashDrawerUserIds: data.cash_drawer_user_ids ?? [],
  };
}

/**
 * GET /api/dashboard/summary — owner: omset, pengeluaran, profit, performa.
 * Query: ?range=today|week|month (default today)
 */
dashboardRouter.get(
  "/summary",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const parsed = rangeSchema.safeParse(req.query.range ?? "today");
    if (!parsed.success) {
      throw new AppError(400, "Parameter range tidak valid");
    }
    const range = parsed.data as DashboardRange;
    const businessId = req.user!.businessId;
    const { start, end, prevStart, prevEnd } = getDateRangeBounds(range);

    try {
      const [orders, prevOrders, expenses, commissions] = await Promise.all([
        sumOrders(businessId, start, end),
        sumOrders(businessId, prevStart, prevEnd),
        sumExpenses(businessId, start, end),
        sumCommissions(businessId, start, end),
      ]);

      const netProfit = orders.revenue - expenses - commissions;
      const growth = growthPercent(orders.revenue, prevOrders.revenue);

      // Performa karyawan: komisi + hari hadir dalam periode.
      const { data: commRows } = await supabaseAdmin
        .from("commissions")
        .select("user_id, amount")
        .eq("business_id", businessId)
        .gte("created_at", start)
        .lte("created_at", end);

      const { data: attRows } = await supabaseAdmin
        .from("attendances")
        .select("user_id, created_at")
        .eq("business_id", businessId)
        .eq("type", "masuk")
        .eq("is_valid", true)
        .gte("created_at", start)
        .lte("created_at", end);

      const commByUser = new Map<string, number>();
      for (const c of commRows ?? []) {
        commByUser.set(c.user_id, (commByUser.get(c.user_id) ?? 0) + c.amount);
      }

      const daysByUser = new Map<string, Set<string>>();
      for (const a of attRows ?? []) {
        const day = new Date(a.created_at).toISOString().slice(0, 10);
        if (!daysByUser.has(a.user_id)) daysByUser.set(a.user_id, new Set());
        daysByUser.get(a.user_id)!.add(day);
      }

      const userIds = new Set([
        ...commByUser.keys(),
        ...daysByUser.keys(),
      ]);

      let names = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: users } = await supabaseAdmin
          .from("users")
          .select("id, full_name")
          .eq("business_id", businessId)
          .in("id", [...userIds]);
        names = new Map((users ?? []).map((u) => [u.id, u.full_name]));
      }

      const employeePerformance = [...userIds].map((id) => ({
        userId: id,
        fullName: names.get(id) ?? "—",
        commissionTotal: commByUser.get(id) ?? 0,
        attendanceDays: daysByUser.get(id)?.size ?? 0,
      }));
      employeePerformance.sort(
        (a, b) => b.commissionTotal - a.commissionTotal
      );

      // Antrean hari ini (untuk widget beranda).
      const todayBounds = getDateRangeBounds("today");
      const { data: todayOrders } = await supabaseAdmin
        .from("orders")
        .select("work_status")
        .eq("business_id", businessId)
        .gte("created_at", todayBounds.start)
        .lte("created_at", todayBounds.end);

      const queueToday = { antri: 0, proses: 0, selesai: 0, diambil: 0 };
      for (const o of todayOrders ?? []) {
        const s = o.work_status as keyof typeof queueToday;
        if (s in queueToday) queueToday[s]++;
      }

      res.json({
        range,
        revenue: orders.revenue,
        orderCount: orders.count,
        expenses,
        commissions,
        netProfit,
        growthPercent: growth,
        employeePerformance,
        queueToday: {
          ...queueToday,
          total: todayOrders?.length ?? 0,
        },
      });
    } catch (err) {
      console.error("[DASHBOARD SUMMARY ERROR]", err);
      throw new AppError(500, "Gagal memuat rangkuman");
    }
  }
);

/**
 * GET /api/dashboard/owner-omset — ringkasan omset untuk dashboard owner.
 */
dashboardRouter.get(
  "/owner-omset",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;
    const now = new Date();
    const { start: monthStart, end: monthEnd } = getDateRangeBounds("month");
    const { start: todayStart, end: todayEnd } = getDateRangeBounds("today");

    try {
      const [monthOrders, todayOrders] = await Promise.all([
        sumOrders(businessId, monthStart, monthEnd),
        sumOrders(businessId, todayStart, todayEnd),
      ]);

      const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const { data: chartRows, error: chartErr } = await supabaseAdmin
        .from("orders")
        .select("total, created_at")
        .eq("business_id", businessId)
        .gte("created_at", chartStart.toISOString())
        .lte("created_at", todayEnd);
      if (chartErr) throw chartErr;

      const orders = chartRows ?? [];
      const chartDaily = buildDailyChart(orders, 7, now);
      const chartWeekly = buildWeeklyChart(orders, 4, now);
      const chartMonthly = buildMonthlyChart(orders, 6, now);

      const daysElapsed = now.getDate();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      const avgDailyRevenue =
        daysElapsed > 0
          ? Math.round(monthOrders.revenue / daysElapsed)
          : 0;
      const forecastMonthRevenue = avgDailyRevenue * daysInMonth;

      const todayLabel = now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const monthLabel = now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });

      res.json({
        revenueMonth: monthOrders.revenue,
        revenueToday: todayOrders.revenue,
        avgDailyRevenue,
        forecastMonthRevenue,
        daysElapsed,
        daysInMonth,
        todayLabel,
        monthLabel,
        chartDaily,
        chartWeekly,
        chartMonthly,
      });
    } catch (err) {
      console.error("[DASHBOARD OWNER-OMSET ERROR]", err);
      throw new AppError(500, "Gagal memuat omset");
    }
  }
);

/**
 * GET /api/dashboard/performa — skor performa karyawan (bulan berjalan).
 */
dashboardRouter.get(
  "/performa",
  authMiddleware,
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;
    const userId = req.user!.id;
    const isOwner = req.user!.role === "owner";
    const { start: monthStart, end: monthEnd } = getDateRangeBounds("month");

    try {
      const biz = await getBusinessDashboardSettings(businessId);
      const effectiveDays = biz.daysTarget;

      let empQuery = supabaseAdmin
        .from("users")
        .select("id, full_name")
        .eq("business_id", businessId)
        .eq("role", "karyawan")
        .order("full_name");
      if (!isOwner) empQuery = empQuery.eq("id", userId);

      const { data: employees, error: empErr } = await empQuery;
      if (empErr) throw empErr;

      const [{ data: commRows }, { data: attRows }] = await Promise.all([
        supabaseAdmin
          .from("commissions")
          .select("user_id, amount")
          .eq("business_id", businessId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
        supabaseAdmin
          .from("attendances")
          .select("user_id, created_at")
          .eq("business_id", businessId)
          .eq("type", "masuk")
          .eq("is_valid", true)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
      ]);

      const commByUser = new Map<string, number>();
      for (const c of commRows ?? []) {
        commByUser.set(c.user_id, (commByUser.get(c.user_id) ?? 0) + c.amount);
      }
      const totalCommission = [...commByUser.values()].reduce((s, v) => s + v, 0);

      const onTimeDaysByUser = new Map<string, Set<string>>();
      for (const a of attRows ?? []) {
        if (
          !isOnTimeAttendance(
            a.created_at,
            DEFAULT_WORK_START.hour,
            DEFAULT_WORK_START.minute
          )
        ) {
          continue;
        }
        const day = new Date(a.created_at).toISOString().slice(0, 10);
        if (!onTimeDaysByUser.has(a.user_id)) {
          onTimeDaysByUser.set(a.user_id, new Set());
        }
        onTimeDaysByUser.get(a.user_id)!.add(day);
      }

      const karyawan = (employees ?? []).map((e) => {
        const commission = commByUser.get(e.id) ?? 0;
        const onTimeDays = onTimeDaysByUser.get(e.id)?.size ?? 0;
        return {
          userId: e.id,
          fullName: e.full_name,
          servicePerformance: calcServicePerformance(commission, totalCommission),
          punctuality: calcPunctuality(onTimeDays, effectiveDays),
          commission,
          onTimeDays,
        };
      });

      res.json({
        effectiveDays,
        punctualityPassing: 8.5,
        employees: karyawan,
      });
    } catch (err) {
      console.error("[DASHBOARD PERFORMA ERROR]", err);
      throw new AppError(500, "Gagal memuat performa karyawan");
    }
  }
);

/**
 * GET /api/dashboard/queue — antrean hari ini (semua anggota bisnis).
 */
dashboardRouter.get(
  "/queue",
  authMiddleware,
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;
    const { start, end } = getDateRangeBounds("today");

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("work_status")
      .eq("business_id", businessId)
      .gte("created_at", start)
      .lte("created_at", end);
    if (error) {
      console.error("[DASHBOARD QUEUE ERROR]", error);
      throw new AppError(500, "Gagal memuat antrean");
    }

    const queue = { antri: 0, proses: 0, selesai: 0, diambil: 0 };
    for (const o of data ?? []) {
      const s = o.work_status as keyof typeof queue;
      if (s in queue) queue[s]++;
    }
    res.json({ queue, total: data?.length ?? 0 });
  }
);

/**
 * GET /api/dashboard/inventory-status — ringkasan stok untuk beranda.
 */
dashboardRouter.get(
  "/inventory-status",
  authMiddleware,
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;

    try {
      const [
        { data: items, error: itemErr },
        { data: movements, error: movErr },
        { data: expenses, error: expErr },
      ] = await Promise.all([
        supabaseAdmin
          .from("inventory_items")
          .select("id, name, unit, current_stock, min_stock")
          .eq("business_id", businessId)
          .order("name", { ascending: true }),
        supabaseAdmin
          .from("inventory_movements")
          .select("item_id, change_type, qty, note, created_at")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseAdmin
          .from("expenses")
          .select("amount, note, category, created_at")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (itemErr) throw itemErr;
      if (movErr) throw movErr;
      if (expErr) throw expErr;

      res.json({
        items: buildInventoryStatusRows(
          items ?? [],
          movements ?? [],
          expenses ?? []
        ),
      });
    } catch (err) {
      console.error("[DASHBOARD INVENTORY-STATUS ERROR]", err);
      throw new AppError(500, "Gagal memuat status inventori");
    }
  }
);

/**
 * GET /api/dashboard/me-today — rangkuman harian karyawan (tanpa omset).
 */
dashboardRouter.get(
  "/me-today",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    const businessId = req.user!.businessId;
    const userId = req.user!.id;
    const role = req.user!.role;
    const { start: todayStart, end: todayEnd } = getDateRangeBounds("today");
    const { start: monthStart, end: monthEnd } = getDateRangeBounds("month");

    try {
      const biz = await getBusinessDashboardSettings(businessId);

      const { data: attRows } = await supabaseAdmin
        .from("attendances")
        .select("created_at")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .eq("type", "masuk")
        .eq("is_valid", true)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      const daysPresent = new Set(
        (attRows ?? []).map((a) =>
          new Date(a.created_at).toISOString().slice(0, 10)
        )
      ).size;
      const daysTarget = biz.daysTarget;

      const { data: stageRows } = await supabaseAdmin
        .from("order_stages")
        .select(
          "id, name, completed_at, services(name), orders!inner(created_at, customers(name))"
        )
        .eq("business_id", businessId)
        .eq("completed_by", userId)
        .eq("status", "selesai")
        .gte("completed_at", todayStart)
        .lte("completed_at", todayEnd)
        .order("completed_at", { ascending: false });

      const activitiesToday = (stageRows ?? []).map((s) => {
        const order = s.orders as {
          created_at: string;
          customers: { name: string } | null;
        };
        const service = s.services as { name: string } | null;
        return {
          id: s.id,
          stageName: s.name,
          transactionCode: formatTransactionCode(order.created_at),
          customerName: order.customers?.name ?? "—",
          serviceName: service?.name ?? "—",
        };
      });

      const { data: openOrders } = await supabaseAdmin
        .from("orders")
        .select("estimated_done_at")
        .eq("business_id", businessId)
        .in("work_status", ["antri", "proses"]);

      const now = new Date().toISOString();
      const toFinishTotal = openOrders?.length ?? 0;
      const toFinishLate = (openOrders ?? []).filter(
        (o) => o.estimated_done_at && o.estimated_done_at < now
      ).length;

      const { count: orderCountToday } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      const expensesToday = await sumExpenses(
        businessId,
        todayStart,
        todayEnd
      );

      let cashDrawer: { expectedCash: number } | null = null;
      const canSeeCash =
        role === "owner" ||
        biz.cashDrawerVisibility === "all" ||
        biz.cashDrawerUserIds.includes(userId);

      if (canSeeCash) {
        const { data: shift } = await supabaseAdmin
          .from("cash_shifts")
          .select("expected_cash")
          .eq("business_id", businessId)
          .eq("status", "open")
          .maybeSingle();
        if (shift) {
          cashDrawer = { expectedCash: shift.expected_cash };
        }
      }

      res.json({
        attendance: { daysPresent, daysTarget },
        activitiesToday,
        toFinish: { total: toFinishTotal, late: toFinishLate },
        orderCountToday: orderCountToday ?? 0,
        expensesToday,
        cashDrawer,
      });
    } catch (err) {
      console.error("[DASHBOARD ME-TODAY ERROR]", err);
      next(
        err instanceof AppError
          ? err
          : new AppError(500, "Gagal memuat rangkuman harian")
      );
    }
  }
);
