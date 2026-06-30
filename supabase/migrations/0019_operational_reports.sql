-- =====================================================================
-- Laporan operasional — karyawan lapor masalah ke owner + notifikasi
-- Jalankan setelah 0018_order_pickup.sql
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'notification_type' and e.enumlabel = 'laporan'
  ) then
    alter type notification_type add value 'laporan';
  end if;
end $$;

create table if not exists public.operational_reports (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  reporter_id  uuid references public.users(id) on delete set null,
  category     text not null,
  message      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_operational_reports_business
  on public.operational_reports(business_id, created_at desc);

alter table public.operational_reports enable row level security;

drop policy if exists "operational_reports read same business" on public.operational_reports;
create policy "operational_reports read same business" on public.operational_reports
  for select using (business_id = public.auth_business_id());

drop policy if exists "operational_reports insert same business" on public.operational_reports;
create policy "operational_reports insert same business" on public.operational_reports
  for insert with check (
    business_id = public.auth_business_id()
    and reporter_id = auth.uid()
  );
