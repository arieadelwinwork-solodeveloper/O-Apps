-- =====================================================================
-- FASE M — Dashboard karyawan: setting hari kerja & izin uang laci
-- Jalankan setelah migration sebelumnya.
-- =====================================================================

alter table public.businesses
  add column if not exists work_days_target int not null default 24,
  add column if not exists cash_drawer_visibility text not null default 'all'
    check (cash_drawer_visibility in ('all', 'selected')),
  add column if not exists cash_drawer_user_ids uuid[] not null default '{}';

comment on column public.businesses.work_days_target is
  'Target hari kerja per bulan (diset owner, dipakai rangkuman absensi karyawan).';
comment on column public.businesses.cash_drawer_visibility is
  'all = semua karyawan boleh lihat uang laci; selected = hanya cash_drawer_user_ids.';
comment on column public.businesses.cash_drawer_user_ids is
  'Daftar user_id yang boleh lihat uang laci bila visibility = selected.';
