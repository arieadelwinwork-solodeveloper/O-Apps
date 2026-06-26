-- Pengaturan kirim otomatis nota selesai via WhatsApp setelah produksi selesai
alter table public.businesses
  add column if not exists auto_send_complete_note boolean not null default false;

comment on column public.businesses.auto_send_complete_note is
  'Jika true, buka WhatsApp otomatis dengan template selesai setelah semua tahap pengerjaan selesai.';
