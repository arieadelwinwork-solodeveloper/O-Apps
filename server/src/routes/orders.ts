import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import { getOpenShiftId } from "../lib/cashShift.js";
import {
  computeMembershipDiscount,
  recordMembershipUsage,
} from "../lib/membership.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  settlePaymentSchema,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
  type SettlePaymentInput,
} from "../schemas/orders.js";

export const ordersRouter = Router();

const ORDER_COLS =
  "id, order_no, customer_id, cashier_id, total, payment_status, paid_amount, remaining_amount, payment_method, proof_url, work_status, membership_used, estimated_done_at, created_at";

/** Buat nomor nota berurutan harian per bisnis: INV-YYYYMMDD-NNN. */
async function generateOrderNo(businessId: string): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;

  const startOfDay = new Date(y, now.getMonth(), now.getDate()).toISOString();
  const { count, error } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", startOfDay);
  if (error) {
    console.error("[ORDER NO ERROR]", error);
    throw new AppError(500, "Gagal membuat nomor nota");
  }
  const seq = String((count ?? 0) + 1).padStart(3, "0");
  return `INV-${datePart}-${seq}`;
}

/** Cari customer berdasar telpon dalam bisnis, atau buat baru. */
async function findOrCreateCustomer(
  businessId: string,
  name: string,
  phone?: string
): Promise<string> {
  if (phone) {
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .eq("phone", phone)
      .maybeSingle();
    if (existing) return existing.id;
  }
  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert({ business_id: businessId, name, phone: phone ?? null })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[CUSTOMER CREATE ERROR]", error);
    throw new AppError(500, "Gagal menyimpan data pelanggan");
  }
  return data.id;
}

/**
 * GET /api/orders — daftar transaksi bisnis (terbaru dulu).
 * Query opsional: ?status=antri|proses|selesai|diambil
 */
ordersRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  let query = supabaseAdmin
    .from("orders")
    .select(`${ORDER_COLS}, customers(name, phone)`)
    .eq("business_id", req.user!.businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  const status = req.query.status as string | undefined;
  if (status) query = query.eq("work_status", status);

  const { data, error } = await query;
  if (error) {
    console.error("[ORDERS LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat transaksi");
  }
  res.json({ orders: data });
});

/** GET /api/orders/:id — detail order + item. */
ordersRouter.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(`${ORDER_COLS}, customers(name, phone)`)
    .eq("id", req.params.id)
    .eq("business_id", req.user!.businessId)
    .maybeSingle();
  if (error) {
    console.error("[ORDER GET ERROR]", error);
    throw new AppError(500, "Gagal memuat transaksi");
  }
  if (!order) throw new AppError(404, "Transaksi tidak ditemukan");

  const { data: items, error: itemsErr } = await supabaseAdmin
    .from("order_items")
    .select("id, service_id, name, qty, unit_price, subtotal")
    .eq("order_id", order.id);
  if (itemsErr) {
    console.error("[ORDER ITEMS ERROR]", itemsErr);
    throw new AppError(500, "Gagal memuat item transaksi");
  }

  const { data: stages, error: stagesErr } = await supabaseAdmin
    .from("order_stages")
    .select(
      "id, service_id, name, sort_order, status, commission_type, commission_value, commission_amount, completed_by, completed_at"
    )
    .eq("order_id", order.id)
    .order("sort_order", { ascending: true });
  if (stagesErr) {
    console.error("[ORDER STAGES ERROR]", stagesErr);
    throw new AppError(500, "Gagal memuat tahap transaksi");
  }
  res.json({ order: { ...order, items, stages } });
});

/**
 * POST /api/orders — buat transaksi baru.
 * Harga & total dihitung server (tidak percaya input klien) — Security PRD.
 */
