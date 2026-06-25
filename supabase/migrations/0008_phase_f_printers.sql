-- =====================================================================
-- FASE F — Nota & Printer Bluetooth: print_devices
-- Jalankan setelah 0007_phase_e_workflow.sql
-- Menyimpan printer Bluetooth yang pernah dipasangkan tiap user.
-- (Nota WhatsApp & cetak struk tidak butuh tabel — dilakukan di frontend.)
-- =====================================================================

create table if not exists public.print_devices (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  device_name  text not null,
  device_id    text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_print_devices_business on public.print_devices(business_id);
create index if not exists idx_print_devices_user on public.print_devices(user_id);

-- ---------------------------------------------------------------------
-- RLS: print_devices — tiap user kelola perangkatnya sendiri.
-- ---------------------------------------------------------------------
alter table public.print_devices enable row level security;

drop policy if exists "print_devices read own" on public.print_devices;
create policy "print_devices read own" on public.print_devices
  for select using (
    business_id = public.auth_business_id() and user_id = auth.uid()
  );

drop policy if exists "print_devices insert own" on public.print_devices;
create policy "print_devices insert own" on public.print_devices
  for insert with check (
    business_id = public.auth_business_id() and user_id = auth.uid()
  );

drop policy if exists "print_devices delete own" on public.print_devices;
create policy "print_devices delete own" on public.print_devices
  for delete using (
    business_id = public.auth_business_id() and user_id = auth.uid()
  );
