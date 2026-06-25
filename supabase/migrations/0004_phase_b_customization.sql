-- =====================================================================
-- FASE B — Customization Engine: services, service_stages, message_templates
-- Jalankan setelah 0001_phase_a_foundation.sql
-- RLS: read semua anggota bisnis; write hanya owner (deny-by-default).
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'commission_type') then
    create type commission_type as enum ('nominal', 'percent');
  end if;
  if not exists (select 1 from pg_type where typname = 'template_type') then
    create type template_type as enum ('nota', 'selesai');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: services (jenis jasa)
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  price        bigint not null default 0,
  unit         text not null default 'pcs',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_services_business on public.services(business_id);

-- ---------------------------------------------------------------------
-- TABEL: service_stages (tahap pengerjaan + komisi per tahap)
-- ---------------------------------------------------------------------
create table if not exists public.service_stages (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  service_id        uuid not null references public.services(id) on delete cascade,
  name              text not null,
  sort_order        int not null default 0,
  commission_type   commission_type not null default 'nominal',
  commission_value  bigint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_stages_business on public.service_stages(business_id);
create index if not exists idx_stages_service on public.service_stages(service_id);

-- ---------------------------------------------------------------------
-- TABEL: message_templates (template nota & pesan selesai)
-- ---------------------------------------------------------------------
create table if not exists public.message_templates (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  type         template_type not null,
  name         text not null,
  body         text not null default '',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_templates_business on public.message_templates(business_id);

-- ---------------------------------------------------------------------
-- TRIGGER updated_at
-- ---------------------------------------------------------------------
drop trigger if exists trg_services_updated on public.services;
create trigger trg_services_updated before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists trg_stages_updated on public.service_stages;
create trigger trg_stages_updated before update on public.service_stages
  for each row execute function public.set_updated_at();

drop trigger if exists trg_templates_updated on public.message_templates;
create trigger trg_templates_updated before update on public.message_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: services
-- ---------------------------------------------------------------------
alter table public.services enable row level security;

drop policy if exists "services read same business" on public.services;
create policy "services read same business" on public.services
  for select using (business_id = public.auth_business_id());

drop policy if exists "services write owner" on public.services;
create policy "services write owner" on public.services
  for all using (business_id = public.auth_business_id() and public.auth_is_owner())
  with check (business_id = public.auth_business_id() and public.auth_is_owner());

-- ---------------------------------------------------------------------
-- RLS: service_stages
-- ---------------------------------------------------------------------
alter table public.service_stages enable row level security;

drop policy if exists "stages read same business" on public.service_stages;
create policy "stages read same business" on public.service_stages
  for select using (business_id = public.auth_business_id());

drop policy if exists "stages write owner" on public.service_stages;
create policy "stages write owner" on public.service_stages
  for all using (business_id = public.auth_business_id() and public.auth_is_owner())
  with check (business_id = public.auth_business_id() and public.auth_is_owner());

-- ---------------------------------------------------------------------
-- RLS: message_templates
-- ---------------------------------------------------------------------
alter table public.message_templates enable row level security;

drop policy if exists "templates read same business" on public.message_templates;
create policy "templates read same business" on public.message_templates
  for select using (business_id = public.auth_business_id());

drop policy if exists "templates write owner" on public.message_templates;
create policy "templates write owner" on public.message_templates
  for all using (business_id = public.auth_business_id() and public.auth_is_owner())
  with check (business_id = public.auth_business_id() and public.auth_is_owner());