ordersRouter.post(
  "/",
  authMiddleware,
  validateBody(createOrderSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CreateOrderInput;
    const businessId = req.user!.businessId;

    // Ambil harga layanan terkini dari DB.
    const serviceIds = [...new Set(body.items.map((i) => i.serviceId))];
    const { data: services, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, name, price, is_active")
      .eq("business_id", businessId)
      .in("id", serviceIds);
    if (svcErr) {
      console.error("[ORDER SERVICES ERROR]", svcErr);
      throw new AppError(500, "Gagal memuat layanan");
    }
    const svcMap = new Map((services ?? []).map((s) => [s.id, s]));
    for (const id of serviceIds) {
      const svc = svcMap.get(id);
      if (!svc) throw new AppError(400, "Layanan tidak ditemukan");
      if (!svc.is_active) throw new AppError(400, `Layanan "${svc.name}" nonaktif`);
    }

    const itemRows = body.items.map((i) => {
      const svc = svcMap.get(i.serviceId)!;
      const subtotal = Math.round(svc.price * i.qty);
      return {
        service_id: svc.id,
        name: svc.name,
        qty: i.qty,
        unit_price: svc.price,
        subtotal,
      };
    });
    const total = itemRows.reduce((sum, r) => sum + r.subtotal, 0);

    const customerId = await findOrCreateCustomer(
      businessId,
      body.customerName,
      body.customerPhone
    );

    const hasMembership =
      (body.membershipSaldoAmount ?? 0) > 0 ||
      (body.membershipQuotaUsages?.length ?? 0) > 0;

    let membershipUsed = 0;
    let netPayable = total;
    let membershipDeductions: Awaited<
      ReturnType<typeof computeMembershipDiscount>
    >["deductions"] = [];

    if (hasMembership) {
      const result = await computeMembershipDiscount(
        businessId,
        customerId,
        total,
        itemRows,
        {
          saldoAmount: body.membershipSaldoAmount,
          quotaUsages: body.membershipQuotaUsages,
        }
      );
      membershipUsed = result.membershipUsedRupiah;
      netPayable = result.netPayable;
      membershipDeductions = result.deductions;
    }

    // Subtotal per layanan (basis komisi persen pada tahap).
    const baseByService = new Map<string, number>();
    for (const r of itemRows) {
      baseByService.set(
        r.service_id,
        (baseByService.get(r.service_id) ?? 0) + r.subtotal
      );
    }

    // Ambil tahap layanan untuk di-snapshot ke order_stages.
    const { data: stages, error: stagesErr } = await supabaseAdmin
      .from("service_stages")
      .select("id, service_id, name, sort_order, commission_type, commission_value")
      .eq("business_id", businessId)
      .in("service_id", serviceIds);
    if (stagesErr) {
      console.error("[ORDER STAGES LOOKUP ERROR]", stagesErr);
      throw new AppError(500, "Gagal memuat tahap layanan");
    }

    // Tentukan paid_amount dari status bayar (basis: tagihan setelah membership).
    let paidAmount = 0;
    if (body.paymentStatus === "lunas_depan") {
      paidAmount = netPayable;
    } else if (body.paymentStatus === "bayar_belakang") {
      paidAmount = 0;
    } else {
      // dp
      if (!body.paidAmount || body.paidAmount <= 0) {
        throw new AppError(400, "Nominal DP wajib diisi");
      }
      if (body.paidAmount >= netPayable) {
        throw new AppError(400, "Nominal DP harus kurang dari sisa tagihan");
      }
      paidAmount = body.paidAmount;
    }
    const remaining = netPayable - paidAmount;

    // Bukti bayar wajib untuk non-tunai bila ada pembayaran (Security PRD / aturan bisnis).
    if (paidAmount > 0 && body.paymentMethod !== "tunai" && !body.proofUrl) {
      throw new AppError(400, "Bukti bayar wajib untuk pembayaran non-tunai");
    }

    const orderNo = await generateOrderNo(businessId);

    // Kaitkan ke shift kas terbuka jika pembayaran tunai (untuk prediksi kas).
    let cashShiftId: string | null = null;
    if (body.paymentMethod === "tunai" && paidAmount > 0) {
      cashShiftId = await getOpenShiftId(businessId);
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        cashier_id: req.user!.id,
        order_no: orderNo,
        total,
        payment_status: body.paymentStatus,
        paid_amount: paidAmount,
        remaining_amount: remaining,
        payment_method: body.paymentMethod,
        proof_url: body.proofUrl ?? null,
        work_status: "antri",
        membership_used: membershipUsed,
        cash_shift_id: cashShiftId,
        estimated_done_at: body.estimatedDoneAt ?? null,
      })
      .select(ORDER_COLS)
      .single();
    if (orderErr || !order) {
      console.error("[ORDER CREATE ERROR]", orderErr);
      throw new AppError(500, "Gagal menyimpan transaksi");
    }

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemRows.map((r) => ({ ...r, order_id: order.id })));
    if (itemsErr) {
      // Rollback order bila item gagal.
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      console.error("[ORDER ITEMS CREATE ERROR]", itemsErr);
      throw new AppError(500, "Gagal menyimpan item transaksi");
    }

    // Snapshot tahap pengerjaan (Fase E) bila layanan punya tahap.
    const stageRows = (stages ?? []).map((s) => ({
      business_id: businessId,
      order_id: order.id,
      service_id: s.service_id,
      service_stage_id: s.id,
      name: s.name,
      sort_order: s.sort_order,
      commission_type: s.commission_type,
      commission_value: s.commission_value,
      base_amount: baseByService.get(s.service_id) ?? 0,
      status: "belum" as const,
    }));
    if (stageRows.length > 0) {
      const { error: stageInsErr } = await supabaseAdmin
        .from("order_stages")
        .insert(stageRows);
      if (stageInsErr) {
        console.error("[ORDER STAGES CREATE ERROR]", stageInsErr);
        // Tidak fatal untuk transaksi; tahap bisa ditambah manual nanti.
      }
    }

    if (membershipDeductions.length > 0) {
      await recordMembershipUsage(
        businessId,
        order.id,
        membershipDeductions
      );
    }

    res.status(201).json({ order: { ...order, items: itemRows } });
  }
);

