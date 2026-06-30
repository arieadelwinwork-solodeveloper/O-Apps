# PLAN3 — Fitur SaaS Lanjutan & Pelengkap

Dokumen rencana lanjutan O'Apps Service POS. Fokus: fitur-fitur krusial yang
belum ada berdasarkan audit UI/UX pada 1 Juli 2026.

> Semua fitur dievaluasi dari sisi **UI/UX** dahulu; backend diintegrasikan
> belakangan. Arsitektur tetap **online-only**.

---

## 1. Ringkasan Temuan Audit

Dari 19 halaman & 14 modul yang sudah ada, terdapat **8 celah fitur krusial**
yang perlu diisi agar aplikasi dapat berjalan secara mandiri oleh owner baru
tanpa bantuan teknis.

---

## 2. Fitur yang Perlu Ditambahkan

### Fase N — Manajemen Karyawan (UI)

**Prioritas: Tinggi**

API sudah tersedia (`GET/POST/PATCH /api/users`) namun belum ada halaman view
untuk mengelola karyawan. Owner tidak bisa menambah atau mengedit akun
karyawan dari UI.

**Halaman baru:** `/karyawan` (owner-only)

Konten:
- Daftar karyawan aktif + status (aktif / nonaktif)
- Tambah karyawan (nama, email, password awal, role)
- Edit karyawan (nama, role, status aktif)
- Kartu ringkasan: total gaji bulan ini & saldo pinjaman per karyawan (link
  ke `/penggajian`)

**Tipe data baru:**
```ts
interface EmployeeListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
}
```

**Endpoint tambahan:** `PATCH /api/users/:id/status` (aktifkan / nonaktifkan)

---

### Fase O — Pengaturan Bisnis (UI)

**Prioritas: Tinggi**

`PATCH /api/business` sudah ada, `SetupRequired` komponen sudah ada, namun
tidak ada halaman `/pengaturan` untuk owner mengubah data bisnisnya secara
mandiri.

**Halaman baru:** `/pengaturan` (owner-only)

Konten:
- **Profil Toko**: nama bisnis, logo, alamat, nomor WhatsApp bisnis
- **Operasional**: jam buka–tutup, hari kerja penuh (target absensi)
- **Dashboard**: radius absensi GPS, visibilitas uang laci (semua / tertentu),
  daftar user yang boleh lihat kas
- **Zona bahaya**: hapus data test, export semua data

---

### Fase P — Diskon & Promo per Transaksi

**Prioritas: Menengah**

Kasir belum punya fitur diskon manual. Diperlukan untuk promosi harian,
pelanggan VIP, atau negosiasi harga.

**Penambahan di `OrderView` (kasir):**
- Field "Diskon" di ringkasan order: nominal (Rp) atau persen (%)
- Toggle antar mode nominal/persen
- Subtotal → Diskon → Total ditampilkan secara bertahap
- Catatan diskon tersimpan di order untuk laporan

**Tipe data:**
```ts
// Tambahan di Order
discountType: "nominal" | "percent" | null;
discountValue: number;       // nominal Rp atau persen 0–100
discountAmount: number;      // nominal yang dipotong (hasil hitung)
```

**Skema DB:** tambah kolom `discount_type`, `discount_value`, `discount_amount`
di tabel `orders`.

---

### Fase Q — Export Laporan (Excel / PDF)

**Prioritas: Menengah**

`ReportsView` hanya untuk laporan operasional naratif. Owner tidak bisa
mengekspor data transaksi/keuangan untuk keperluan akuntansi.

**Penambahan di `ReportsView` atau `FinanceView`:**
- Tombol "Export Excel" untuk rekap transaksi periode tertentu
- Tombol "Export PDF" untuk laporan keuangan (omset, pengeluaran, laba)
- Export data absensi & gaji karyawan per bulan

**Library yang dipertimbangkan:** `xlsx` (SheetJS) untuk Excel,
`@react-pdf/renderer` untuk PDF — dijalankan di sisi client agar tidak
membebani server.

---

### Fase R — Notification Center

**Prioritas: Menengah**

`NotificationBell` sudah ada di dashboard owner, API notifikasi juga ada
(`GET /api/notifications`), namun tidak ada halaman daftar notifikasi.
Notifikasi lama tidak bisa dilihat ulang.

**Halaman baru:** `/notifikasi` (owner-only) atau bottom sheet dari bell icon

Konten:
- Daftar semua notifikasi dengan badge belum dibaca
- Filter: semua / belum dibaca / tipe (stok, laporan, gaji, dll.)
- Tandai semua sudah dibaca
- Klik notifikasi → navigasi ke konteks terkait (mis. inventori menipis →
  `/inventori`)

---

### Fase S — Target Omset & KPI

