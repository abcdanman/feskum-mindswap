-- Server-only data access. The app now authenticates visitors and admins in
-- Next.js route handlers and uses the service-role client on the server.

begin;

drop policy if exists "Public visitors can CRUD booth_visits" on public.booth_visits;
drop policy if exists "Public CRUD checkpoints" on public.checkpoints;
drop policy if exists "Public visitors can view active checkpoints" on public.checkpoints;
drop policy if exists "Public CRUD reward settings" on public.reward_settings;
drop policy if exists "Public visitors can view reward settings" on public.reward_settings;
drop policy if exists "Public visitors can vote for speakers" on public.speaker_votes;
drop policy if exists "Public CRUD speakers" on public.speakers;
drop policy if exists "Public visitors can view speakers" on public.speakers;
drop policy if exists "Public visitors can CRUD visitor rewards" on public.visitor_rewards;
drop policy if exists "Public visitors can register/view visitors" on public.visitors;
drop policy if exists "Public visitors can view voting events" on public.voting_events;

drop policy if exists "Public read booth-images" on storage.objects;
drop policy if exists "Public update booth-images" on storage.objects;
drop policy if exists "Public upload booth-images" on storage.objects;

alter table public.booth_visits enable row level security;
alter table public.checkpoints enable row level security;
alter table public.reward_settings enable row level security;
alter table public.speaker_votes enable row level security;
alter table public.speakers enable row level security;
alter table public.visitor_rewards enable row level security;
alter table public.visitors enable row level security;
alter table public.voting_events enable row level security;

revoke all on table public.booth_visits from anon, authenticated;
revoke all on table public.checkpoints from anon, authenticated;
revoke all on table public.reward_settings from anon, authenticated;
revoke all on table public.speaker_votes from anon, authenticated;
revoke all on table public.speakers from anon, authenticated;
revoke all on table public.visitor_rewards from anon, authenticated;
revoke all on table public.visitors from anon, authenticated;
revoke all on table public.voting_events from anon, authenticated;

commit;
