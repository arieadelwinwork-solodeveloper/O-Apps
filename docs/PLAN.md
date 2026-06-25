# PLAN — O'Apps Service POS (Customizable)

Dokumen rencana pengembangan aplikasi **POS jasa yang bisa dikustomisasi**, hasil iterasi dari proyek `Laundry POS Cashier Dashboard`.

> Status: **12 fase selesai** — siap review & deployment.
> Sumber kebenaran security: bagian "Backend Security Requirements" di `README.md`.

---

## 1. Visi Produk

POS untuk bisnis **jasa** (laundry, cuci sepatu, servis, salon, dll) yang:

- **Customizable**: jenis jasa, tahap pengerjaan, komisi, dan template pesan diatur lewat data — bukan hardcode.
- **Multi-role**: OWNER & KARYAWAN dengan tampilan dan akses berbeda.
- **Multi-tenant-ready**: setiap data terikat `business_id` agar bisa berkembang jadi SaaS.
- **Mobile-first**: pertahankan gaya desain & tema `#001F5B` yang sudah ada.

---

## 2. Stack Teknologi

| Layer | Teknologi | Catatan |
|-------|-----------|---------|
| Frontend | React 18 + Vite + TypeScript | Sudah ada |
| Routing | React Router 7 | Sudah ada |
| UI | shadcn/ui (Radix + Tailwind v4) | Sudah ada, reuse |
| State/Data | TanStack Query (disarankan) + Supabase JS | Baru |
| Backend | Node.js + Express | Baru |
| Database | Supabase (PostgreSQL) + RLS | Baru |
| Auth | Supabase Auth (JWT) | Baru |
| Storage | Supabase Storage | Foto absensi, bukti bayar |
| Validasi | Zod (frontend + backend) | Wajib (Security PRD) |
| Keamanan | Helmet, express-rate-limit, CORS allowlist | Wajib (Security PRD) |

---

## 3. Arsitektur Folder (usulan)

```
Laundry POS Cashier Dashboard/
├─ src/                      # Frontend (sudah ada)
│  ├─ app/
│  │  ├─ views/              # Halaman per modul
│  │  ├─ components/         # UI (shadcn) + komponen bersama
│  │  ├─ features/           # (baru) logika per domain: kasir, payroll, dst
│  │  ├─ lib/                # (baru) supabase client, api client, helpers
│  │  ├─ hooks/              # (baru) react hooks (useAuth, useRole, dst)
│  │  ├─ types/              # (baru) tipe TS bersama
│  │  ├─ routes.tsx
│  │  └─ App.tsx
│  └─ styles/
├─ server/                   # (baru) Backend Express
│  ├─ src/
│  │  ├─ routes/             # endpoint per modul
│  │  ├─ middleware/         # auth, validate(zod), errorHandler, rateLimit
│  │  ├─ lib/                # supabase admin client, helpers
│  │  ├─ schemas/            # skema Zod
│  │  └─ index.ts
│  ├─ .env.example
│  └─ package.json
├─ supabase/
│  └─ migrations/            # (baru) SQL skema + RLS per fase
├─ docs/
│  ├─ PLAN.md                # dokumen ini
│  └─ SCHEMA.md              # skema database detail
└─ README.md                 # + Backend Security Requirements
```

---

## 4. Role & Matriks Hak Akses

Dua role utama: **OWNER** dan **KARYAWAN**. (Disiapkan kolom `role` agar mudah menambah `admin`/`manager` nanti.)

