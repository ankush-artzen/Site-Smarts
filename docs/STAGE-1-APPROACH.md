# Stage 1 — Authentication & Database Foundation

**Status:** Implementation in progress  
**Source of truth:** Also sync durable decisions into `/DEVELOPMENT.md`  
**Prerequisite:** Login already works (email/password + `proxy.ts`)  

### Database status

Live Supabase already contains Stage 1 tables + RPCs:

- Tables: `profiles`, `organizations`, `organization_members`, `sites` (+ later-stage tables)
- RPCs: `create_organization(org_name, org_slug)`, `is_org_member`, `has_org_role`

App code is aligned to **live column names** (`site_code`, `location`, no `profiles.email`).

Fresh environments can bootstrap from `supabase/migrations/20261104_stage1_foundation.sql` (do not blindly re-apply onto production).

---

## Goal

Establish a secure multi-tenant foundation so authenticated operators only see data for organizations they belong to, with roles enforced in the database (RLS) and in the app.

Deliverables by end of Stage 1:

1. Verified auth / session / logout / protected routes  
2. `profiles` + roles available to the app  
3. Organizations + membership  
4. Sites belonging to organizations  
5. Site selection in the dashboard  
6. Unauthorized users cannot read dashboard org/site data  

Out of scope for Stage 1: live telemetry ingest, charts from real kW data, alerts.

---

## Decisions locked by this approach

| Topic | Decision |
|-------|----------|
| Tenancy | **Multi-tenant organizations** from day one (Solarshed can be the first org) |
| Profile | One `profiles` row per `auth.users` id (auto-created on signup via trigger) |
| Membership | Users access orgs only through `organization_members` |
| Roles | Org-scoped enum: `owner` \| `admin` \| `operator` \| `viewer` |
| Site access | Sites belong to an org; all org members can **read** sites; write restricted by role |
| Site selection | Cookie `ss_selected_site_id` + server validation that site is in user’s orgs |
| Mutations | Zod-validated Server Actions in `lib/actions/` |
| Elevated DB | Prefer RLS + user session; service role only for bootstrap/seed scripts if needed |
| Login path | Keep client `signInWithPassword` for now (open decision deferred) |

### Role permissions (Stage 1)

| Action | owner | admin | operator | viewer |
|--------|:-----:|:-----:|:--------:|:------:|
| Read org, members, sites | ✓ | ✓ | ✓ | ✓ |
| Update org settings | ✓ | ✓ | | |
| Invite / change member roles | ✓ | ✓* | | |
| Create / update / archive sites | ✓ | ✓ | | |
| Select active site (UI) | ✓ | ✓ | ✓ | ✓ |
| Delete org | ✓ | | | |

\* `admin` cannot promote/demote `owner`, and cannot remove the last `owner`.

---

## Data model

```
auth.users
    │ 1:1
    ▼
profiles ──────────────┐
                       │
organizations ◄── organization_members (role)
    │
    │ 1:N
    ▼
  sites
```

### Tables

#### `profiles` (live)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | FK → `auth.users.id` |
| `full_name` | `text` | Nullable |
| `avatar_url` | `text` | Nullable |
| `created_at` / `updated_at` | `timestamptz` | |

Email is read from the auth session (no `profiles.email` column).

#### `organizations` (live)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `name` / `slug` | `text` | slug unique |
| `created_by` | `uuid` | creator user |
| timestamps | | |

#### `organization_members` (live)

| Column | Type | Notes |
|--------|------|-------|
| `organization_id` / `user_id` | `uuid` | unique pair |
| `role` | `text` | `owner` \| `admin` \| `operator` \| `viewer` |

#### `sites` (live)

| Column | Type | Notes |
|--------|------|-------|
| `organization_id` | `uuid` | FK |
| `name` | `text` | |
| `site_code` | `text` | optional |
| `location` / `timezone` / `description` | `text` | |
| `status` | `text` | `active` \| `inactive` \| `maintenance` |

### Helper SQL (live)

- `is_org_member(org_id uuid)`
- `has_org_role(org_id uuid, allowed_roles text[])`
- `create_organization(org_name text, org_slug text)` — creates org + owner membership

---

## Step-by-step implementation plan

### Step 1 — Verify authentication & authorization

**Verify (manual + code hardening)**

| Check | How |
|-------|-----|
| Supabase session | `getUser()` on server; cookie refresh in `proxy.ts` |
| Protected routes | Unauthenticated `/dashboard` → `/login`; signed-in `/login` → `/dashboard` |
| Logout | `signOut` Server Action clears session → `/login` |
| Profile | Load `profiles` after auth; redirect/block if missing unexpectedly |
| Roles | Load memberships + roles with profile context |
| Unauthorized data | All org/site queries go through RLS; dashboard fetches fail closed (empty / redirect) |

