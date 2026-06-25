-- =====================================================================
-- FASE C — Kasir / Transaksi: customers, orders, order_items
-- Jalankan setelah 0004_phase_b_customization.sql
-- RLS: anggota bisnis boleh baca/insert/update; hapus order hanya owner.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('lunas_depan', 'dp', 'bayar_belakang');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('qris', 'tunai', 'transfer');
  end if;
  if not exists (select 1 from pg_type where typname = 'work_status') then
    create type work_status as enum ('antri', 'proses', 'selesai', 'diambil');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: customers
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  phone        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_customers_business on public.customers(business_id);
-- Satu nomor telpon unik per bisnis (untuk find-or-create).
create unique index if not exists uq_customers_business_phone
  on public.customers(business_id, phone) where phone is not null;

-- ---------------------------------------------------------------------
-- TABEL: orders
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  customer_id       uuid references public.customers(id) on delete set null,
  cashier_id        uuid references public.users(id) on delete set null,
  order_no          text not null,
  total             bigint not null default 0,
  payment_status    payment_status not null default 'lunas_depan',
  paid_amount       bigint not null default 0,
  remaining_amount  bigint not null default 0,
  payment_method    payment_method not null default 'tunai',
  proof_url         text,
  work_status       work_status not null default 'antri',
  membership_used   bigint not null default 0,
  cash_shift_id     uuid,
  estimated_done_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_orders_business on public.orders(business_id);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_work_status on public.orders(business_id, work_status);
create unique index if not exists uq_orders_business_no
  on public.orders(business_id, order_no);

-- ---------------------------------------------------------------------
-- TABEL: order_items
-- ---------------------------------------------------------------------
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  service_id  uuid references public.services(id) on delete set null,
  name        text not null,
  qty         numeric not null default 1,
  unit_price  bigint not null default 0,
  subtotal    bigint not null default 0
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- ---------------------------------------------------------------------
-- TRIGGER updated_at
-- ---------------------------------------------------------------------
drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: customers
-- ---------------------------------------------------------------------
alter table public.customers enable row level security;

drop policy if exists "customers read same business" on public.customers;
create policy "customers read same business" on public.customers
  for select using (business_id = public.auth_business_id());

drop policy if exists "customers insert member" on public.customers;
create policy "customers insert member" on public.customers
  for insert with check (business_id = public.auth_business_id());

drop policy if exists "customers update member" on public.customers;
create policy "customers update member" on public.customers
  for update using (business_id = public.auth_business_id())
  with check (business_id = public.auth_business_id());

drop policy if exists "customers delete owner" on public.customers;
create policy "customers delete owner" on public.customers
  for delete using (business_id = public.auth_business_id() and public.auth_is_owner());

-- ---------------------------------------------------------------------
-- RLS: orders
-- ---------------------------------------------------------------------
alter table public.orders enable row level security;

drop policy if exists "orders read same business" on public.orders;
create policy "orders read same business" on public.orders
  for select using (business_id = public.auth_business_id());

drop policy if exists "orders insert member" on public.orders;
create policy "orders insert member" on public.orders
  for insert with check (business_id = public.auth_business_id());

drop policy if exists "orders update member" on public.orders;
create policy "orders update member" on public.orders
  for update using (business_id = public.auth_business_id())
  with check (business_id = public.auth_business_id());

drop policy if exists "orders delete owner" on public.orders;
create policy "orders delete owner" on public.orders
  for delete using (business_id = public.auth_business_id() and public.auth_is_owner());

-- ---------------------------------------------------------------------
-- RLS: order_items (ikut hak akses order induknya)
-- ---------------------------------------------------------------------
alter table public.order_items enable row level security;

drop policy if exists "order_items read" on public.order_items;
create policy "order_items read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.business_id = public.auth_business_id()
    )
  );

drop policy if exists "order_items insert" on public.order_items;
create policy "order_items insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.business_id = public.auth_business_id()
    )
  );

drop policy if exists "order_items delete" on public.order_items;
create policy "order_items delete" on public.order_items
  for delete using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.business_id = public.auth_business_id()
    )
  );

-- ---------------------------------------------------------------------
-- STORAGE: bucket bukti bayar non-tunai
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- Anggota terautentikasi boleh upload & baca bukti bayar.
drop policy if exists "payment proofs read" on storage.objects;
create policy "payment proofs read" on storage.objects
  for select using (bucket_id = 'payment-proofs');

drop policy if exists "payment proofs upload" on storage.objects;
create policy "payment proofs upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs');
