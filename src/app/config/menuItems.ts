import type { UserRole } from "../types";

/** Kategori menu dashboard owner */
export type OwnerMenuCategory =
  | "utama"
  | "pelayanan"
  | "crm"
  | "manajemen_sdm"
  | "manajemen_perlengkapan"
  | "keuangan"
  | "pengaturan";

/** Kategori menu dashboard karyawan */
export type KaryawanMenuCategory =
  | "utama"
  | "layanan"
  | "keuangan"
  | "personalia"
  | "pengaturan";

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
  // —— Utama (paling atas) ——
  {
    id: "langganan",
    title: "Langganan",
    desc: "Paket & pembayaran SaaS",
    roles: ["owner"],
    ownerCategory: "utama",
  },
  {
    id: "laporan",
    title: "Laporan",
    desc: "Laporkan masalah ke owner",
    roles: ["owner", "karyawan"],
    ownerCategory: "utama",
    karyawanCategory: "utama",
  },
  // —— Pelayanan (owner) ——
  {
    id: "pemesanan",
    title: "Kasir",
    desc: "Buat transaksi baru",
    roles: ["owner", "karyawan"],
    ownerCategory: "pelayanan",
    karyawanCategory: "layanan",
  },
  {
    id: "transaksi",
    title: "Transaksi",
    desc: "Lacak status pengerjaan",
    roles: ["owner", "karyawan"],
    ownerCategory: "pelayanan",
    karyawanCategory: "layanan",
  },
  {
    id: "membership",
    title: "Daftar Membership",
    desc: "Daftar pelanggan & kelola paket",
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
    karyawanCategory: "layanan",
  },
  // —— Manajemen SDM ——
  {
    id: "absensi",
    title: "Absensi",
    desc: "Absen masuk & pulang",
    roles: ["owner", "karyawan"],
    ownerCategory: "manajemen_sdm",
    karyawanCategory: "personalia",
  },
  {
    id: "karyawan",
    title: "Karyawan",
    desc: "Kelola tim & akun",
    roles: ["owner"],
    ownerCategory: "manajemen_sdm",
  },
  {
    id: "penggajian",
    title: "Gaji",
    desc: "Slip & pinjaman",
    roles: ["owner", "karyawan"],
    ownerCategory: "manajemen_sdm",
    karyawanCategory: "personalia",
  },
  // —— Manajemen Perlengkapan / Peralatan ——
  {
    id: "inventori",
    title: "Inventori",
    desc: "Stok & restock",
    roles: ["owner", "karyawan"],
    ownerCategory: "manajemen_perlengkapan",
    karyawanCategory: "keuangan",
  },
  // —— Keuangan ——
  {
    id: "keuangan",
    title: "Ringkasan Keuangan",
    desc: "Omset, pengeluaran & laba",
    roles: ["owner"],
    ownerCategory: "keuangan",
  },
  {
    id: "pengeluaran",
    title: "Pengeluaran",
    desc: "Catat beban harian",
    roles: ["owner", "karyawan"],
    ownerCategory: "keuangan",
    karyawanCategory: "keuangan",
  },
  {
    id: "kas",
    title: "Kas Laci",
    desc: "Buka/tutup & prediksi",
    roles: ["owner", "karyawan"],
    ownerCategory: "keuangan",
    karyawanCategory: "keuangan",
  },
  // —— Pengaturan ——
  {
    id: "template",
    title: "Template Nota",
    desc: "Pesan nota, selesai & auto-kirim",
    roles: ["owner"],
    ownerCategory: "pengaturan",
  },
  {
    id: "pengaturan",
    title: "Pengaturan",
    desc: "Profil toko & operasional",
    roles: ["owner"],
    ownerCategory: "pengaturan",
  },
  {
    id: "notifikasi",
    title: "Notifikasi",
    desc: "Semua pemberitahuan",
    roles: ["owner"],
    ownerCategory: "pengaturan",
  },
  {
    id: "printer",
    title: "Printer",
    desc: "Pasangkan printer nota",
    roles: ["owner", "karyawan"],
    ownerCategory: "pengaturan",
    karyawanCategory: "pengaturan",
  },
];

export const OWNER_CATEGORY_LABEL: Record<OwnerMenuCategory, string> = {
  utama: "Utama",
  pelayanan: "Pelayanan",
  crm: "CRM",
  manajemen_sdm: "Manajemen SDM",
  manajemen_perlengkapan: "Manajemen Perlengkapan / Peralatan",
  keuangan: "Keuangan",
  pengaturan: "Pengaturan",
};

export const KARYAWAN_CATEGORY_LABEL: Record<KaryawanMenuCategory, string> = {
  utama: "Utama",
  layanan: "Layanan",
  keuangan: "Keuangan",
  personalia: "Personalia",
  pengaturan: "Pengaturan",
};

export const OWNER_CATEGORIES: OwnerMenuCategory[] = [
  "utama",
  "pelayanan",
  "crm",
  "manajemen_sdm",
  "manajemen_perlengkapan",
  "keuangan",
  "pengaturan",
];

export const KARYAWAN_CATEGORIES: KaryawanMenuCategory[] = [
  "utama",
  "layanan",
  "keuangan",
  "personalia",
  "pengaturan",
];

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
  return item.karyawanCategory ?? "layanan";
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
