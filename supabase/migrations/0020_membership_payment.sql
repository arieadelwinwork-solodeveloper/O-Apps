-- Pembayaran paket membership (kasir) — metode, bukti, nominal lunas
alter table public.membership_transactions
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('tunai', 'qris', 'transfer')),
  add column if not exists proof_url text,
  add column if not exists paid_amount bigint
    check (paid_amount is null or paid_amount >= 0);
