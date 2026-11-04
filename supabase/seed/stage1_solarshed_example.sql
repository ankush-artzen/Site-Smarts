-- Optional seed AFTER migration + at least one user has signed in.
-- Replace YOUR_USER_UUID with auth.users.id from the Supabase dashboard.
--
-- Run in Supabase SQL editor while authenticated as a service role / dashboard SQL.

-- Example: bootstrap Solarshed org for an existing user as owner
-- select public.create_organization_with_owner('Solarshed', 'solarshed');
-- (Must be run as that user session, or insert manually below.)

/*
insert into public.organizations (id, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'Solarshed', 'solarshed')
on conflict (slug) do nothing;

insert into public.organization_members (organization_id, user_id, role)
select o.id, 'YOUR_USER_UUID'::uuid, 'owner'
from public.organizations o
where o.slug = 'solarshed'
on conflict (organization_id, user_id) do nothing;

insert into public.sites (organization_id, name, site_code, status, location)
select o.id, v.name, v.code, v.status, v.location_label
from public.organizations o
cross join (
  values
    ('North Yard Array', 'NYA', 'active', 'North Yard'),
    ('Riverside Rooftop', 'RVR', 'active', 'Riverside'),
    ('Depot Carport', 'DEP', 'inactive', 'Depot'),
    ('Hillside Farm', 'HLF', 'maintenance', 'Hillside')
) as v(name, code, status, location_label)
where o.slug = 'solarshed'
  and not exists (
    select 1 from public.sites s
    where s.organization_id = o.id and s.name = v.name
  );
*/
