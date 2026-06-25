-- =====================================================================
-- FASE D — Kas Laci & Prediksi: cash_shifts, expenses
-- Jalankan setelah 0005_phase_c_orders.sql
-- RLS: anggota bisnis boleh baca/insert/update; hapus hanya owner.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cash_shift_status') then
    create type cash_shift_status as enum ('open', 'closed');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: cash_shifts (sesi buka/tutup laci)
-- ---------------------------------------------------------------------
create table if not exists public.cash_shifts (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  opened_by     uuid references public.users(id) on delete set null,
  closed_by     uuid references public.users(id) on delete set null,
  opening_cash  bigint not null default 0,
  expected_cash bigint not null default 0,
  closing_cash  bigint,
  variance      bigint,
  status        cash_shift_status not null default 'open',
  note          text,
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz,
  updated_at    timestamptz not null default now()
);
create index if not exists idx_cash_shifts_business on public.cash_shifts(business_id);
-- Hanya boleh ada satu shift terbuka per bisnis.
create unique index if not exists uq_cash_shift_open
  on public.cash_shifts(business_id) where status = 'open';

-- ---------------------------------------------------------------------
-- TABEL: expenses (pengeluaran; tunai mengurangi kas laci)
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  user_id       uuid references public.users(id) on delete set null,
  category      text not null,
  amount        bigint not null default 0,
  is_cash       boolean not null default true,
  cash_shift_id uuid references public.cash_shifts(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_expenses_business on public.expenses(business_id);
create index if not exists idx_expenses_shift on public.expenses(cash_shift_id);

-- ---------------------------------------------------------------------
-- TRIGGER updated_at
-- ---------------------------------------------------------------------
drop trigger if exists trg_cash_shifts_updated on public.cash_shifts;
create trigger trg_cash_shifts_updated before update on public.cash_shifts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: cash_shifts
-- ---------------------------------------------------------------------
alter table public.cash_shifts enable row level security;

drop policy if exists "cash_shifts read same business" on public.cash_shifts;
create policy "cash_shifts read same business" on public.cash_shifts
  for select using (business_id = public.auth_business_id());

drop policy if exists "cash_shifts insert member" on public.cash_shifts;
create policy "cash_shifts insert member" on public.cash_shifts
  for insert with check (business_id = public.auth_business_id());

drop policy if exists "cash_shifts update member" on public.cash_shifts;
create policy "cash_shifts update member" on public.cash_shifts
  for update using (business_id = public.auth_business_id())
  with check (business_id = public.auth_business_id());

drop policy if exists "cash_shifts delete owner" on public.cash_shifts;
create policy "cash_shifts delete owner" on public.cash_shifts
  for delete using (business_id = public.auth_business_id() and public.auth_is_owner());

-- ---------------------------------------------------------------------
-- RLS: expenses
-- ---------------------------------------------------------------------
alter table public.expenses enable row level security;

drop policy if exists "expenses read same business" on public.expenses;
create policy "expenses read same business" on public.expenses
  for select using (business_id = public.auth_business_id());

drop policy if exists "expenses insert member" on public.expenses;
create policy "expenses insert member" on public.expenses
  for insert with check (business_id = public.auth_business_id());

drop policy if exists "expenses delete owner" on public.expenses;
create policy "expenses delete owner" on public.expenses
  for delete using (business_id = public.auth_business_id() and public.auth_is_owner());
