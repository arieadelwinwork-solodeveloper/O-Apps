# SCHEMA — O'Apps Service POS

Skema database (Supabase / PostgreSQL) untuk seluruh modul. Semua tabel:

- Punya `id uuid primary key default gen_random_uuid()`.
- Punya `business_id uuid` (multi-tenant) kecuali `businesses` sendiri.
- Punya `created_at timestamptz default now()` (dan `updated_at` bila relevan).
- **RLS WAJIB aktif.** Pola dasar: user hanya mengakses baris dengan `business_id` yang sama dengan bisnisnya; aksi tertentu dibatasi role `owner`.

> Konvensi uang: simpan dalam **rupiah bulat** (`bigint`, tanpa desimal).
> Konvensi enum: dibuat sebagai PostgreSQL `enum` atau kolom `text` + `CHECK`.

---

## 0. Helper: relasi user ↔ business

```sql
-- Fungsi bantu RLS: business_id milik user yang login
create or replace function auth_business_id()
returns uuid language sql stable as $$
  select business_id from public.users where id = auth.uid()
$$;

-- Fungsi bantu RLS: apakah user yang login adalah owner
create or replace function auth_is_owner()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.users
    where id = auth.uid() and role = 'owner'
  )
$$;
```

Pola RLS standar yang dipakai berulang (contoh tabel `X`):

```sql
alter table public.X enable row level security;

-- Semua anggota bisnis boleh baca
create policy "X read same business" on public.X
  for select using (business_id = auth_business_id());

-- Hanya owner boleh tulis (sesuaikan per tabel)
create policy "X write owner" on public.X
  for all using (business_id = auth_business_id() and auth_is_owner())
  with check (business_id = auth_business_id() and auth_is_owner());
```

---

## FASE A — Fondasi

### businesses
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| name | text | nama usaha |
| owner_id | uuid | user owner utama |
| address | text | |
| phone | text | |
| attendance_lat | double precision | titik absensi (Fase G) |
| attendance_lng | double precision | |
| attendance_radius_m | int | radius meter (Fase G) |
| created_at | timestamptz | |

### users
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | = `auth.users.id` |
| business_id | uuid FK → businesses | |
| full_name | text | |
| role | enum(`owner`,`karyawan`) | default `karyawan` |
| phone | text | |
| base_salary | bigint | gaji pokok periode (Fase H) |
| is_active | bool | default true |
| created_at | timestamptz | |

RLS: user baca anggota bisnis sendiri; update profil sendiri; owner kelola semua user di bisnisnya.

---

## FASE B — Customization Engine

### services
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | mis. "Cuci Reguler" |
| price | bigint | harga per unit |
| unit | text | mis. "kg", "pcs", "pasang" |
| is_active | bool | |

### service_stages
Tahap pengerjaan per jasa + komisi.
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| service_id | uuid FK → services | |
| name | text | mis. "Cuci", "Setrika", "Packing" |
| sort_order | int | urutan tahap |
| commission_type | enum(`nominal`,`percent`) | |
| commission_value | bigint | nominal (rupiah) atau persen |

### message_templates
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| type | enum(`nota`,`selesai`) | |
| name | text | |
| body | text | mendukung variabel `{nama}`,`{layanan}`,`{total}`,`{estimasi}`,`{sisa}` |
| is_default | bool | |

RLS: read semua anggota; write hanya owner.

---

## FASE C — Kasir / Transaksi

### customers
(detail lengkap dipakai Fase K)
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| phone | text | nomor WhatsApp |
| created_at | timestamptz | "member sejak" |

### orders
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| customer_id | uuid FK → customers | |
| cashier_id | uuid FK → users | yang membuat |
| order_no | text | nomor nota |
| total | bigint | total tagihan |
| payment_status | enum(`lunas_depan`,`dp`,`bayar_belakang`) | |
| paid_amount | bigint | yang sudah dibayar |
| remaining_amount | bigint | sisa |
| payment_method | enum(`qris`,`tunai`,`transfer`) | |
| proof_url | text | bukti bayar non-tunai (Storage) |
| work_status | enum(`antri`,`proses`,`selesai`,`diambil`) | |
| membership_used | bigint | dipakai dari membership (Fase I) |
| cash_shift_id | uuid FK → cash_shifts | jika tunai (Fase D) |
| estimated_done_at | timestamptz | |
| created_at | timestamptz | |

### order_items
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| service_id | uuid FK → services | |
| qty | numeric | |
| unit_price | bigint | snapshot harga |
| subtotal | bigint | |

### order_stages
Instansi tahap pengerjaan per order (Fase E).
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| service_stage_id | uuid FK → service_stages | |
| name | text | snapshot nama tahap |
| sort_order | int | |
| status | enum(`belum`,`selesai`) | |
| completed_by | uuid FK → users | karyawan penyelesai |
| completed_at | timestamptz | |
| commission_amount | bigint | snapshot komisi saat selesai |

RLS: read/insert/update untuk anggota bisnis (kasir & pengerjaan). Hapus order hanya owner.
**Aturan bukti bayar (Security + bisnis):** jika `payment_method <> 'tunai'` maka `proof_url` wajib terisi (validasi Zod di backend, bukan hanya frontend).

---

## FASE D — Kas Laci

### cash_shifts
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| opened_by | uuid FK → users | |
| opening_cash | bigint | modal awal laci |
| expected_cash | bigint | dihitung sistem |
| closing_cash | bigint | hitungan fisik saat tutup |
| variance | bigint | closing − expected (− kurang / + lebih) |
| status | enum(`open`,`closed`) | |
| opened_at | timestamptz | |
| closed_at | timestamptz | |

`expected_cash = opening_cash + Σ(transaksi tunai) − Σ(pengeluaran tunai)` selama shift.

