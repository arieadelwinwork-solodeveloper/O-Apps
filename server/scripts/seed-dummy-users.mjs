/**
 * Seed akun dummy owner + karyawan untuk development.
 * Jalankan: cd server && npm run seed:dummy
 *
 * Butuh SUPABASE_SERVICE_KEY di server/.env
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error(
    "[seed] Gagal: isi SUPABASE_URL dan SUPABASE_SERVICE_KEY di server/.env"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DUMMY_OWNER = {
  email: "owner@example.com",
  password: "DemoOwner123",
  fullName: "Budi Owner",
  businessName: "Laundry Demo",
};

const DUMMY_KARYAWAN = {
  email: "kasir@example.com",
  password: "DemoKasir123",
  fullName: "Siti Kasir",
  phone: "081234567890",
  baseSalary: 2_500_000,
};

async function findAuthUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
}

async function seedOwner() {
  const existing = await findAuthUserByEmail(DUMMY_OWNER.email);
  if (existing) {
    const { data: profile } = await admin
      .from("users")
      .select("business_id, role")
      .eq("id", existing.id)
      .single();
    if (profile?.business_id) {
      console.log("[seed] Owner sudah ada:", DUMMY_OWNER.email);
      return { userId: existing.id, businessId: profile.business_id };
    }
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: DUMMY_OWNER.email,
    password: DUMMY_OWNER.password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(`Gagal buat owner auth: ${createErr?.message}`);
  }
  const userId = created.user.id;

  const { data: business, error: bizErr } = await admin
    .from("businesses")
    .insert({ name: DUMMY_OWNER.businessName })
    .select("id")
    .single();
  if (bizErr || !business) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`Gagal buat bisnis: ${bizErr?.message}`);
  }

  const { error: userErr } = await admin.from("users").insert({
    id: userId,
    business_id: business.id,
    full_name: DUMMY_OWNER.fullName,
    role: "owner",
  });
  if (userErr) {
    await admin.from("businesses").delete().eq("id", business.id);
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`Gagal buat profil owner: ${userErr.message}`);
  }

  await admin
    .from("businesses")
    .update({ owner_id: userId })
    .eq("id", business.id);

  console.log("[seed] Owner dibuat:", DUMMY_OWNER.email);
  return { userId, businessId: business.id };
}

async function seedKaryawan(businessId) {
  const existing = await findAuthUserByEmail(DUMMY_KARYAWAN.email);
  if (existing) {
    console.log("[seed] Karyawan sudah ada:", DUMMY_KARYAWAN.email);
    return;
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: DUMMY_KARYAWAN.email,
    password: DUMMY_KARYAWAN.password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(`Gagal buat karyawan auth: ${createErr?.message}`);
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
  console.log("[seed] Membuat akun dummy...\n");
  const { businessId } = await seedOwner();
  await seedKaryawan(businessId);

  console.log("\n=== Akun dummy siap dipakai ===\n");
  console.log("OWNER");
  console.log("  Email   :", DUMMY_OWNER.email);
  console.log("  Password:", DUMMY_OWNER.password);
  console.log("\nKARYAWAN");
  console.log("  Email   :", DUMMY_KARYAWAN.email);
  console.log("  Password:", DUMMY_KARYAWAN.password);
  console.log("\nLogin di http://localhost:5181/login");
}

main().catch((err) => {
  console.error("[seed] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
