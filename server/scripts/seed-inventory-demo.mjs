/**
 * Seed data demo inventori untuk dashboard (status stok).
 * Jalankan: cd server && npm run seed:inventory
 *
 * Butuh: akun dummy (npm run seed:dummy) + migration 0012 (inventori).
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

const OWNER_EMAILS = ["pos-owner@example.com", "owner@example.com"];
const DEMO_ITEM_NAMES = [
  "Deterjen Cair",
  "Pewangi",
  "Plastik Kemasan",
  "Softener",
  "Pembersih Noda",
];

/** Spesifikasi barang demo: stok, min, harga satuan terakhir (untuk prediksi). */
const ITEM_SPECS = [
  {
    name: "Deterjen Cair",
    unit: "liter",
    current_stock: 5,
    min_stock: 10,
    unitPrice: 15_000,
    restockQty: 20,
  },
  {
    name: "Pewangi",
    unit: "botol",
    current_stock: 12,
    min_stock: 8,
    unitPrice: 28_000,
    restockQty: 12,
  },
  {
    name: "Plastik Kemasan",
    unit: "roll",
    current_stock: 2,
    min_stock: 10,
    unitPrice: 45_000,
    restockQty: 8,
  },
  {
    name: "Softener",
    unit: "liter",
    current_stock: 3,
    min_stock: 6,
    unitPrice: 22_000,
    restockQty: 10,
  },
  {
    name: "Pembersih Noda",
    unit: "botol",
    current_stock: 0,
    min_stock: 4,
    unitPrice: 35_000,
    restockQty: 6,
  },
];

if (!url || !serviceKey) {
  console.error(
    "[seed-inventory] Isi SUPABASE_URL dan SUPABASE_SERVICE_KEY di server/.env"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

async function findAuthUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
}

async function findBusiness() {
  for (const email of OWNER_EMAILS) {
    const auth = await findAuthUserByEmail(email);
    if (!auth) continue;
    const { data } = await admin
      .from("users")
      .select("id, business_id, full_name, role")
      .eq("id", auth.id)
      .single();
    if (data?.business_id) return data;
  }

  const { data: karyawan } = await admin
    .from("users")
    .select("id, business_id, full_name, role")
    .eq("role", "karyawan")
    .limit(1)
    .maybeSingle();
  if (!karyawan?.business_id) {
    throw new Error(
      "Tidak ada bisnis demo. Jalankan npm run seed:dummy dulu."
    );
  }
  return karyawan;
}

async function demoExists(businessId) {
  const { count } = await admin
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .in("name", DEMO_ITEM_NAMES);
  return (count ?? 0) > 0;
}

async function clearDemo(businessId) {
  const { data: items } = await admin
    .from("inventory_items")
    .select("id")
    .eq("business_id", businessId)
    .in("name", DEMO_ITEM_NAMES);

  const ids = (items ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await admin.from("inventory_movements").delete().in("item_id", ids);
    await admin.from("inventory_items").delete().in("id", ids);
  }

  await admin
    .from("expenses")
    .delete()
    .eq("business_id", businessId)
    .eq("category", "Demo Inventori");

  console.log("[seed-inventory] Data inventori demo lama dihapus.");
}

async function seedInventory(businessId, userId) {
  for (const spec of ITEM_SPECS) {
    const { data: item, error: itemErr } = await admin
      .from("inventory_items")
      .insert({
        business_id: businessId,
        name: spec.name,
        unit: spec.unit,
        current_stock: spec.current_stock,
        min_stock: spec.min_stock,
        last_restock_at: daysAgo(7),
      })
      .select("id")
      .single();

    if (itemErr || !item) {
      throw new Error(`Gagal buat ${spec.name}: ${itemErr?.message}`);
    }

    const priceNote = `harga satuan Rp ${spec.unitPrice.toLocaleString("id-ID")}`;

    const { error: movErr } = await admin.from("inventory_movements").insert([
      {
        business_id: businessId,
        item_id: item.id,
        user_id: userId,
        change_type: "masuk",
        qty: spec.restockQty,
        note: priceNote,
        created_at: daysAgo(30),
      },
      {
        business_id: businessId,
        item_id: item.id,
        user_id: userId,
        change_type: "keluar",
        qty: Math.max(0, spec.restockQty - spec.current_stock),
        note: "Pemakaian operasional",
        created_at: daysAgo(3),
      },
    ]);

    if (movErr) {
      throw new Error(`Gagal catat mutasi ${spec.name}: ${movErr.message}`);
    }
  }

  console.log("[seed-inventory] Barang:", ITEM_SPECS.length);
}

async function seedExpenses(businessId, userId) {
  const expenseRows = [
    {
      name: "Deterjen Cair",
      amount: 300_000,
      note: "Beli Deterjen Cair 20 liter @ Rp 15.000",
      days: 30,
    },
    {
      name: "Plastik Kemasan",
      amount: 360_000,
      note: "Restock Plastik Kemasan 8 roll",
      days: 14,
    },
  ];

  for (const row of expenseRows) {
    const { error } = await admin.from("expenses").insert({
      business_id: businessId,
      user_id: userId,
      category: "Demo Inventori",
      amount: row.amount,
      is_cash: false,
      note: row.note,
      created_at: daysAgo(row.days),
    });
    if (error) {
      console.warn(`[seed-inventory] Pengeluaran ${row.name}:`, error.message);
    }
  }

  console.log("[seed-inventory] Pengeluaran demo:", expenseRows.length);
}

function printSummary() {
  console.log("\n=== Status inventori demo ===\n");
  for (const spec of ITEM_SPECS) {
    const need = Math.max(0, Math.ceil(spec.min_stock - spec.current_stock));
    const pred =
      need > 0
        ? `Rp ${(need * spec.unitPrice).toLocaleString("id-ID")}`
        : "—";
    console.log(
      `  ${spec.name.padEnd(18)} ${String(spec.current_stock).padStart(2)} ${spec.unit} | min ${spec.min_stock} | beli ${need} | prediksi ${pred}`
    );
  }
  console.log(
    "\nRefresh beranda → bagian Status Inventori di bawah Performa.\n"
  );
}

async function main() {
  console.log("[seed-inventory] Menyiapkan data demo inventori...\n");

  const user = await findBusiness();
  const { business_id: businessId, id: userId, full_name: name } = user;
  console.log("[seed-inventory] Bisnis:", businessId.slice(0, 8) + "…", "| user:", name);

  if (await demoExists(businessId)) {
    if (!force) {
      console.log(
        "\n[seed-inventory] Data inventori demo sudah ada. Gunakan --force untuk buat ulang.\n"
      );
      printSummary();
      return;
    }
    await clearDemo(businessId);
  }

  await seedInventory(businessId, userId);
  await seedExpenses(businessId, userId);
  printSummary();
}

main().catch((err) => {
  console.error(
    "[seed-inventory] Error:",
    err instanceof Error ? err.message : err
  );
  process.exit(1);
});
