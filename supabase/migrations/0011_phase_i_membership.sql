-- =====================================================================
-- FASE I — Membership: memberships, membership_transactions
-- Jalankan setelah 0010_phase_h_payroll.sql
-- RLS: semua anggota bisnis baca; tulis membership hanya owner.
-- Mutasi saat transaksi dilakukan via backend (service role).
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_type') then
    create type membership_type as enum ('saldo', 'kuota');
  end if;
  if not exists (select 1 from pg_type where typname = 'membership_change_type') then
    create type membership_change_type as enum ('topup', 'pakai', 'refund');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: memberships
-- ---------------------------------------------------------------------
create table if not exists public.memberships (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  customer_id       uuid not null references public.customers(id) on delete cascade,
  type              membership_type not null,
  balance           bigint not null default 0,
  quota_service_id  uuid references public.services(id) on delete set null,
  quota_remaining   int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_memberships_business on public.memberships(business_id);
create index if not exists idx_memberships_customer on public.memberships(customer_id);

create unique index if not exists uq_membership_customer_saldo
  on public.memberships(business_id, customer_id)
  where type = 'saldo';

create unique index if not exists uq_membership_customer_quota
  on public.memberships(business_id, customer_id, quota_service_id)
  where type = 'kuota';

-- ---------------------------------------------------------------------
-- TABEL: membership_transactions
-- ---------------------------------------------------------------------
create table if not exists public.membership_transactions (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  membership_id  uuid not null references public.memberships(id) on delete cascade,
  order_id       uuid references public.orders(id) on delete set null,
  change_type    membership_change_type not null,
  amount         bigint not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_membership_tx_membership
  on public.membership_transactions(membership_id);
create index if not exists idx_membership_tx_order
  on public.membership_transactions(order_id);

-- ---------------------------------------------------------------------
-- TRIGGER updated_at
-- ---------------------------------------------------------------------
drop trigger if exists trg_memberships_updated on public.memberships;
create trigger trg_memberships_updated before update on public.memberships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: memberships
-- ---------------------------------------------------------------------
alter table public.memberships enable row level security;

drop policy if exists "memberships read same business" on public.memberships;
create policy "memberships read same business" on public.memberships
  for select using (business_id = public.auth_business_id());

drop policy if exists "memberships write owner" on public.memberships;
create policy "memberships write owner" on public.memberships
  for all using (
    business_id = public.auth_business_id() and public.auth_is_owner()
  )
  with check (
    business_id = public.auth_business_id() and public.auth_is_owner()
  );

-- ---------------------------------------------------------------------
-- RLS: membership_transactions
-- ---------------------------------------------------------------------
alter table public.membership_transactions enable row level security;

drop policy if exists "membership_tx read same business" on public.membership_transactions;
create policy "membership_tx read same business" on public.membership_transactions
  for select using (business_id = public.auth_business_id());