**Prioritas: Menengah**

Dashboard owner sudah menampilkan omset & forecast, namun tidak ada fitur
penetapan target sehingga owner tidak tahu apakah performa hari ini
sudah sesuai harapan.

**Penambahan di `OwnerSummary` & `FinanceView`:**
- Input target omset bulanan (disimpan di `business_settings`)
- Progress bar "Pencapaian Bulan Ini: Rp X / Rp Y (Z%)" di dashboard
- Indikator warna: hijau ≥ 100%, kuning 70–99%, merah < 70%
- Target transaksi harian (opsional)

**Skema DB:** kolom `monthly_revenue_target` di `business_settings` atau
tabel `business_targets` baru.

---

### Fase T — Onboarding / Setup Wizard

**Prioritas: SaaS — Penting untuk retensi pengguna baru**

Saat owner mendaftar, langsung masuk ke dashboard kosong tanpa panduan.
Ini meningkatkan churn pengguna baru yang tidak tahu harus mulai dari mana.

**Flow wizard (multi-langkah, bisa dilewati):**

```
Langkah 1 → Profil Toko (nama, logo, WA)
Langkah 2 → Tambah Layanan Pertama (nama, harga, unit)
Langkah 3 → Undang Karyawan (email + role) — bisa skip
Langkah 4 → Buka Kas Pertama — bisa skip
Langkah 5 → Selesai 🎉 (shortcut ke kasir)
```

**Implementasi:**
- Komponen `OnboardingWizard.tsx` muncul di beranda jika bisnis belum punya
  layanan & karyawan
- Progress disimpan di `business_settings.onboarding_step`
- Owner bisa tutup & lanjutkan nanti (progress tersimpan)
- Setelah semua langkah selesai, wizard tidak muncul lagi

---

### Fase U — Billing & Subscription SaaS

**Prioritas: SaaS — Core model bisnis**

Tidak ada mekanisme pengelolaan langganan bisnis ke platform O'Apps. Tanpa
ini, model bisnis SaaS tidak bisa berjalan secara otomatis.

**Halaman baru:** `/langganan` (owner-only)

Konten:
- Status berlangganan saat ini (Aktif / Trial / Expired)
- Sisa hari trial atau tanggal jatuh tempo
- Paket yang digunakan (mis. Starter, Pro, Business) + fitur masing-masing
- Tombol "Perpanjang / Upgrade"
- Riwayat pembayaran langganan

**Batasan per paket (contoh):**
| Fitur | Starter | Pro | Business |
|---|---|---|---|
| Karyawan | 2 | 5 | Tidak terbatas |
| Transaksi/bulan | 200 | 1.000 | Tidak terbatas |
| Inventori item | 50 | 200 | Tidak terbatas |
| Export laporan | ✗ | ✓ | ✓ |
| Multi-outlet | ✗ | ✗ | ✓ |

**Skema DB:** tabel `subscriptions` (business_id, plan, status, expires_at,
trial_ends_at) + tabel `subscription_payments`.

**Notifikasi otomatis:** 7 hari & 1 hari sebelum jatuh tempo via bell + WA.

---

## 3. Urutan Eksekusi yang Disarankan

| Urutan | Fase | Alasan |
|---|---|---|
| 1 | **N** — Manajemen Karyawan UI | Paling mendesak; API siap, tinggal UI |
| 2 | **O** — Pengaturan Bisnis UI | Fundamental; owner harus bisa ubah data sendiri |
| 3 | **T** — Onboarding Wizard | Retensi user baru; bergantung pada N & O |
| 4 | **P** — Diskon per Transaksi | Kebutuhan operasional harian |
| 5 | **S** — Target Omset & KPI | Motivasi & monitoring owner |
| 6 | **R** — Notification Center | UX notifikasi tuntas |
| 7 | **Q** — Export Laporan | Nilai tambah untuk owner yang lebih serius |
| 8 | **U** — Billing & Subscription | Terakhir; butuh infrastruktur payment gateway |

---

## 4. Catatan / Risiko

- **Manajemen Karyawan**: reset password perlu flow khusus (email OTP atau
  owner yang generate password sementara).
- **Diskon**: perlu audit di laporan keuangan — diskon harus dikurangkan dari
  omset, bukan dicatat sebagai pengeluaran.
- **Export Laporan**: file besar bisa lambat di client; pertimbangkan batasi
  range maksimal 3 bulan per export.
- **Billing**: jika menggunakan Midtrans/Xendit, butuh webhook server untuk
  konfirmasi pembayaran otomatis.
- **Onboarding**: jangan paksa — selalu sediakan tombol "Lewati, saya sudah
  tahu" agar pengguna lama yang reset akun tidak terganggu.