/** PATCH /api/orders/:id/status — ubah status pengerjaan. */
ordersRouter.patch(
  "/:id/status",
  authMiddleware,
  validateBody(updateOrderStatusSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as UpdateOrderStatusInput;
    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({ work_status: body.workStatus })
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[ORDER STATUS ERROR]", error);
      throw new AppError(500, "Gagal memperbarui status");
    }
    if (!data) throw new AppError(404, "Transaksi tidak ditemukan");
    res.json({ success: true });
  }
);

/** PATCH /api/orders/:id/settle — lunasi sisa pembayaran. */
ordersRouter.patch(
  "/:id/settle",
  authMiddleware,
  validateBody(settlePaymentSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as SettlePaymentInput;

    const { data: order, error: getErr } = await supabaseAdmin
      .from("orders")
      .select("id, total, paid_amount, remaining_amount, cash_shift_id")
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .maybeSingle();
    if (getErr) {
      console.error("[ORDER SETTLE GET ERROR]", getErr);
      throw new AppError(500, "Gagal memuat transaksi");
    }
    if (!order) throw new AppError(404, "Transaksi tidak ditemukan");
    if (order.remaining_amount <= 0) {
      throw new AppError(400, "Transaksi sudah lunas");
    }
    if (body.paidAmount > order.remaining_amount) {
      throw new AppError(400, "Pembayaran melebihi sisa tagihan");
    }
    if (body.paymentMethod !== "tunai" && !body.proofUrl) {
      throw new AppError(400, "Bukti bayar wajib untuk pembayaran non-tunai");
    }

    const newPaid = order.paid_amount + body.paidAmount;
    const newRemaining = order.total - newPaid;
    const newStatus = newRemaining <= 0 ? "lunas_depan" : "dp";

    // Pelunasan tunai dikaitkan ke shift terbuka bila order belum punya shift.
    let cashShiftPatch: { cash_shift_id?: string } = {};
    if (body.paymentMethod === "tunai" && !order.cash_shift_id) {
      const openShift = await getOpenShiftId(req.user!.businessId);
      if (openShift) cashShiftPatch = { cash_shift_id: openShift };
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        payment_status: newStatus,
        payment_method: body.paymentMethod,
        ...cashShiftPatch,
        ...(body.proofUrl ? { proof_url: body.proofUrl } : {}),
      })
      .eq("id", order.id)
      .eq("business_id", req.user!.businessId);
    if (error) {
      console.error("[ORDER SETTLE ERROR]", error);
      throw new AppError(500, "Gagal melunasi transaksi");
    }
    res.json({ success: true, remaining: newRemaining });
  }
);

