-- =====================================================================
-- FASE A+ — Sign up owner otomatis: auth.users → businesses + public.users
-- Jalankan setelah 0001_phase_a_foundation.sql
-- =====================================================================

create or replace function public.handle_new_owner_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  meta jsonb;
  v_role text;
  v_full_name text;
  v_business_name text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role := meta->>'role';

  -- Hanya proses pendaftaran owner dari halaman Sign Up
  if v_role is distinct from 'owner' then
    return new;
  end if;

  v_full_name := coalesce(nullif(trim(meta->>'full_name'), ''), 'Owner');
  v_business_name := coalesce(nullif(trim(meta->>'business_name'), ''), 'Bisnis Baru');

  -- Hindari duplikat jika profil sudah ada
  if exists (select 1 from public.users where id = new.id) then
    return new;
  end if;

  insert into public.businesses (name)
  values (v_business_name)
  returning id into new_business_id;

  insert into public.users (id, business_id, full_name, role)
  values (new.id, new_business_id, v_full_name, 'owner');

  update public.businesses
  set owner_id = new.id
  where id = new_business_id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_owner on auth.users;
create trigger on_auth_user_created_owner
  after insert on auth.users
  for each row
  execute function public.handle_new_owner_signup();