---

## FASE E — Workflow & Komisi

### commissions
Akumulasi komisi (sumber kebenaran untuk penggajian).
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| user_id | uuid FK → users | penerima |
| order_stage_id | uuid FK → order_stages | |
| amount | bigint | |
| period | text | mis. `2026-06` (untuk payroll) |
| created_at | timestamptz | |

RLS: karyawan baca komisi sendiri; owner baca semua.

---

## FASE F — Nota & Notifikasi

Tidak butuh tabel inti baru. Opsional:

### print_devices
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| user_id | uuid FK | pemilik device |
| device_name | text | nama printer BT |
| device_id | text | id Web Bluetooth |

WhatsApp: pakai `https://wa.me/<phone>?text=<encoded>` (klik-kirim) di tahap awal; integrasi WA Business API menyusul bila perlu.

---

## FASE G — Absensi

### attendances
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| user_id | uuid FK → users | |
| type | enum(`masuk`,`pulang`) | |
| photo_url | text | Storage |
| lat | double precision | |
| lng | double precision | |
| distance_m | int | jarak ke titik kunci |
| is_valid | bool | dalam radius? |
| created_at | timestamptz | |

Validasi radius dihitung di **backend** (jangan percaya frontend).

---

## FASE H — Penggajian

### loans
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| user_id | uuid FK → users | |
| type | enum(`pinjaman`,`hutang`,`kerugian`) | |
| amount | bigint | pokok |
| remaining | bigint | sisa |
| status | enum(`diajukan`,`disetujui`,`ditolak`,`lunas`) | |
| deduction_mode | enum(`langsung`,`cicil`,`berkala`) | |
| deduction_amount | bigint | nominal potong per periode (cicil/berkala) |
| requested_by | uuid FK → users | |
| approved_by | uuid FK → users | owner |
| created_at | timestamptz | |

### payrolls
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| user_id | uuid FK → users | |
| period | text | `2026-06` |
| base_salary | bigint | snapshot |
| commission_total | bigint | dari `commissions` |
| attendance_days | int | dari `attendances` |
| deductions | bigint | dari `loans` |
| net_pay | bigint | base + komisi − potongan |
| status | enum(`draft`,`final`,`dibayar`) | |
| created_at | timestamptz | |

RLS: karyawan baca slip sendiri; owner kelola semua. Pengajuan pinjaman: karyawan insert (`status='diajukan'`); hanya owner ubah status & `deduction_*`.

---

## FASE I — Membership

### memberships
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| customer_id | uuid FK → customers | |
| type | enum(`saldo`,`kuota`) | |
| balance | bigint | saldo rupiah (jika `saldo`) |
| quota_service_id | uuid FK → services | jasa yang dikuota (jika `kuota`) |
| quota_remaining | int | sisa kuota |
| created_at | timestamptz | |

### membership_transactions
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| membership_id | uuid FK → memberships | |
| order_id | uuid FK → orders | nullable (topup tanpa order) |
| change_type | enum(`topup`,`pakai`,`refund`) | |
| amount | bigint | + / − |
| created_at | timestamptz | |

---

## FASE J — Inventori

### inventory_items
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| unit | text | |
| current_stock | numeric | |
| min_stock | numeric | ambang notifikasi |
| last_restock_at | timestamptz | |
| updated_at | timestamptz | |

### inventory_movements
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| item_id | uuid FK → inventory_items | |
| change_type | enum(`masuk`,`keluar`,`adjust`) | |
| qty | numeric | |
| note | text | |
| created_at | timestamptz | |

Trigger/aturan: bila `current_stock <= min_stock` → buat baris di `notifications` untuk owner.

---

## FASE K — CRM Konsumen

Memanfaatkan `customers` + agregasi `orders`. View bantu (read-only):

```sql
create or replace view customer_stats as
select
  c.id, c.business_id, c.name, c.phone, c.created_at as member_since,
  count(o.id)              as total_transaksi,
  coalesce(sum(o.total),0) as omset_total,
  max(o.created_at)        as transaksi_terakhir
from customers c
left join orders o on o.customer_id = c.id
group by c.id;
```

RLS view mengikuti tabel sumbernya (anggota bisnis; detail penuh untuk owner).

---

## FASE L — Dashboard & Notifikasi

### notifications
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| user_id | uuid FK → users | penerima (owner) |
| type | enum(`stok_menipis`,`pinjaman`,`info`) | |
| title | text | |
| body | text | |
| is_read | bool | default false |
| created_at | timestamptz | |

Dashboard owner = agregasi: omset (`orders.total`), pengeluaran (`expenses`), profit bersih (omset − pengeluaran − komisi), performa karyawan (`commissions` + `attendances`).

### expenses
(menggantikan data mock `ExpensesView`)
| Kolom | Tipe | Catatan |
|------|------|---------|
| id | uuid PK | |
| business_id | uuid FK | |
| user_id | uuid FK → users | pencatat |
| category | text | |
| amount | bigint | |
| is_cash | bool | true → kurangi kas laci |
| cash_shift_id | uuid FK → cash_shifts | jika tunai |
| note | text | |
| created_at | timestamptz | |

---

## Ringkasan Relasi (ERD ringkas)

```
businesses 1─* users
businesses 1─* services 1─* service_stages
businesses 1─* customers 1─* orders *─1 users(cashier)
orders 1─* order_items *─1 services
orders 1─* order_stages *─1 service_stages
order_stages 1─1 commissions *─1 users
customers 1─* memberships 1─* membership_transactions
businesses 1─* inventory_items 1─* inventory_movements
users 1─* attendances
users 1─* loans
users 1─* payrolls
businesses 1─* cash_shifts 1─* orders/expenses(tunai)
businesses 1─* notifications
```
