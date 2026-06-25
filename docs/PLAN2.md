# PLAN2 — Peningkatan UI/UX & Dashboard Karyawan

Dokumen rencana lanjutan untuk O'Apps Service POS. Fokus: mempercantik UI/UX,
menambah **rangkuman dashboard karyawan**, dan menyederhanakan navigasi.

> Arsitektur: **online-only** (semua aksi langsung ke server, sumber kebenaran
> tunggal). Mode offline **tidak** dipakai demi menghindari bentrok data.

---

## 1. Tujuan

UI **sederhana, berkelas, lega, ringan & responsif**; dashboard karyawan punya
rangkuman kerja harian; navigasi menu lewat **dropdown → bottom sheet**.

---

## 2. Keputusan Final

1. **Tanpa omset/laba** di sisi karyawan (informasi confidential).
2. **Prinsip visual**: satu warna aksen (`#001F5B`) + netral slate; warna hanya
   untuk makna (mis. merah = terlambat); standarisasi radius & shadow;
   perbanyak whitespace + judul section.
3. **Navigasi**: dropdown (`ui/select.tsx`) → konten dibuka di **bottom sheet
   hampir full-height** untuk **semua menu** (seragam & fokus). Komponen tetap
   **file terpisah**, dipanggil **`React.lazy`**, pilihan **disinkron ke URL**
   (`/?m=...`).
4. **Uang laci = opsi izin owner**: tampil ke **semua karyawan** atau **orang
   tertentu** saja.
5. **Target hari kerja** diturunkan dari **setup "hari kerja penuh" owner**
   (tidak hardcode).
6. **Online-only**: tidak ada penyimpanan tulisan lokal / sync. Jika internet
   mati, aplikasi menampilkan indikator "tidak ada koneksi" dan menunggu.

---

## 3. Rancangan Dashboard Karyawan (rangkuman harian)

- **Absensi** — hari masuk / target hari kerja (target dari setup owner).
- **Proses dikerjakan hari ini** — Aktivitas A = 1x, B = 2x, dst. (dari tahap
  layanan owner / `service_stages`).
- **Perlu diselesaikan** — jumlah transaksi belum selesai + ⚠ yang **terlambat**
  (lewat `orders.estimated_done_at`).
- **Jumlah transaksi hari ini** — count saja (**tanpa rupiah**).
- **Pengeluaran** — total beban hari ini.
- **Uang laci** — kas seharusnya shift berjalan, **hanya jika user diizinkan**.

---

## 4. Navigasi (Dropdown → Sheet)

- Dropdown dikelompokkan per kategori (Operasional / Pengaturan, sesuai role).
- Konten menu dibuka di **sheet** (`ui/sheet.tsx` / `ui/drawer.tsx`) + mini-header
  (nama menu + tombol tutup).
- **`React.lazy` + `Suspense`** → hanya menu terpilih yang di-download (ringan).
- Tiap view diberi prop `embedded` (sembunyikan header back bawaan, sesuaikan
  padding) agar bisa dipakai di dalam sheet.
- **Sinkron URL** (`/?m=transaksi`) agar refresh/back/deep-link tetap wajar.
- Dashboard + rangkuman tetap selalu tampil di beranda.

---

## 5. Strategi "Ringan & Cepat" (online-safe)

Tanpa menyimpan tulisan lokal, jadi tidak ada potensi konflik:

- **`React.lazy` per menu** → bundle kecil, app cepat dibuka.
- **(Opsional) TanStack Query** untuk data **baca** → cache di memori + selalu
  revalidate ke server (tidak menyimpan perubahan lokal).
- **Skeleton loading** (`ui/skeleton.tsx`) saat menunggu server.
- **Indikator koneksi** yang jelas bila internet putus.

---

## 6. Tambahan Skema / Backend

- **Setup "hari kerja penuh" owner** (jadwal/target hari) → dasar perhitungan
  absensi "masuk / seharusnya". **Dependensi**: dibuat lebih dulu/bersamaan.
- **Setting izin uang laci** (semua / daftar user tertentu).
- **Endpoint baru** `GET /api/dashboard/me-today` (boleh diakses karyawan,
  **tanpa nominal omset**; kas laci hanya jika diizinkan):
  - absensi (masuk / target),
  - aktivitas per tahap hari ini,
  - transaksi belum selesai + terlambat,
  - count transaksi hari ini,
  - pengeluaran hari ini,
  - uang laci (bila diizinkan).

---

## 7. Sudah Tersedia (tak perlu dibuat ulang)

`orders.estimated_done_at` (deteksi terlambat) · `cash_shifts.expected_cash`
(uang laci) · `expenses` · `attendances` · `order_stages` (completed_by/at) ·
`service_stages` (tahap customizable) · `ui/select|sheet|drawer|skeleton`.

---

## 8. Urutan Eksekusi

1. **Mockup visual** dashboard karyawan + dropdown → sheet.
2. **Standarisasi token visual** (warna/radius/shadow) + judul section.
3. **Setup hari kerja owner** + **setting izin uang laci**.
4. **`EmployeeSummary`** + endpoint **`me-today`**.
5. **Dropdown → sheet** + **`React.lazy`** + sinkron URL + prop `embedded`.
6. **(Opsional)** TanStack Query untuk baca + skeleton + indikator koneksi.

---

## 9. Catatan / Risiko

- **Online-only**: bila internet mati, aplikasi tidak bisa dipakai sampai
  koneksi kembali (trade-off yang diterima demi konsistensi data).
- Target absensi akurat **hanya setelah** setup hari kerja owner tersedia.
- Endpoint `me-today` **wajib** menyaring data finansial sesuai izin (tanpa
  omset; kas laci sesuai setting).
