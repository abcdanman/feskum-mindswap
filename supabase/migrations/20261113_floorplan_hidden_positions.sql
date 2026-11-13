-- Lets admin hide specific empty floor-plan positions from the public map
-- (e.g. slots that will never be filled) instead of showing them as empty
-- placeholder tiles. A single settings row, same server-only access pattern
-- as every other table — see 20261031_harden_server_access.sql.
-- Additive migration. Run in Supabase SQL Editor.

begin;

create table if not exists public.floorplan_settings (
  id int primary key default 1,
  hidden_positions int[] not null default '{}',
  constraint floorplan_settings_singleton check (id = 1)
);

insert into public.floorplan_settings (id, hidden_positions)
values (1, '{}')
on conflict (id) do nothing;

alter table public.floorplan_settings enable row level security;
revoke all on table public.floorplan_settings from anon, authenticated;

commit;

NOTIFY pgrst, 'reload schema';
