-- Web push subscriptions, one row per (visitor, device/browser). Server-only
-- access like every other table — see 20261031_harden_server_access.sql.
-- Additive migration. Run in Supabase SQL Editor.

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.visitors(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_visitor_id_idx on public.push_subscriptions(visitor_id);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;

commit;

NOTIFY pgrst, 'reload schema';
