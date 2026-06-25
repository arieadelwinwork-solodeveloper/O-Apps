-- =====================================================================
-- FASE A — Fondasi: businesses, users, helper RLS, policies
-- Jalankan di Supabase SQL Editor (atau via supabase CLI).
-- Mengikuti Security PRD: RLS aktif, deny-by-default, least privilege.
-- =====================================================================

-- Ekstensi untuk gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUM role
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('owner', 'karyawan');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: businesses
-- ---------------------------------------------------------------------
create table if not exists public.businesses (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  owner_id             uuid,                       -- diisi setelah user owner dibuat
  address              text,
  phone                text,
  -- Konfigurasi absensi (dipakai Fase G)
  attendance_lat       double precision,
  attendance_lng       double precision,
  attendance_radius_m  int default 100,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TABEL: users (profil aplikasi; id = auth.users.id)
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  full_name    text not null default '',
  role         user_role not null default 'karyawan',
  phone        text,
  base_salary  bigint not null default 0,          -- gaji pokok (Fase H)
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_users_business on public.users(business_id);

-- FK owner_id -> users (ditambahkan setelah tabel users ada)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_owner_fk'
  ) then
    alter table public.businesses
      add constraint businesses_owner_fk
      foreign key (owner_id) references public.users(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS untuk RLS
-- security definer agar bisa membaca public.users tanpa rekursi policy.
-- ---------------------------------------------------------------------
create or replace function public.auth_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.users where id = auth.uid()
$$;

create or replace function public.auth_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.users
    where id = auth.uid() and role = 'owner'
  )
$$;

-- ---------------------------------------------------------------------
-- RLS: businesses
-- ---------------------------------------------------------------------
alter table public.businesses enable row level security;

drop policy if exists "businesses read own" on public.businesses;
create policy "businesses read own" on public.businesses
  for select using (id = public.auth_business_id());

drop policy if exists "businesses update owner" on public.businesses;
create policy "businesses update owner" on public.businesses
  for update using (id = public.auth_business_id() and public.auth_is_owner())
  with check (id = public.auth_business_id() and public.auth_is_owner());

-- Catatan: INSERT business saat registrasi dilakukan lewat backend
-- (service role) agar terkontrol — lihat server/src/routes/auth.ts.

-- ---------------------------------------------------------------------
-- RLS: users
-- ---------------------------------------------------------------------
alter table public.users enable row level security;

-- Baca: semua anggota bisnis yang sama
drop policy if exists "users read same business" on public.users;
create policy "users read same business" on public.users
  for select using (business_id = public.auth_business_id());

-- Update profil sendiri (tidak boleh mengubah role/business via policy ini;
-- pembatasan kolom ditegakkan di backend).
drop policy if exists "users update self" on public.users;
create policy "users update self" on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Owner boleh kelola seluruh user di bisnisnya
drop policy if exists "users manage by owner" on public.users;
create policy "users manage by owner" on public.users
  for all using (business_id = public.auth_business_id() and public.auth_is_owner())
  with check (business_id = public.auth_business_id() and public.auth_is_owner());

-- ---------------------------------------------------------------------
-- TRIGGER: updated_at otomatis
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_businesses_updated on public.businesses;
create trigger trg_businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();
