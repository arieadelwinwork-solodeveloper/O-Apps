-- =====================================================================
-- PLAN3 — Diskon order, pengaturan bisnis lanjutan, langganan SaaS
-- =====================================================================

alter table public.orders
  add column if not exists discount_type text
    check (discount_type is null or discount_type in ('nominal', 'percent')),
  add column if not exists discount_value int not null default 0,
  add column if not exists discount_amount int not null default 0;

alter table public.businesses
  add column if not exists whatsapp text,
  add column if not exists open_time text,
  add column if not exists close_time text,
  add column if not exists monthly_revenue_target bigint not null default 0,
  add column if not exists daily_order_target int not null default 0,
  add column if not exists onboarding_step int not null default 0,
  add column if not exists onboarding_completed boolean not null default false;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null default 'starter'
    check (plan in ('starter', 'pro', 'business')),
  status text not null default 'trial'
    check (status in ('trial', 'active', 'expired', 'cancelled')),
  trial_ends_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  amount bigint not null,
  plan text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'paid'
    check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_business on public.subscriptions(business_id);
create index if not exists idx_subscription_payments_sub on public.subscription_payments(subscription_id);
