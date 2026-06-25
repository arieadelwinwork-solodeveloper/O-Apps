-- =====================================================================
-- FASE G — Absensi: attendances + bucket foto
-- Jalankan setelah 0008_phase_f_printers.sql
-- Titik & radius absensi disimpan di businesses (kolom dari Fase A).
-- Validasi radius dihitung di BACKEND (jangan percaya frontend).
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_type') then
    create type attendance_type as enum ('masuk', 'pulang');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: attendances
-- ---------------------------------------------------------------------
create table if not exists public.attendances (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  type         attendance_type not null,
  photo_url    text,
  lat          double precision,
  lng          double precision,
  distance_m   int,
  is_valid     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_attendances_business on public.attendances(business_id);
create index if not exists idx_attendances_user on public.attendances(user_id, created_at);

-- ---------------------------------------------------------------------
-- RLS: attendances — karyawan kelola miliknya; owner baca semua.
-- ---------------------------------------------------------------------
alter table public.attendances enable row level security;

drop policy if exists "attendances read self or owner" on public.attendances;
create policy "attendances read self or owner" on public.attendances
  for select using (
    business_id = public.auth_business_id()
    and (user_id = auth.uid() or public.auth_is_owner())
  );

drop policy if exists "attendances insert self" on public.attendances;
create policy "attendances insert self" on public.attendances
  for insert with check (
    business_id = public.auth_business_id() and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------
-- STORAGE: bucket foto absensi
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', true)
on conflict (id) do nothing;

drop policy if exists "attendance photos read" on storage.objects;
create policy "attendance photos read" on storage.objects
  for select using (bucket_id = 'attendance-photos');

drop policy if exists "attendance photos upload" on storage.objects;
create policy "attendance photos upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attendance-photos');
