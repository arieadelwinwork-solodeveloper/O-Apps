-- =====================================================================
-- Paket membership (katalog) + registrasi via paket
-- Jalankan setelah 0015_order_note.sql
-- =====================================================================

create table if not exists public.membership_packages (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  type             membership_type not null,
  name             text not null,
  price            bigint not null check (price > 0),
  saldo_amount     bigint check (saldo_amount is null or saldo_amount > 0),
  quota_amount     int check (quota_amount is null or quota_amount > 0),
  quota_service_id uuid references public.services(id) on delete set null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint membership_packages_saldo_fields check (
    (type = 'saldo' and saldo_amount is not null and quota_amount is null and quota_service_id is null)
    or (type = 'kuota' and quota_amount is not null and quota_service_id is not null and saldo_amount is null)
  )
);

create index if not exists idx_membership_packages_business
  on public.membership_packages(business_id);

alter table public.memberships
  add column if not exists package_id uuid references public.membership_packages(id) on delete set null;

drop trigger if exists trg_membership_packages_updated on public.membership_packages;
create trigger trg_membership_packages_updated before update on public.membership_packages
  for each row execute function public.set_updated_at();

alter table public.membership_packages enable row level security;

drop policy if exists "membership_packages read same business" on public.membership_packages;
create policy "membership_packages read same business" on public.membership_packages
  for select using (business_id = public.auth_business_id());

drop policy if exists "membership_packages write owner" on public.membership_packages;
create policy "membership_packages write owner" on public.membership_packages
  for all using (
    business_id = public.auth_business_id() and public.auth_is_owner()
  )
  with check (
    business_id = public.auth_business_id() and public.auth_is_owner()
  );