| Modul / Aksi | Owner | Karyawan |
|--------------|:-----:|:--------:|
| Kasir / buat transaksi | ✅ | ✅ |
| Tandai tahap pengerjaan selesai | ✅ | ✅ |
| Absensi (foto + GPS) | ✅ | ✅ |
| Input pengeluaran | ✅ | ✅ |
| Buka/tutup kas laci | ✅ | ✅ |
| Upload bukti bayar non-tunai | ✅ | ✅ |
| Lihat rangkuman omset/profit | ✅ | ❌ |
| Atur jenis jasa, tahap, komisi | ✅ | ❌ (read-only) |
| Atur template pesan | ✅ | ❌ |
| Kunci titik & radius absensi | ✅ | ❌ |
| Kelola penggajian | ✅ | ❌ |
| ACC / input pinjaman karyawan | ✅ | ajukan saja |
| Kelola membership | ✅ | gunakan saat transaksi |
| Kelola inventori & restock | ✅ | lihat / pakai |
| Lihat daftar & detail konsumen | ✅ | terbatas |
| Lihat performa karyawan | ✅ | data diri sendiri |
| Pusat notifikasi owner | ✅ | ❌ |

> Penegakan akses **dua lapis**: UI (sembunyikan menu) **dan** backend + RLS (deny by default). Sesuai Security PRD bagian 2.1 & 3.4.

---

## 5. Roadmap 12 Fase

Urutan berdasarkan dependensi. Setiap fase: implementasi → tes → commit → update checklist di bawah.

| Fase | Modul | Output utama | Depend |
|:----:|-------|--------------|--------|
| **A** | Fondasi: Auth & Role | Backend Express + Supabase, login, routing per role, menu owner vs karyawan | — |
| **B** | Customization Engine | CRUD jasa, tahap + komisi per tahap, template pesan | A |
| **C** | Kasir / Transaksi | Buat order, status bayar (lunas/DP/belakang), metode (QRIS/tunai/transfer), upload bukti non-tunai | A, B |
| **D** | Kas Laci & Prediksi | Buka/tutup shift, kas seharusnya, selisih kurang/lebih | C |
| **E** | Workflow & Komisi | Tandai tahap selesai → komisi tercatat; opsi pesan selesai | B, C |
| **F** | Nota, WhatsApp & Printer BT | Cetak struk, forward WA, pesan selesai kustom, pairing Bluetooth | C, E |
| **G** | Absensi (Foto + GPS) | Kunci titik/radius owner, absen foto + GPS dalam radius | A |
| **H** | Penggajian | Gaji + komisi + absensi, pinjaman (ajukan/acc/input), potongan langsung/cicil/berkala | E, G |
| **I** | Membership | Saldo / kuota jasa kustom, mutasi saat transaksi | C |
| **J** | Inventori | Stok kini/minimal, daftar perlu beli, notifikasi owner | A |
| **K** | CRM Konsumen | Daftar konsumen, lama berlangganan, jumlah transaksi, omset total | C |
| **L** | Dashboard Owner | Omset, pengeluaran, profit bersih, performa karyawan, pusat notifikasi | C–K |

---

## 6. Prinsip Teknis (wajib tiap fase)

1. **Security-first** sesuai `README.md`: RLS aktif untuk setiap tabel baru, `.env` + `.gitignore`, auth middleware di semua protected route, validasi Zod, error response generik, helmet, rate limit.
2. **Customizable by data**: jangan hardcode jenis jasa/tahap/pesan.
3. **Reuse UI** shadcn/ui yang ada, mobile-first, tema `#001F5B`.
4. **Type-safe**: tipe TS dibagikan di `src/app/types`.
5. **Setiap fase mandiri & teruji** sebelum lanjut; update checklist di bawah.

---

## 7. Checklist Progress

