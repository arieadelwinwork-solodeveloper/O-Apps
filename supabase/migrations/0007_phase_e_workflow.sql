-- =====================================================================
-- FASE E — Workflow & Komisi: order_stages, commissions
-- Jalankan setelah 0006_phase_d_cash.sql
-- order_stages = instansi tahap pengerjaan per order (snapshot dari service_stages).
-- commissions  = catatan komisi karyawan saat tahap diselesaikan (sumber payroll).
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_stage_status') then
    create type order_stage_status as enum ('belum', 'selesai');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: order_stages
-- ---------------------------------------------------------------------
create table if not exists public.order_stages (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  order_id          uuid not null references public.orders(id) on delete cascade,
  service_id        uuid references public.services(id) on delete set null,
  service_stage_id  uuid references public.service_stages(id) on delete set null,
  name              text not null,
  sort_order        int not null default 0,
  commission_type   commission_type not null default 'nominal',
  commission_value  bigint not null default 0,
  base_amount       bigint not null default 0,   -- subtotal layanan terkait (basis komisi persen)
  status            order_stage_status not null default 'belum',
  completed_by      uuid references public.users(id) on delete set null,
  completed_at      timestamptz,
  commission_amount bigint not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists idx_order_stages_order on public.order_stages(order_id);
create index if not exists idx_order_stages_business on public.order_stages(business_id);

-- ---------------------------------------------------------------------
-- TABEL: commissions
-- ---------------------------------------------------------------------
create table if not exists public.commissions (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  order_id        uuid references public.orders(id) on delete set null,
  order_stage_id  uuid references public.order_stages(id) on delete cascade,
  amount          bigint not null default 0,
  period          text not null,               -- contoh: 2026-06 (untuk payroll)
  created_at      timestamptz not null default now()
);
create index if not exists idx_commissions_business on public.commissions(business_id);
create index if not exists idx_commissions_user_period on public.commissions(user_id, period);
-- Satu tahap hanya menghasilkan satu komisi.
create unique index if not exists uq_commission_stage
  on public.commissions(order_stage_id);

-- ---------------------------------------------------------------------
-- RLS: order_stages
-- ---------------------------------------------------------------------
alter table public.order_stages enable row level security;

drop policy if exists "order_stages read same business" on public.order_stages;
create policy "order_stages read same business" on public.order_stages
  for select using (business_id = public.auth_business_id());

drop policy if exists "order_stages insert member" on public.order_stages;
create policy "order_stages insert member" on public.order_stages
  for insert with check (business_id = public.auth_business_id());

drop policy if exists "order_stages update member" on public.order_stages;
create policy "order_stages update member" on public.order_stages
  for update using (business_id = public.auth_business_id())
  with check (business_id = public.auth_business_id());

-- ---------------------------------------------------------------------
-- RLS: commissions
-- ---------------------------------------------------------------------
alter table public.commissions enable row level security;

-- Karyawan baca komisi sendiri; owner baca semua di bisnisnya.
drop policy if exists "commissions read self or owner" on public.commissions;
create policy "commissions read self or owner" on public.commissions
  for select using (
    business_id = public.auth_business_id()
    and (user_id = auth.uid() or public.auth_is_owner())
  );

drop policy if exists "commissions insert member" on public.commissions;
create policy "commissions insert member" on public.commissions
  for insert with check (business_id = public.auth_business_id());
