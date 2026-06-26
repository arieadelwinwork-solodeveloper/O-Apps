-- Catat pengambilan pesanan oleh pelanggan
alter table public.orders
  add column if not exists picked_up_at timestamptz,
  add column if not exists picked_up_by uuid references public.users(id) on delete set null;

create index if not exists idx_orders_picked_up_at
  on public.orders(business_id, picked_up_at)
  where picked_up_at is not null;

comment on column public.orders.picked_up_at is
  'Waktu tombol Diambil ditekan / pesanan diserahkan ke pelanggan.';
comment on column public.orders.picked_up_by is
  'Karyawan yang menyerahkan pesanan ke pelanggan.';
