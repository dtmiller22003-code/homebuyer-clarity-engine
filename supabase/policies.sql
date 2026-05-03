-- =============================================================================
-- Row-Level Security policies for the Homebuyer Clarity Engine.
-- Run this in your Supabase SQL Editor AFTER running `npm run db:push`.
--
-- This ensures that even if something goes wrong in application code,
-- the database itself blocks cross-organization data leaks.
-- =============================================================================

-- Enable RLS on all our tables
alter table organizations enable row level security;
alter table team_members enable row level security;
alter table leads enable row level security;
alter table lead_events enable row level security;
alter table lead_documents enable row level security;

-- -----------------------------------------------------------------------------
-- Helper: a function that returns the current user's organization_id.
-- Used by all policies below.
-- -----------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from team_members
  where user_id = auth.uid()
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- organizations: users can only see their own org
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view their own organization" on organizations;

create policy "Users can view their own organization"
  on organizations for select
  using (id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- team_members: users can view members of their own org
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view their team members" on team_members;

create policy "Users can view their team members"
  on team_members for select
  using (organization_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- leads: scoped to the user's org for all operations
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view their organization's leads" on leads;

create policy "Users can view their organization's leads"
  on leads for select
  using (organization_id = public.current_org_id());

drop policy if exists "Users can insert leads into their organization" on leads;

create policy "Users can insert leads into their organization"
  on leads for insert
  with check (organization_id = public.current_org_id());

drop policy if exists "Users can update their organization's leads" on leads;

create policy "Users can update their organization's leads"
  on leads for update
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

drop policy if exists "Users can delete their organization's leads" on leads;

create policy "Users can delete their organization's leads"
  on leads for delete
  using (organization_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- lead_events: scoped via the lead's org
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view events for their organization's leads" on lead_events;

create policy "Users can view events for their organization's leads"
  on lead_events for select
  using (
    exists (
      select 1 from leads
      where leads.id = lead_events.lead_id
        and leads.organization_id = public.current_org_id()
    )
  );

drop policy if exists "Users can insert events for their organization's leads" on lead_events;

create policy "Users can insert events for their organization's leads"
  on lead_events for insert
  with check (
    exists (
      select 1 from leads
      where leads.id = lead_events.lead_id
        and leads.organization_id = public.current_org_id()
    )
  );

-- =============================================================================
-- Phase 2B — organizations UPDATE (admins only)
-- =============================================================================
drop policy if exists "Admins can update their organization" on organizations;

create policy "Admins can update their organization"
  on organizations for update
  using (
    id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = organizations.id
        and tm.role = 'admin'
    )
  )
  with check (
    id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = organizations.id
        and tm.role = 'admin'
    )
  );

-- =============================================================================
-- Phase 2B — team_members UPDATE (admins: any row in org; members: own row)
-- =============================================================================
drop policy if exists "Team members can update profiles in their org" on team_members;

create policy "Team members can update profiles in their org"
  on team_members for update
  using (
    organization_id = public.current_org_id()
    and (
      user_id = auth.uid()
      or exists (
        select 1 from team_members tm
        where tm.user_id = auth.uid()
          and tm.organization_id = team_members.organization_id
          and tm.role = 'admin'
      )
    )
  )
  with check (
    organization_id = public.current_org_id()
    and (
      user_id = auth.uid()
      or exists (
        select 1 from team_members tm
        where tm.user_id = auth.uid()
          and tm.organization_id = team_members.organization_id
          and tm.role = 'admin'
      )
    )
  );

-- =============================================================================
-- Phase 2B — realtor_partners (full CRUD within org)
-- =============================================================================
alter table realtor_partners enable row level security;

drop policy if exists "Users can view realtor partners in their org" on realtor_partners;
drop policy if exists "Users can insert realtor partners in their org" on realtor_partners;
drop policy if exists "Users can update realtor partners in their org" on realtor_partners;
drop policy if exists "Users can delete realtor partners in their org" on realtor_partners;

create policy "Users can view realtor partners in their org"
  on realtor_partners for select
  using (organization_id = public.current_org_id());

create policy "Users can insert realtor partners in their org"
  on realtor_partners for insert
  with check (organization_id = public.current_org_id());

create policy "Users can update realtor partners in their org"
  on realtor_partners for update
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy "Users can delete realtor partners in their org"
  on realtor_partners for delete
  using (organization_id = public.current_org_id());

-- =============================================================================
-- lead_documents — metadata for files (Storage object keys). Table from Drizzle push.
-- SELECT/INSERT: any member of the org. DELETE: admins only (loan officers cannot
-- remove borrower documents at the database layer).
-- =============================================================================
drop policy if exists "Users can view lead documents in their org" on lead_documents;
drop policy if exists "Users can insert lead documents in their org" on lead_documents;
drop policy if exists "Admins can delete lead documents in their org" on lead_documents;

create policy "Users can view lead documents in their org"
  on lead_documents for select
  using (organization_id = public.current_org_id());

create policy "Users can insert lead documents in their org"
  on lead_documents for insert
  with check (organization_id = public.current_org_id());

create policy "Admins can delete lead documents in their org"
  on lead_documents for delete
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = lead_documents.organization_id
        and tm.role = 'admin'
    )
  );

-- =============================================================================
-- Phase 2B — rate_limits (RLS on; no policies — app uses DB role / Drizzle only)
-- =============================================================================
alter table rate_limits enable row level security;
