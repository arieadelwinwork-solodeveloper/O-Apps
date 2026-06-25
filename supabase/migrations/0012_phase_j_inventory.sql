-- =====================================================================
-- FASE J — Inventori: inventory_items, inventory_movements, notifications
-- Jalankan setelah 0011_phase_i_membership.sql
-- RLS: semua anggota bisnis baca; kelola item & restock hanya owner.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'inventory_change_type') then
    create type inventory_change_type as enum ('masuk', 'keluar', 'adjust');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type notification_type as enum ('stok_menipis', 'pinjaman', 'info');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- TABEL: inventory_items
-- ---------------------------------------------------------------------
create table if not exists public.inventory_items (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  name            text not null,
  unit            text not null default 'pcs',
  current_stock   numeric not null default 0,
  min_stock       numeric not null default 0,
  last_restock_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_inventory_items_business
  on public.inventory_items(business_id);

-- ---------------------------------------------------------------------
-- TABEL: inventory_movements
-- ---------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  item_id      uuid not null references public.inventory_items(id) on delete cascade,
  user_id      uuid references public.users(id) on delete set null,
  change_type  inventory_change_type not null,
  qty          numeric not null,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_inventory_movements_item
  on public.inventory_movements(item_id);
create index if not exists idx_inventory_movements_business
  on public.inventory_movements(business_id);

-- ---------------------------------------------------------------------
-- TABEL: notifications (dasar untuk stok menipis; pusat notifikasi Fase L)
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  type         notification_type not null,
  title        text not null,
  body         text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_user
  on public.notifications(user_id, is_read);

-- ---------------------------------------------------------------------
-- TRIGGER updated_at
-- ---------------------------------------------------------------------
drop trigger if exists trg_inventory_items_updated on public.inventory_items;
create trigger trg_inventory_items_updated before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: inventory_items
-- ---------------------------------------------------------------------
alter table public.inventory_items enable row level security;

drop policy if exists "inventory_items read same business" on public.inventory_items;
create policy "inventory_items read same business" on public.inventory_items
  for select using (business_id = public.auth_business_id());

drop policy if exists "inventory_items write owner" on public.inventory_items;
create policy "inventory_items write owner" on public.inventory_items
  for all using (
    business_id = public.auth_business_id() and public.auth_is_owner()
  )
  with check (
    business_id = public.auth_business_id() and public.auth_is_owner()
  );

-- ---------------------------------------------------------------------
-- RLS: inventory_movements
-- ---------------------------------------------------------------------
alter table public.inventory_movements enable row level security;

drop policy if exists "inventory_movements read same business" on public.inventory_movements;
create policy "inventory_movements read same business" on public.inventory_movements
  for select using (business_id = public.auth_business_id());

drop policy if exists "inventory_movements insert same business" on public.inventory_movements;
create policy "inventory_movements insert same business" on public.inventory_movements
  for insert with check (business_id = public.auth_business_id());

-- ---------------------------------------------------------------------
-- RLS: notifications
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications
  for select using (
    business_id = public.auth_business_id() and user_id = auth.uid()
  );

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (
    business_id = public.auth_business_id() and user_id = auth.uid()
  )
  with check (
    business_id = public.auth_business_id() and user_id = auth.uid()
  );