- [x] **Fase A** — Fondasi Auth & Role ✅ (backend Express, login, routing per role, menu owner vs karyawan)
- [x] **Fase B** — Customization Engine ✅ (CRUD jasa, tahap + komisi per tahap, template pesan nota/selesai)
- [x] **Fase C** — Kasir / Transaksi ✅ (buat order, status bayar lunas/DP/belakang, metode QRIS/tunai/transfer, upload bukti non-tunai, tracking status + WhatsApp)
- [x] **Fase D** — Kas Laci & Prediksi ✅ (buka/tutup shift, kas seharusnya, selisih kurang/lebih, pengeluaran tunai/non-tunai)
- [x] **Fase E** — Workflow & Komisi ✅ (snapshot tahap per order, tandai selesai → komisi tercatat + auto status, pesan selesai via template)
- [x] **Fase F** — Nota, WhatsApp & Printer BT ✅ (cetak struk ESC/POS via Web Bluetooth, forward WA, pesan selesai kustom, pairing & simpan printer)
- [x] **Fase G** — Absensi (Foto + GPS) ✅ (owner kunci titik & radius, absen masuk/pulang foto + GPS, validasi radius di server)
- [x] **Fase H** — Penggajian ✅ (slip gaji gaji+komisi+absensi−potongan, pinjaman ajukan/acc/input, potongan langsung/cicil/berkala)
- [x] **Fase I** — Membership ✅ (saldo/kuota jasa kustom, top-up owner, pakai saat kasir, mutasi tercatat)
- [x] **Fase J** — Inventori ✅ (stok kini/minimal, daftar perlu beli, mutasi masuk/keluar/koreksi, notifikasi stok menipis ke owner)
- [x] **Fase K** — CRM Konsumen ✅ (daftar + statistik, lama member, jumlah transaksi, omset total owner, detail & riwayat)
- [x] **Fase L** — Dashboard Owner ✅ (omset, pengeluaran, profit bersih, performa karyawan, pusat notifikasi, antrean real-time)

---

## 7b. Setup Fase A (cara menjalankan)

