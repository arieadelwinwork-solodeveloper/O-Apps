import type { UserRole } from "../types";

/** Kategori menu dashboard owner */
export type OwnerMenuCategory =
  | "pelayanan"
  | "crm"
  | "manajemen_sdm"
  | "manajemen_perlengkapan"
  | "keuangan"
  | "pengaturan";

/** Kategori menu dashboard karyawan */
export type KaryawanMenuCategory = "operasional";

export type MenuCategory = OwnerMenuCategory | KaryawanMenuCategory;

export interface MenuItem {
  id: string;
  title: string;
  desc: string;
  roles: UserRole[];
  ownerCategory: OwnerMenuCategory;
  karyawanCategory?: KaryawanMenuCategory;
}

export const MENU_ITEMS: MenuItem[] = [
  // —— Pelayanan (owner) ——
  {
    id: "pemesanan",
    title: "Kasir",
    desc: "Buat transaksi baru",
    roles: ["owner", "karyawan"],
    ownerCategory: "pelayanan",
    karyawanCategory: "operasional",
  },
  {
    id: "transaksi",
    title: "Transaksi",
    desc: "Lacak status pengerjaan",
    roles: ["owner", "karyawan"],
    ownerCategory: "pelayanan",
    karyawanCategory: "operasional",
  },
  {
    id: "membership",
    title: "Membership",
    desc: "Saldo & kuota pelanggan",
    roles: ["owner"],
    ownerCategory: "pelayanan",
  },
  {
    id: "layanan",
    title: "Daftar Layanan",
    desc: "Jasa, tahap & komisi",
    roles: ["owner"],
    ownerCategory: "pelayanan",
  },
  // —— CRM ——
  {
    id: "konsumen",
    title: "Konsumen",
    desc: "CRM & riwayat",
    roles: ["owner", "karyawan"],
    ownerCategory: "crm",
    karyawanCategory: "operasional",
  },
  // —— Manajemen SDM ——
  {
    id: "absensi",
    title: "Absensi",
    desc: "Absen masuk & pulang",
    roles: ["owner", "karyawan"],
    ownerCategory: "manajemen_sdm",
    karyawanCategory: "operasional",
  },
  {
    id: "penggajian",
    title: "Gaji",
    desc: "Slip & pinjaman",
    roles: ["karyawan"],
    ownerCategory: "manajemen_sdm",
    karyawanCategory: "operasional",
  },
  // —— Manajemen Perlengkapan / Peralatan ——
  {
    id: "inventori",
    title: "Inventori",
    desc: "Stok & restock",
    roles: ["owner", "karyawan"],
    ownerCategory: "manajemen_perlengkapan",
    karyawanCategory: "operasional",
  },
  // —— Keuangan ——
  {
    id: "keuangan",
    title: "Omset",
    desc: "Omset & laba",
    roles: ["owner"],
    ownerCategory: "keuangan",
  },
  {
    id: "pengeluaran",
    title: "Pengeluaran",
    desc: "Catat beban harian",
    roles: ["owner", "karyawan"],
    ownerCategory: "keuangan",
    karyawanCategory: "operasional",
  },
  {
    id: "kas",
    title: "Kas Laci",
    desc: "Buka/tutup & prediksi",
    roles: ["owner", "karyawan"],
    ownerCategory: "keuangan",
    karyawanCategory: "operasional",
  },
  // —— Pengaturan ——
  {
    id: "template",
    title: "Template Nota",
    desc: "Pesan nota & selesai",
    roles: ["owner"],
    ownerCategory: "pengaturan",
  },
  {
    id: "printer",
    title: "Printer",
    desc: "Pasangkan printer nota",
    roles: ["owner", "karyawan"],
    ownerCategory: "pengaturan",
    karyawanCategory: "operasional",
  },
];

export const OWNER_CATEGORY_LABEL: Record<OwnerMenuCategory, string> = {
  pelayanan: "Pelayanan",
  crm: "CRM",
  manajemen_sdm: "Manajemen SDM",
  manajemen_perlengkapan: "Manajemen Perlengkapan / Peralatan",
  keuangan: "Keuangan",
  pengaturan: "Pengaturan",
};

export const KARYAWAN_CATEGORY_LABEL: Record<KaryawanMenuCategory, string> = {
  operasional: "Operasional",
};

export const OWNER_CATEGORIES: OwnerMenuCategory[] = [
  "pelayanan",
  "crm",
  "manajemen_sdm",
  "manajemen_perlengkapan",
  "keuangan",
  "pengaturan",
];

export const KARYAWAN_CATEGORIES: KaryawanMenuCategory[] = ["operasional"];

export function menusForRole(role: UserRole): MenuItem[] {
  return MENU_ITEMS.filter((m) => m.roles.includes(role));
}

export function findMenu(id: string, role: UserRole): MenuItem | undefined {
  return menusForRole(role).find((m) => m.id === id);
}

export function menuCategoryForRole(
  item: MenuItem,
  role: UserRole
): MenuCategory {
  if (role === "owner") return item.ownerCategory;
  return item.karyawanCategory ?? "operasional";
}

export function categoriesForRole(role: UserRole): MenuCategory[] {
  return role === "owner" ? OWNER_CATEGORIES : KARYAWAN_CATEGORIES;
}

export function categoryLabel(
  category: MenuCategory,
  role: UserRole
): string {
  if (role === "owner") {
    return OWNER_CATEGORY_LABEL[category as OwnerMenuCategory];
  }
  return KARYAWAN_CATEGORY_LABEL[category as KaryawanMenuCategory];
}
