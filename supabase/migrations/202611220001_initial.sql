-- SPECTRA initial schema. Run with `supabase db push` or paste into the SQL editor.
create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'moderator');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.document_channel as enum ('staging', 'live');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  overlay_public_id uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null,
  revoked_at timestamptz,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.scene_documents (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel public.document_channel not null,
  document jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, channel),
  constraint document_size check (octet_length(document::text) <= 1048576)
);

create table public.media_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  url text not null check (url ~ '^https?://'),
  title text not null default '',
  requester text not null default 'Manual',
  platform text not null check (platform in ('youtube','twitch','tiktok','kick','direct')),
  status text not null default 'pending' check (status in ('pending','approved','playing','paused','rejected','finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index members_user_idx on public.workspace_members(user_id) where revoked_at is null;
create index invitations_email_idx on public.invitations(lower(email)) where status = 'pending';
create index media_workspace_status_idx on public.media_requests(workspace_id, status, created_at);
create index audit_workspace_created_idx on public.audit_events(workspace_id, created_at desc);

create or replace function public.is_workspace_member(target uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.workspace_members where workspace_id = target and user_id = auth.uid() and revoked_at is null) $$;

create or replace function public.is_workspace_owner(target uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.workspaces where id = target and owner_id = auth.uid()) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles(id, display_name) values(new.id, coalesce(new.raw_user_meta_data->>'display_name','')); return new; end $$;

create trigger auth_user_profile after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.scene_documents enable row level security;
alter table public.media_requests enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles self read" on public.profiles for select using (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "members can read peer profiles" on public.profiles for select using (exists(select 1 from public.workspace_members me join public.workspace_members peer using(workspace_id) where me.user_id=auth.uid() and me.revoked_at is null and peer.user_id=profiles.id and peer.revoked_at is null));
create policy "owner creates workspace" on public.workspaces for insert with check (owner_id = auth.uid());
create policy "members read workspace" on public.workspaces for select using (public.is_workspace_member(id) or owner_id = auth.uid());
create policy "owner updates workspace" on public.workspaces for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members read membership" on public.workspace_members for select using (public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id));
create policy "owner manages membership" on public.workspace_members for all using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "owner manages invitations" on public.invitations for all using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id) and created_by = auth.uid());
create policy "members read scenes" on public.scene_documents for select using (public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id));
create policy "members write scenes" on public.scene_documents for insert with check ((public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id)) and updated_by=auth.uid());
create policy "members update scenes" on public.scene_documents for update using (public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id)) with check ((public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id)) and updated_by=auth.uid());
create policy "members manage media" on public.media_requests for all using (public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id)) with check (public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id));
create policy "members read audit" on public.audit_events for select using (public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id));
create policy "members append audit" on public.audit_events for insert with check ((public.is_workspace_member(workspace_id) or public.is_workspace_owner(workspace_id)) and actor_id=auth.uid());

alter publication supabase_realtime add table public.scene_documents;
alter publication supabase_realtime add table public.media_requests;
alter publication supabase_realtime add table public.workspace_members;
