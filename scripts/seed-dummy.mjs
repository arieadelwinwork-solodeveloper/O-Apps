/**
 * Seed akun dummy owner + karyawan ke Supabase (via service_role).
 * Jalankan: npm run seed:dummy
 * Butuh: migration 0001 di Supabase + SUPABASE_SERVICE_KEY di server/.env
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadServerEnv() {
  const envPath = path.join(root, "server", ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return out;
}

const viteEnv = loadEnv("development", root, "");
const serverEnv = loadServerEnv();
const url = serverEnv.SUPABASE_URL || viteEnv.VITE_SUPABASE_URL;
const serviceKey =
  serverEnv.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

const DUMMY_OWNER = {
  email: "pos-owner@example.com",
  password: "DemoOwner123",
  fullName: "Budi Owner",
  businessName: "Laundry Demo",
};

const DUMMY_KARYAWAN = {
  email: "pos-kasir@example.com",
  password: "DemoKasir123",
  fullName: "Siti Kasir",
  phone: "081234567890",
  baseSalary: 2_500_000,
};

async function findAuthUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
}

async function seedOwner(admin) {
  const existing = await findAuthUserByEmail(admin, DUMMY_OWNER.email);
  if (existing) {
    const { data: profile } = await admin
      .from("users")
      .select("business_id")
      .eq("id", existing.id)
      .single();
    if (profile?.business_id) {
      console.log("[seed] Owner sudah ada:", DUMMY_OWNER.email);
      return profile.business_id;
    }
  }

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: DUMMY_OWNER.email,
      password: DUMMY_OWNER.password,
      email_confirm: true,
    });
  if (createErr || !created.user) {
    throw new Error(`Gagal buat owner: ${createErr?.message}`);
  }

  const { data: business, error: bizErr } = await admin
    .from("businesses")
    .insert({ name: DUMMY_OWNER.businessName })
    .select("id")
    .single();
  if (bizErr || !business) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(`Gagal buat bisnis: ${bizErr?.message}`);
  }

  const { error: userErr } = await admin.from("users").insert({
    id: created.user.id,
    business_id: business.id,
    full_name: DUMMY_OWNER.fullName,
    role: "owner",
  });
  if (userErr) {
    await admin.from("businesses").delete().eq("id", business.id);
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(`Gagal buat profil owner: ${userErr.message}`);
  }

  await admin
    .from("businesses")
    .update({ owner_id: created.user.id })
    .eq("id", business.id);

  console.log("[seed] Owner dibuat:", DUMMY_OWNER.email);
  return business.id;
}

async function seedKaryawan(admin, businessId) {
  const existing = await findAuthUserByEmail(admin, DUMMY_KARYAWAN.email);
  if (existing) {
    console.log("[seed] Karyawan sudah ada:", DUMMY_KARYAWAN.email);
    return;
  }

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: DUMMY_KARYAWAN.email,
      password: DUMMY_KARYAWAN.password,
      email_confirm: true,
    });
  if (createErr || !created.user) {
    throw new Error(`Gagal buat karyawan: ${createErr?.message}`);
  }

  const { error: userErr } = await admin.from("users").insert({
    id: created.user.id,
    business_id: businessId,
    full_name: DUMMY_KARYAWAN.fullName,
    role: "karyawan",
    phone: DUMMY_KARYAWAN.phone,
    base_salary: DUMMY_KARYAWAN.baseSalary,
  });
  if (userErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(`Gagal buat profil karyawan: ${userErr.message}`);
  }

  console.log("[seed] Karyawan dibuat:", DUMMY_KARYAWAN.email);
}

async function main() {
  if (!url || !serviceKey) {
    console.error(
      "[seed] Isi SUPABASE_URL + SUPABASE_SERVICE_KEY di server/.env"
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[seed] Memasukkan data dummy ke Supabase...\n");
  const businessId = await seedOwner(admin);
  await seedKaryawan(admin, businessId);

  console.log("\n=== Akun dummy siap ===\n");
  console.log("OWNER     :", DUMMY_OWNER.email, "/", DUMMY_OWNER.password);
  console.log("KARYAWAN  :", DUMMY_KARYAWAN.email, "/", DUMMY_KARYAWAN.password);
  console.log("\nLogin: http://localhost:5181/login");
}

main().catch((err) => {
  console.error("\n[seed] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