**Code to add**

- `lib/auth/session.ts` — `requireUser()`, `getCurrentProfile()`, `requireOrgAccess()`
- `lib/types/database.ts` — generated or hand-maintained table types
- Dashboard layout: require user + profile before rendering children
- Fail closed: no placeholder “secret” portfolio if user has zero memberships (show empty state)

**Acceptance**

- Guest cannot open `/dashboard`
- Logged-out user cannot read sites via Supabase client
- Logged-in user without membership sees empty secure state, not other orgs’ data

---

### Step 2 — Organization management

**Server Actions** (`lib/actions/organizations.ts`)

- `createOrganization({ name, slug })` — creates org + membership as `owner`
- `listMyOrganizations()`
- `listOrganizationMembers(orgId)`
- `addOrganizationMember({ orgId, email, role })` — owner/admin invites by email; existing accounts are attached without a second invite
- `updateMemberRole(...)` — with owner safeguards
- `updateOrganization(...)` — owner/admin

**UI (minimal Stage 1)**

- Dashboard shows current org name
- Empty state CTA: “Create organization” if user has none
- Simple members list later if time; at minimum data layer + seed path

**Seed**

- SQL seed or script: create **Solarshed** org and attach the first operator as `owner` (run manually in Supabase SQL editor after migration)

**Acceptance**

- Creating an org inserts membership as `owner`
- Non-members cannot `SELECT` that org
- Role updates respect matrix above

---

### Step 3 — Site management & selection

**Server Actions** (`lib/actions/sites.ts`)

- `createSite({ organizationId, name, ... })` — owner/admin
- `listSitesForOrganization(orgId)`
- `listAccessibleSites()` — all sites across user’s orgs
- `updateSite(...)`
- `setSelectedSite(siteId)` — validates access, sets httpOnly cookie
- `getSelectedSite()` — cookie + DB verify

**UI**

- Site switcher in `DashboardShell` (dropdown of accessible sites)
- Overview portfolio list fed from DB (replace hardcoded four names)
- Metrics remain sample until telemetry stage; label stays honest

**Routes**

- Keep `/dashboard` as overview
- Optional: `/dashboard/sites` list page if needed for create/select UX
- Extend `proxy.ts` matcher for any new `/dashboard/*` paths (already covered by `/dashboard/:path*`)

**Acceptance**

- Multiple sites per org supported
- Selecting a site persists across refresh
- Selecting another org’s site fails validation
- Viewer can select/read; cannot create sites

---

## File plan

```
supabase/migrations/20261104_stage1_foundation.sql
docs/STAGE-1-APPROACH.md          ← this file
lib/types/database.ts
lib/auth/session.ts
lib/auth/roles.ts
lib/actions/organizations.ts
lib/actions/sites.ts
lib/validation/org.ts
lib/validation/site.ts
components/site-switcher.tsx
app/dashboard/layout.tsx          ← require auth + load context
(update) components/dashboard-shell.tsx
(update) components/dashboard-overview.tsx
(update) DEVELOPMENT.md           ← schema registry + decisions
```

---

## Security checklist

- [ ] RLS enabled on every new table  
- [ ] No service role in Client Components  
- [ ] Zod on all Server Action inputs  
- [ ] `getUser()` before privileged work  
- [ ] Cookie site id always re-validated server-side  
- [ ] Policies use helper functions to prevent RLS recursion  

---

## Implementation order (execution)

1. Write migration SQL + document schema in `DEVELOPMENT.md`  
2. Add types + auth session helpers (Step 1)  
3. Org actions + empty-state create org (Step 2)  
4. Site actions + switcher + replace placeholder site list (Step 3)  
5. Manual verification pass against acceptance criteria  
6. Decision Log + product scope table update in `DEVELOPMENT.md`  

---

## Manual verification script

1. Sign in with valid credentials → lands on `/dashboard`  
2. Open private window → `/dashboard` redirects to `/login`  
3. Sign out → session cleared; cannot return via back button to data  
4. Create organization → appears only for that user  
5. Create two sites → both listed; switcher changes selection and persists  
6. (Optional) Second user without membership → cannot see first user’s org/sites  

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Org `INSERT` RLS chicken-and-egg | Use a security-definer RPC `create_organization_with_owner` |
| Missing profile row | Auth trigger + `requireProfile()` guard |
| Cookie spoofing for site id | Always verify site ∈ user’s accessible sites |
| Over-building admin UI | Stage 1 ships data layer + minimal create/select UI |

---

## After Stage 1

Stage 2 (not started): telemetry ingest, real production metrics, replace sample chart series.
