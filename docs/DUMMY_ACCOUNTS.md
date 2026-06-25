# Akun Dummy (Development)

Akun untuk testing login owner vs karyawan. **Jangan dipakai di production.**

| Role | Email | Password | Nama |
|------|-------|----------|------|
| **Owner** | `pos-owner@example.com` | `DemoOwner123` | Budi Owner |
| **Karyawan** | `pos-kasir@example.com` | `DemoKasir123` | Siti Kasir |

Bisnis demo: **Laundry Demo**

## Cara membuat / reset akun

1. Pastikan migration **0001** (dan **0002** jika pakai halaman Sign Up) sudah dijalankan di Supabase SQL Editor.
2. Isi **`SUPABASE_SERVICE_KEY`** di `server/.env`.
3. Jalankan:

```bash
npm run seed:dummy
```

Script idempotent — aman dijalankan ulang (melewati akun yang sudah ada).

## Data demo dashboard karyawan

Isi rangkuman harian (absensi, transaksi, pengeluaran, uang laci, aktivitas) di Supabase:

```bash
npm run seed:dashboard
```

Atau di folder `server`: double-click **`seed-dashboard.bat`**

- Butuh akun dummy sudah ada (`npm run seed:dummy`)
- Butuh backend jalan saat login & lihat dashboard
- Jalankan ulang dengan `--force` untuk reset data demo order

Contoh angka setelah seed:

| Kartu | Nilai demo |
|-------|------------|
| Absensi bulan ini | ~14 / 24 |
| Transaksi hari ini | 3 |
| Pengeluaran | Rp 75.000 |
| Uang laci | Rp 1.250.000 |
| Perlu diselesaikan | 4 (2 terlambat) |
| Proses hari ini | Cuci 2×, Setrika 3×, Packing 1× |

## Login

Buka http://localhost:5181/login dan masuk dengan salah satu akun di atas.

- **Owner** → menu lengkap termasuk Rangkuman
- **Karyawan** → Kasir, Absensi, Pengeluaran, Transaksi

## Daftar akun baru (Sign Up)

Owner bisa mendaftar lewat **http://localhost:5181/signup** (butuh migration **0002**).

Di Supabase → Authentication → Providers, nonaktifkan **Confirm email** untuk development agar langsung bisa login setelah daftar.
