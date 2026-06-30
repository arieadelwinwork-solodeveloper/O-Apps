import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const customersRouter = Router();

type CustomerStatRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  member_since: string;
  total_transaksi: number;
  omset_total: number;
  transaksi_terakhir: string | null;
};

function stripFinancials<T extends { omset_total?: number }>(
  row: T
): Omit<T, "omset_total"> {
  const { omset_total: _, ...rest } = row;
  return rest;
}

/**
 * GET /api/customers/stats — daftar konsumen + agregasi CRM.
 * Query: ?q=nama/telpon, ?sort=omset|transaksi|terbaru
 * Owner: lengkap. Karyawan: tanpa omset_total.
 */
customersRouter.get(
  "/stats",
  authMiddleware,
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;
    const isOwner = req.user!.role === "owner";
    const sort = (req.query.sort as string) || "omset";

    let query = supabaseAdmin
      .from("customer_stats")
      .select(
        "id, name, phone, member_since, total_transaksi, omset_total, transaksi_terakhir"
      )
      .eq("business_id", businessId)
      .limit(100);

    const q = (req.query.q as string | undefined)?.trim();
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

    if (sort === "transaksi") {
      query = query.order("total_transaksi", { ascending: false });
    } else if (sort === "terbaru") {
      query = query.order("transaksi_terakhir", {
        ascending: false,
        nullsFirst: false,
      });
    } else {
      query = query.order("omset_total", { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error("[CUSTOMER STATS ERROR]", error);
      throw new AppError(500, "Gagal memuat data konsumen");
    }

    const rows = (data ?? []) as CustomerStatRow[];
    const customers = isOwner
      ? rows
      : rows.map((r) => stripFinancials(r));
    res.json({ customers });
  }
);

/**
 * GET /api/customers/:id — detail konsumen + riwayat transaksi.
 * Karyawan: tanpa nominal omset per transaksi.
 */
customersRouter.get(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;
    const isOwner = req.user!.role === "owner";

    const { data: stat, error: statErr } = await supabaseAdmin
      .from("customer_stats")
      .select(
        "id, name, phone, member_since, total_transaksi, omset_total, transaksi_terakhir"
      )
      .eq("id", req.params.id)
      .eq("business_id", businessId)
      .maybeSingle();
    if (statErr) {
      console.error("[CUSTOMER STAT ERROR]", statErr);
      throw new AppError(500, "Gagal memuat konsumen");
    }
    if (!stat) throw new AppError(404, "Konsumen tidak ditemukan");

    const orderCols = isOwner
      ? "id, order_no, total, work_status, payment_status, created_at"
      : "id, order_no, work_status, payment_status, created_at";

    const { data: orders, error: ordErr } = await supabaseAdmin
      .from("orders")
      .select(orderCols)
      .eq("customer_id", stat.id)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (ordErr) {
      console.error("[CUSTOMER ORDERS ERROR]", ordErr);
      throw new AppError(500, "Gagal memuat transaksi konsumen");
    }

    const { data: memberships } = await supabaseAdmin
      .from("memberships")
      .select(
        "id, type, balance, quota_remaining, quota_service_id, services:quota_service_id(name, unit)"
      )
      .eq("customer_id", stat.id)
      .eq("business_id", businessId);

    res.json({
      customer: isOwner ? stat : stripFinancials(stat as CustomerStatRow),
      orders: orders ?? [],
      memberships: memberships ?? [],
    });
  }
);

/**
 * GET /api/customers — daftar pelanggan bisnis (ringkas, untuk autocomplete).
 * Query opsional: ?q=<cari nama/telpon>
 */
customersRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  let query = supabaseAdmin
    .from("customers")
    .select("id, name, phone, created_at")
    .eq("business_id", req.user!.businessId)
    .order("created_at", { ascending: false })
    .limit(50);

  const q = (req.query.q as string | undefined)?.trim();
  if (q) {
    const escaped = q.replace(/[%_]/g, "\\$&");
    query = query.or(`name.ilike.${escaped}%,phone.ilike.${escaped}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[CUSTOMERS LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat pelanggan");
  }
  res.json({ customers: data });
});
