-- Catatan/keterangan pesanan dari kasir (opsional).
alter table public.orders
  add column if not exists note text;