1. **Buat project Supabase**, lalu jalankan `supabase/migrations/0001_phase_a_foundation.sql` di SQL Editor.
2. **Frontend env**: salin `.env.example` → `.env`, isi `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.
3. **Backend env**: salin `server/.env.example` → `server/.env`, isi `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `CORS_ORIGINS`.
4. **Jalankan backend**: `cd server && npm install && npm run dev` (port 3001).
5. **Jalankan frontend**: `npm install && npm run dev` (port 5173).
6. **Buat owner pertama** (sekali saja) via backend:
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"owner@usaha.com\",\"password\":\"rahasia123\",\"fullName\":\"Budi\",\"businessName\":\"Laundry Budi\"}"
   ```
7. Login di frontend dengan akun owner tsb. Owner bisa menambah karyawan via `POST /api/users`.

> Endpoint Fase A: `POST /api/auth/register`, `GET/PATCH /api/auth/me`, `GET /api/users`, `POST /api/users` (owner).

## 7c. Setup Fase B (Customization Engine)

1. **Jalankan migration** `supabase/migrations/0004_phase_b_customization.sql` di Supabase SQL Editor (membuat tabel `services`, `service_stages`, `message_templates` + RLS).
2. Restart backend & frontend bila sedang berjalan (ada route baru).
3. Login sebagai **owner** → menu **Layanan** & **Template** muncul di dashboard (khusus owner).
   - **Layanan**: tambah jasa (nama, harga, satuan, aktif/nonaktif), lalu tambah tahap pengerjaan dengan komisi (nominal Rp atau persen %).
   - **Template**: buat template `nota`/`selesai` dengan variabel `{nama}`,`{layanan}`,`{total}`,`{estimasi}`,`{sisa}`; tandai salah satu sebagai default per jenis.
4. Karyawan: data ini menjadi sumber pilihan layanan di Kasir (Fase C) — read-only.

> Endpoint Fase B (owner-only untuk write, read semua anggota):
> `GET/POST /api/services`, `PATCH/DELETE /api/services/:id`,
> `POST /api/services/:id/stages`, `PATCH/DELETE /api/services/:id/stages/:stageId`,
> `GET/POST /api/templates`, `PATCH/DELETE /api/templates/:id`.

## 7d. Setup Fase C (Kasir / Transaksi)

1. **Jalankan migration** `supabase/migrations/0005_phase_c_orders.sql` di Supabase SQL Editor.
   - Membuat tabel `customers`, `orders`, `order_items` + enum (`payment_status`, `payment_method`, `work_status`) + RLS.
   - Membuat bucket Storage **`payment-proofs`** (publik) + policy upload untuk user terautentikasi (bukti bayar non-tunai).
2. Pastikan sudah ada **layanan aktif** (Fase B) — kasir mengambil harga dari sana.
3. Restart backend & frontend bila sedang berjalan (ada route baru).
4. Alur pakai:
   - **Kasir** (`/pemesanan`): isi pelanggan → pilih layanan + qty → status bayar (Lunas/DP/Bayar Nanti) → metode (Tunai/QRIS/Transfer). Non-tunai wajib unggah bukti. Total & harga dihitung di server (anti-tamper).
   - **Transaksi** (`/transaksi`): lihat daftar order, geser status pengerjaan (antri→proses→selesai→diambil), kirim info via WhatsApp (`wa.me`).

> Endpoint Fase C: `GET/POST /api/orders`, `GET /api/orders/:id`,
> `PATCH /api/orders/:id/status`, `PATCH /api/orders/:id/settle`,
> `DELETE /api/orders/:id` (owner), `GET /api/customers`.

## 7e. Setup Fase D (Kas Laci & Prediksi)

1. **Jalankan migration** `supabase/migrations/0006_phase_d_cash.sql` di Supabase SQL Editor.
   - Membuat tabel `cash_shifts` & `expenses` + enum `cash_shift_status` + RLS.
   - Hanya boleh ada **satu shift terbuka** per bisnis (unique partial index).
2. Restart backend & frontend (ada route baru).
3. Alur pakai:
   - **Kas Laci** (`/kas`): Buka kas (input modal awal) → kartu "Kas Seharusnya" memprediksi `modal + tunai masuk − tunai keluar` secara real-time → Tutup kas (input uang fisik), sistem hitung selisih (kurang/lebih/pas).
   - **Pengeluaran** (`/pengeluaran`): catat beban; sumber **Tunai** akan mengurangi kas laci pada shift yang terbuka. Hapus pengeluaran hanya owner.
   - Pembayaran **tunai** di Kasir otomatis dikaitkan ke shift terbuka → memengaruhi prediksi kas.

> Endpoint Fase D: `GET /api/cash-shifts/current`, `GET /api/cash-shifts`,
> `POST /api/cash-shifts/open`, `POST /api/cash-shifts/close`,
> `GET/POST /api/expenses`, `DELETE /api/expenses/:id` (owner).

## 7f. Setup Fase E (Workflow & Komisi)

1. **Jalankan migration** `supabase/migrations/0007_phase_e_workflow.sql` di Supabase SQL Editor.
   - Membuat tabel `order_stages` (snapshot tahap per order) & `commissions` + enum `order_stage_status` + RLS.
2. Restart backend & frontend.
3. **Penting**: tahap pengerjaan hanya ter-snapshot untuk order **baru** (dibuat setelah layanan punya tahap di Fase B). Order lama tidak punya tahap.
4. Alur pakai:
   - Di **Transaksi** (`/transaksi`) → tombol **Detail** membuka order.
   - Di detail: tandai tiap **tahap selesai** → komisi otomatis tercatat untuk karyawan yang menyelesaikan (nominal/persen dari basis subtotal layanan). Status order maju otomatis (proses → selesai).
   - Setelah semua tahap selesai → tombol **Pesan Selesai** aktif (pakai template default Fase B, variabel terisi) kirim via WhatsApp.

> Endpoint Fase E: `PATCH /api/orders/:id/stages/:stageId/complete`,
> `GET /api/commissions`, `GET /api/commissions/summary`.
> (`GET /api/orders/:id` kini menyertakan `stages`.)

## 7g. Setup Fase F (Nota, WhatsApp & Printer Bluetooth)

1. **Jalankan migration** `supabase/migrations/0008_phase_f_printers.sql` (tabel `print_devices` + RLS per-user).
2. Restart backend & frontend.
3. **Printer** (`/printer`): klik **Pasangkan** untuk pilih printer thermal Bluetooth → otomatis tersimpan → **Tes Cetak**.
   - Web Bluetooth hanya jalan di **Chrome Android / desktop** via **HTTPS atau localhost** (iOS Safari belum mendukung). Bila tak didukung, tetap pakai WhatsApp.
4. Di **Detail transaksi** (`/transaksi/:id`):
   - **Cetak Nota (Bluetooth)** → struk ESC/POS 32 kolom (header nama bisnis, item, total, status bayar).
   - **Nota** / **Pesan Selesai** → kirim teks via WhatsApp (template Fase B, variabel terisi).

> Endpoint Fase F: `GET /api/business`, `GET/POST /api/print-devices`,
> `DELETE /api/print-devices/:id`. (Cetak struk & WA berjalan di sisi klien.)

## 7h. Setup Fase G (Absensi Foto + GPS)

1. **Jalankan migration** `supabase/migrations/0009_phase_g_attendance.sql` (tabel `attendances` + RLS + bucket `attendance-photos`). Titik/radius pakai kolom di `businesses` (sudah ada sejak Fase A).
2. Restart backend & frontend.
3. **Owner** buka **Absensi** (`/absensi`) → bagian "Titik Absensi" → atur radius → **Kunci Titik di Lokasi Saya** (berdiri di lokasi usaha; butuh izin GPS).
4. **Karyawan/Owner** absen: **Ambil Foto di Tempat** (kamera depan) → **Absen Masuk/Pulang**. Server menghitung jarak (haversine) ke titik kunci; di luar radius ditolak.
   - Butuh **HTTPS atau localhost** agar kamera & GPS aktif di browser.

> Endpoint Fase G: `GET /api/attendance/today`, `GET /api/attendance`,
> `POST /api/attendance`, `PATCH /api/business` (owner: profil + titik/radius).

## 7i. Setup Fase H (Penggajian)

1. **Jalankan migration** `supabase/migrations/0010_phase_h_payroll.sql` (tabel `loans`, `payrolls` + RLS).
2. Restart backend & frontend.
3. **Owner** (`/penggajian`):
   - Atur **gaji pokok** tiap karyawan (bagian "Gaji Pokok Karyawan").
   - Pilih periode (bulan) → **Hitung Ulang Gaji** → sistem ambil gaji pokok (`users.base_salary`), komisi (`commissions`), hari hadir (`attendances` masuk valid), potongan pinjaman (`loans` disetujui).
   - **Finalkan** atau **Tandai Dibayar** → potongan pinjaman diterapkan ke `remaining` (lunas otomatis bila habis).
   - Setujui pengajuan pinjaman karyawan (atur mode: sekaligus/cicil/berkala) atau **Input** pinjaman/hutang/kerugian langsung.
4. **Karyawan**: lihat slip gaji sendiri, **Ajukan Pinjaman**.

> Rumus: `net_pay = base_salary + commission_total − deductions`
>
> Endpoint Fase H: `GET/POST /api/loans`, `PATCH /api/loans/:id` (owner),
> `GET /api/payrolls`, `POST /api/payrolls/generate`, `PATCH /api/payrolls/:id` (owner),
> `PATCH /api/users/:id` (owner: gaji pokok). `POST /api/users` mendukung `baseSalary`.

## 7j. Setup Fase I (Membership)

1. **Jalankan migration** `supabase/migrations/0011_phase_i_membership.sql` (tabel `memberships`, `membership_transactions` + RLS).
2. Restart backend & frontend.
3. **Owner** buka **Membership** (`/membership`):
   - **Buat Membership** untuk pelanggan: tipe **Saldo** (rupiah) atau **Kuota** (per layanan).
   - **Top-up** saldo/kuota kapan saja; riwayat mutasi tercatat.
4. **Kasir** (`/pemesanan`): isi nomor HP pelanggan yang sudah punya membership → bagian **Membership** muncul.
   - Pakai **saldo** (potong tagihan rupiah) dan/atau **kuota** (potong qty layanan tertentu).
   - Tagihan akhir = total layanan − potongan membership; pembayaran dihitung dari sisa tagihan.

> Rumus: `net_payable = total − membership_used` (kuota dihitung senilai harga layanan × qty).
>
> Endpoint Fase I: `GET /api/memberships` (?customerId= / ?phone=),
> `POST /api/memberships` (owner), `POST /api/memberships/:id/topup` (owner),
> `GET /api/memberships/:id/transactions`.
> Order: `POST /api/orders` mendukung `membershipSaldoAmount`, `membershipQuotaUsages`.

## 7k. Setup Fase J (Inventori)

1. **Jalankan migration** `supabase/migrations/0012_phase_j_inventory.sql` (tabel `inventory_items`, `inventory_movements`, `notifications` + RLS).
2. Restart backend & frontend.
3. **Owner** buka **Inventori** (`/inventori`):
   - **Tambah Barang** (nama, satuan, stok minimal, stok awal).
   - **Restock** (masuk), **Koreksi** (set stok absolut), atur **Min Stok**.
4. **Karyawan**: lihat stok, **Pakai** (keluar) saat memakai bahan.
5. Bagian **Perlu Dibeli** otomatis menampilkan barang dengan `stok ≤ min`. Owner mendapat notifikasi `stok_menipis` di database (pusat notifikasi UI menyusul Fase L).

> Mutasi: `masuk` (+qty), `keluar` (−qty), `adjust` (set stok ke qty).
>
> Endpoint Fase J: `GET /api/inventory` (?lowStock=1),
> `POST /api/inventory` (owner), `PATCH/DELETE /api/inventory/:id` (owner),
> `GET /api/inventory/:id/movements`, `POST /api/inventory/:id/movements`.

## 7l. Setup Fase K (CRM Konsumen)

1. **Jalankan migration** `supabase/migrations/0013_phase_k_crm.sql` (view `customer_stats`).
2. Restart backend & frontend.
3. Buka **Konsumen** (`/konsumen`):
   - **Owner**: lihat omset total, urutkan per omset/transaksi/terbaru, detail lengkap + membership.
   - **Karyawan**: daftar terbatas (tanpa omset), bisa lihat riwayat transaksi tanpa nominal.
4. Klik konsumen → detail, hubungi via WhatsApp, buka transaksi terkait.

> Endpoint Fase K: `GET /api/customers/stats` (?q= & ?sort=omset|transaksi|terbaru),
> `GET /api/customers/:id` (detail + orders + memberships).
> `GET /api/customers` tetap untuk autocomplete kasir.

## 7m. Setup Fase L (Dashboard Owner)

1. Pastikan migration **0012** sudah dijalankan (tabel `notifications` untuk pusat notifikasi).
2. Restart backend & frontend.
3. **Owner** buka **Rangkuman** (`/keuangan`):
   - Pilih periode **Hari Ini / Minggu / Bulan** → omset, transaksi, pertumbuhan vs periode sebelumnya.
   - **Profit bersih** = omset − pengeluaran − komisi karyawan.
   - **Performa karyawan**: komisi + hari hadir dalam periode.
   - **Notifikasi** (ikon bell): stok menipis dari Fase J, dll. — tandai dibaca.
4. **Beranda** (`/`): widget **Antrean Hari Ini** kini data nyata (semua role).

> Endpoint Fase L: `GET /api/dashboard/summary?range=today|week|month` (owner),
> `GET /api/dashboard/queue`, `GET /api/notifications`,
> `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.

## 8. Catatan Migrasi dari Kode Saat Ini

- View existing (`Dashboard`, `OrderView`, `TrackingView`, `ExpensesView`, `FinanceView`) — **semua sudah terhubung data nyata** kecuali bagian opsional lanjutan.
- `FinanceView` = **Dashboard Owner (Fase L)** dengan omset, profit, performa, notifikasi.