/**
 * PATCH /api/orders/:id/stages/:stageId/complete — tandai tahap selesai.
 * Mencatat komisi untuk karyawan penyelesai & memajukan status order otomatis.
 */
ordersRouter.patch(
  "/:id/stages/:stageId/complete",
  authMiddleware,
  async (req: Request, res: Response) => {
    const businessId = req.user!.businessId;

    const { data: stage, error: stageErr } = await supabaseAdmin
      .from("order_stages")
      .select(
        "id, order_id, status, commission_type, commission_value, base_amount"
      )
      .eq("id", req.params.stageId)
      .eq("order_id", req.params.id)
      .eq("business_id", businessId)
      .maybeSingle();
    if (stageErr) {
      console.error("[STAGE COMPLETE GET ERROR]", stageErr);
      throw new AppError(500, "Gagal memuat tahap");
    }
    if (!stage) throw new AppError(404, "Tahap tidak ditemukan");
    if (stage.status === "selesai") {
      throw new AppError(400, "Tahap sudah selesai");
    }

    // Hitung komisi: nominal = nilai; persen = base_amount * nilai / 100.
    const commission =
      stage.commission_type === "percent"
        ? Math.round((stage.base_amount * stage.commission_value) / 100)
        : stage.commission_value;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { error: updErr } = await supabaseAdmin
      .from("order_stages")
      .update({
        status: "selesai",
        completed_by: req.user!.id,
        completed_at: now.toISOString(),
        commission_amount: commission,
      })
      .eq("id", stage.id)
      .eq("business_id", businessId);
    if (updErr) {
      console.error("[STAGE COMPLETE UPDATE ERROR]", updErr);
      throw new AppError(500, "Gagal menyelesaikan tahap");
    }

    // Catat komisi (idempoten via unique index uq_commission_stage).
    if (commission > 0) {
      const { error: commErr } = await supabaseAdmin.from("commissions").insert({
        business_id: businessId,
        user_id: req.user!.id,
        order_id: stage.order_id,
        order_stage_id: stage.id,
        amount: commission,
        period,
      });
      if (commErr && commErr.code !== "23505") {
        console.error("[COMMISSION CREATE ERROR]", commErr);
      }
    }

    // Auto-majukan status order: ada tahap selesai → proses; semua selesai → selesai.
    const { data: allStages } = await supabaseAdmin
      .from("order_stages")
      .select("status")
      .eq("order_id", stage.order_id)
      .eq("business_id", businessId);
    const list = allStages ?? [];
    const doneCount = list.filter((s) => s.status === "selesai").length;
    let workStatus: "proses" | "selesai" | null = null;
    if (list.length > 0 && doneCount === list.length) workStatus = "selesai";
    else if (doneCount > 0) workStatus = "proses";
    if (workStatus) {
      await supabaseAdmin
        .from("orders")
        .update({ work_status: workStatus })
        .eq("id", stage.order_id)
        .eq("business_id", businessId)
        .neq("work_status", "diambil");
    }

    res.json({ success: true, commission, workStatus });
  }
);

/** DELETE /api/orders/:id — hapus transaksi (owner saja). */
ordersRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", req.params.id)
      .eq("business_id", req.user!.businessId)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[ORDER DELETE ERROR]", error);
      throw new AppError(500, "Gagal menghapus transaksi");
    }
    if (!data) throw new AppError(404, "Transaksi tidak ditemukan");
    res.json({ success: true });
  }
);
