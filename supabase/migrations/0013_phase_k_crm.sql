-- =====================================================================
-- FASE K — CRM Konsumen: view customer_stats
-- Jalankan setelah 0012_phase_j_inventory.sql
-- Agregasi dari customers + orders (read-only).
-- =====================================================================

create or replace view public.customer_stats as
select
  c.id,
  c.business_id,
  c.name,
  c.phone,
  c.created_at                    as member_since,
  count(o.id)::int                 as total_transaksi,
  coalesce(sum(o.total), 0)::bigint as omset_total,
  max(o.created_at)                 as transaksi_terakhir
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id, c.business_id, c.name, c.phone, c.created_at;

grant select on public.customer_stats to authenticated;
