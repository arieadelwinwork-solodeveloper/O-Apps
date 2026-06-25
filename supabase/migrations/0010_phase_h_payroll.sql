-- =====================================================================
-- FASE H — Penggajian: loans, payrolls
-- Jalankan setelah 0009_phase_g_attendance.sql
-- RLS: karyawan baca slip & pinjaman sendiri; owner kelola semua.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'loan_type') then
    create type loan_type as enum ('pinjaman', 'hutang', 'kerugian');
  end if;
  if not exists (select 1 from pg_type where typname = 'loan_status') then
    create type loan_status as enum ('diajukan', 'disetujui', 'ditolak', 'lunas');
  end if;
  if not exists (select 1 from pg_type where typname = 'deduction_mode') then
    create type deduction_mode as enum ('langsung', 'cicil', 'berkala');
  end if;
  if not exists (select 1 from pg_type where typname = 'payroll_status') then
    create type payroll_status as enum ('draft', 'final', 'dibayar');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: loans (pinjaman / hutang / kerugian karyawan)
-- ---------------------------------------------------------------------
create table if not exists public.loans (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  type             loan_type not null default 'pinjaman',
  amount           bigint not null,
  remaining        bigint not null,
  status           loan_status not null default 'diajukan',
  deduction_mode   deduction_mode,
  deduction_amount bigint,
  note             text,
  requested_by     uuid references public.users(id) on delete set null,
  approved_by      uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_loans_business on public.loans(business_id);
create index if not exists idx_loans_user on public.loans(user_id);

-- ---------------------------------------------------------------------
-- TABEL: payrolls (slip gaji per periode)
-- ---------------------------------------------------------------------
create table if not exists public.payrolls (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  period            text not null,
  base_salary       bigint not null default 0,
  commission_total  bigint not null default 0,
  attendance_days   int not null default 0,
  deductions        bigint not null default 0,
  net_pay           bigint not null default 0,
  status            payroll_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists uq_payroll_user_period
  on public.payrolls(business_id, user_id, period);
create index if not exists idx_payrolls_business_period
  on public.payrolls(business_id, period);

-- ---------------------------------------------------------------------
-- TRIGGER updated_at
-- ---------------------------------------------------------------------
drop trigger if exists trg_loans_updated on public.loans;
create trigger trg_loans_updated before update on public.loans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payrolls_updated on public.payrolls;
create trigger trg_payrolls_updated before update on public.payrolls
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: loans
-- ---------------------------------------------------------------------
alter table public.loans enable row level security;

drop policy if exists "loans read self or owner" on public.loans;
create policy "loans read self or owner" on public.loans
  for select using (
    business_id = public.auth_business_id()
    and (user_id = auth.uid() or public.auth_is_owner())
  );

drop policy if exists "loans insert self or owner" on public.loans;
create policy "loans insert self or owner" on public.loans
  for insert with check (
    business_id = public.auth_business_id()
    and (user_id = auth.uid() or public.auth_is_owner())
  );

drop policy if exists "loans update owner" on public.loans;
create policy "loans update owner" on public.loans
  for update using (
    business_id = public.auth_business_id() and public.auth_is_owner()
  )
  with check (
    business_id = public.auth_business_id() and public.auth_is_owner()
  );

-- ---------------------------------------------------------------------
-- RLS: payrolls
-- ---------------------------------------------------------------------
alter table public.payrolls enable row level security;

drop policy if exists "payrolls read self or owner" on public.payrolls;
create policy "payrolls read self or owner" on public.payrolls
  for select using (
    business_id = public.auth_business_id()
    and (user_id = auth.uid() or public.auth_is_owner())
  );

drop policy if exists "payrolls write owner" on public.payrolls;
create policy "payrolls write owner" on public.payrolls
  for all using (
    business_id = public.auth_business_id() and public.auth_is_owner()
  )
  with check (
    business_id = public.auth_business_id() and public.auth_is_owner()
  );
