-- Stage 1 foundation — REFERENCE / fresh-environment bootstrap
--
-- IMPORTANT: The connected Supabase project already has these objects live:
--   profiles, organizations, organization_members, sites
--   RPCs: create_organization(org_name, org_slug), is_org_member(org_id),
--         has_org_role(org_id, allowed_roles)
--
-- Do NOT blindly re-run destructive changes against production.
-- This file documents the expected Stage 1 shape for new environments.
-- See docs/STAGE-1-APPROACH.md

create extension if not exists pgcrypto;

do $$ begin
  create type public.org_role as enum ('owner', 'admin', 'operator', 'viewer');
exception when duplicate_object then null;
end $$;

-- Live DB uses a CHECK constraint (not enum): active | inactive | maintenance

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  site_code text,
  location text,
  timezone text default 'UTC',
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sites_status_check check (status in ('active', 'inactive', 'maintenance'))
);

-- Profile bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.role = any (allowed_roles)
  );
$$;

create or replace function public.create_organization(org_name text, org_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (org_name, org_slug, auth.uid())
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, auth.uid(), 'owner');

  return v_org;
end;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.sites enable row level security;

-- Minimal policies for fresh envs (live project may already have equivalents)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member" on public.organizations
  for select to authenticated using (public.is_org_member(id));

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin" on public.organizations
  for update to authenticated
  using (public.has_org_role(id, array['owner','admin']))
  with check (public.has_org_role(id, array['owner','admin']));

drop policy if exists "organization_members_select" on public.organization_members;
create policy "organization_members_select" on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "organization_members_insert_admin" on public.organization_members;
create policy "organization_members_insert_admin" on public.organization_members
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists "organization_members_update_admin" on public.organization_members;
create policy "organization_members_update_admin" on public.organization_members
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists "organization_members_delete_admin" on public.organization_members;
create policy "organization_members_delete_admin" on public.organization_members
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists "sites_select_member" on public.sites;
create policy "sites_select_member" on public.sites
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "sites_insert_admin" on public.sites;
create policy "sites_insert_admin" on public.sites
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin']));

drop policy if exists "sites_update_admin" on public.sites;
create policy "sites_update_admin" on public.sites
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;
