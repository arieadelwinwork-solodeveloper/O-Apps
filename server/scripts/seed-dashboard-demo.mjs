/**
 * Seed data demo untuk dashboard karyawan (rangkuman harian).
 * Jalankan: cd server && npm run seed:dashboard
 *
 * Butuh: akun dummy (npm run seed:dummy) + migration hingga 0014.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const force = process.argv.includes("--force");

const KARYAWAN_EMAILS = ["pos-kasir@example.com", "kasir@example.com"];
const DEMO_ORDER_PREFIX = "DEMO-DASH-";

if (!url || !serviceKey) {
  console.error(
    "[seed-dashboard] Isi SUPABASE_URL dan SUPABASE_SERVICE_KEY di server/.env"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgoAt(days, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

async function findAuthUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
}

async function findKaryawan() {
  for (const email of KARYAWAN_EMAILS) {
    const auth = await findAuthUserByEmail(email);
    if (!auth) continue;
    const { data } = await admin
      .from("users")
      .select("id, business_id, full_name, role")
      .eq("id", auth.id)
      .single();
    if (data?.role === "karyawan") return data;
  }
  const { data } = await admin
    .from("users")
    .select("id, business_id, full_name, role")
    .eq("role", "karyawan")
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Tidak ada user karyawan. Jalankan npm run seed:dummy dulu.");
  return data;
}

async function demoExists(businessId) {
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .like("order_no", `${DEMO_ORDER_PREFIX}%`);
  return (count ?? 0) > 0;
}

async function clearDemo(businessId) {
  const { data: orders } = await admin
    .from("orders")
    .select("id")
    .eq("business_id", businessId)
    .like("order_no", `${DEMO_ORDER_PREFIX}%`);
  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length > 0) {
    await admin.from("order_stages").delete().in("order_id", orderIds);
    await admin.from("order_items").delete().in("order_id", orderIds);
    await admin.from("orders").delete().in("id", orderIds);
  }
  await admin
    .from("expenses")
    .delete()
    .eq("business_id", businessId)
    .eq("category", "Demo Dashboard");
  console.log("[seed-dashboard] Data demo lama dihapus.");
}

async function ensureServices(businessId) {
  const { data: existing } = await admin
    .from("services")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("name", "Cuci Kilo Demo")
    .maybeSingle();

  if (existing) {
    const { data: stages } = await admin
      .from("service_stages")
      .select("id, name")
      .eq("service_id", existing.id)
      .order("sort_order");
    return { serviceId: existing.id, stages: stages ?? [] };
  }

  const { data: svc, error } = await admin
    .from("services")
    .insert({
      business_id: businessId,
      name: "Cuci Kilo Demo",
      price: 8000,
      unit: "kg",
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !svc) throw new Error(`Gagal buat layanan demo: ${error?.message}`);

  const stageNames = ["Cuci", "Setrika", "Packing"];
  const { data: stages, error: stErr } = await admin
    .from("service_stages")
    .insert(
      stageNames.map((name, i) => ({
        business_id: businessId,
        service_id: svc.id,
        name,
        sort_order: i,
        commission_type: "nominal",
        commission_value: 5000,
      }))
    )
    .select("id, name");
  if (stErr) throw new Error(`Gagal buat tahap demo: ${stErr.message}`);

  return { serviceId: svc.id, stages: stages ?? [] };
}

async function seedAttendances(businessId, userId) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await admin
    .from("attendances")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("type", "masuk")
    .gte("created_at", monthStart.toISOString());

  if ((count ?? 0) >= 10) {
    console.log("[seed-dashboard] Absensi demo sudah ada, lewati.");
    return;
  }

  const rows = [];
  for (let d = 1; d <= 14; d++) {
    rows.push({
      business_id: businessId,
      user_id: userId,
      type: "masuk",
      is_valid: true,
      lat: -6.2,
      lng: 106.8,
      distance_m: 10,
      created_at: daysAgoAt(d, 8),
    });
  }
  const { error } = await admin.from("attendances").insert(rows);
  if (error) throw new Error(`Gagal seed absensi: ${error.message}`);
  console.log("[seed-dashboard] Absensi:", rows.length, "hari");
}

async function seedBusinessSettings(businessId) {
  const { error } = await admin
    .from("businesses")
    .update({
      work_days_target: 24,
      cash_drawer_visibility: "all",
    })
    .eq("id", businessId);
  if (error) {
    console.warn(
      "[seed-dashboard] Setting bisnis (migration 0014?):",
      error.message
    );
  }
}

async function ensureOpenShift(businessId, userId) {
  const { data: open } = await admin
    .from("cash_shifts")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "open")
    .maybeSingle();

  if (open) {
    await admin
      .from("cash_shifts")
      .update({ expected_cash: 1_250_000 })
      .eq("id", open.id);
    return open.id;
  }

  const { data, error } = await admin
    .from("cash_shifts")
    .insert({
      business_id: businessId,
      opened_by: userId,
      opening_cash: 500_000,
      expected_cash: 1_250_000,
      status: "open",
      note: "Demo dashboard",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Gagal buat shift demo: ${error.message}`);
  return data.id;
}

async function seedOrdersAndStages(businessId, userId, serviceId, stages) {
  const today = startOfToday().toISOString();
  const stageByName = Object.fromEntries(stages.map((s) => [s.name, s]));

  const customer = await admin
    .from("customers")
    .insert({
      business_id: businessId,
      name: "Pelanggan Demo",
      phone: "089999990001",
    })
    .select("id")
    .single();

  let customerId = customer.data?.id;
  if (customer.error?.code === "23505") {
    const { data } = await admin
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .eq("phone", "089999990001")
      .single();
    customerId = data?.id;
  }

  const orderSpecs = [
    {
      no: "001",
      total: 48000,
      work_status: "selesai",
      created_at: hoursAgo(2),
      estimated_done_at: hoursFromNow(4),
    },
    {
      no: "002",
      total: 32000,
      work_status: "diambil",
      created_at: hoursAgo(5),
      estimated_done_at: hoursFromNow(2),
    },
    {
      no: "003",
      total: 56000,
      work_status: "proses",
      created_at: hoursAgo(1),
      estimated_done_at: hoursAgo(3),
    },
    {
      no: "004",
      total: 24000,
      work_status: "antri",
      created_at: hoursAgo(0.5),
      estimated_done_at: hoursAgo(1),
    },
    {
      no: "005",
      total: 40000,
      work_status: "proses",
      created_at: daysAgoAt(1, 14),
      estimated_done_at: hoursAgo(5),
    },
    {
      no: "006",
      total: 28000,
      work_status: "antri",
      created_at: daysAgoAt(2, 10),
      estimated_done_at: hoursAgo(2),
    },
  ];

  const activityPlan = [
    { name: "Cuci", count: 2 },
    { name: "Setrika", count: 3 },
    { name: "Packing", count: 1 },
  ];

  for (const spec of orderSpecs) {
    const { data: order, error: oErr } = await admin
      .from("orders")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        cashier_id: userId,
        order_no: `${DEMO_ORDER_PREFIX}${spec.no}`,
        total: spec.total,
        payment_status: "lunas_depan",
        paid_amount: spec.total,
        remaining_amount: 0,
        payment_method: "tunai",
        work_status: spec.work_status,
        estimated_done_at: spec.estimated_done_at,
        created_at: spec.created_at,
      })
      .select("id")
      .single();
    if (oErr || !order) throw new Error(`Gagal buat order demo: ${oErr?.message}`);

    await admin.from("order_items").insert({
      order_id: order.id,
      service_id: serviceId,
      name: "Cuci Kilo Demo",
      qty: spec.total / 8000,
      unit_price: 8000,
      subtotal: spec.total,
    });

    for (const stage of stages) {
      await admin.from("order_stages").insert({
        business_id: businessId,
        order_id: order.id,
        service_id: serviceId,
        service_stage_id: stage.id,
        name: stage.name,
        sort_order: stages.indexOf(stage),
        commission_type: "nominal",
        commission_value: 5000,
        base_amount: spec.total,
        status: "belum",
      });
    }
  }

  let activityIdx = 0;
  for (const { name, count } of activityPlan) {
    const stage = stageByName[name];
    if (!stage) continue;
    const { data: openStages } = await admin
      .from("order_stages")
      .select("id, order_id")
      .eq("business_id", businessId)
      .eq("name", name)
      .eq("status", "belum")
      .limit(count);

    for (const os of openStages ?? []) {
      await admin
        .from("order_stages")
        .update({
          status: "selesai",
          completed_by: userId,
          completed_at: hoursAgo(activityIdx * 0.5 + 1),
          commission_amount: 5000,
        })
        .eq("id", os.id);
      activityIdx++;
    }
  }

  const todayOrders = orderSpecs.filter((s) => {
    const created = new Date(s.created_at);
    return created >= startOfToday();
  });

  console.log(
    "[seed-dashboard] Orders:",
    orderSpecs.length,
    "| hari ini:",
    todayOrders.length
  );
  console.log("[seed-dashboard] Aktivitas hari ini: Cuci 2×, Setrika 3×, Packing 1×");
}

async function seedExpenses(businessId, userId, shiftId) {
  const { error } = await admin.from("expenses").insert({
    business_id: businessId,
    user_id: userId,
    category: "Demo Dashboard",
    amount: 75_000,
    is_cash: true,
    cash_shift_id: shiftId,
    note: "Detergen & plastik",
    created_at: hoursAgo(3),
  });
  if (error) throw new Error(`Gagal seed pengeluaran: ${error.message}`);
  console.log("[seed-dashboard] Pengeluaran hari ini: Rp 75.000");
}

async function main() {
  console.log("[seed-dashboard] Menyiapkan data demo dashboard karyawan...\n");

  const karyawan = await findKaryawan();
  const { business_id: businessId, id: userId, full_name: name } = karyawan;
  console.log("[seed-dashboard] Karyawan:", name, `(${userId.slice(0, 8)}…)`);

  if (await demoExists(businessId)) {
    if (!force) {
      console.log(
        "\n[seed-dashboard] Data demo sudah ada. Gunakan --force untuk buat ulang."
      );
      console.log("Login sebagai karyawan lalu refresh dashboard.\n");
      return;
    }
    await clearDemo(businessId);
  }

  await seedBusinessSettings(businessId);
  await seedAttendances(businessId, userId);
  const { serviceId, stages } = await ensureServices(businessId);
  const shiftId = await ensureOpenShift(businessId, userId);
  await seedOrdersAndStages(businessId, userId, serviceId, stages);
  await seedExpenses(businessId, userId, shiftId);

  console.log("\n=== Dashboard karyawan — contoh angka ===\n");
  console.log("  Absensi bulan ini : ~14 / 24 hari");
  console.log("  Transaksi hari ini: 3 pesanan");
  console.log("  Pengeluaran       : Rp 75.000");
  console.log("  Uang laci         : Rp 1.250.000");
  console.log("  Perlu diselesaikan: 4 (2 terlambat)");
  console.log("  Proses hari ini   : Cuci 2×, Setrika 3×, Packing 1×");
  console.log("\nLogin karyawan → refresh beranda → klik Coba lagi jika perlu.\n");
}

main().catch((err) => {
  console.error("[seed-dashboard] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
