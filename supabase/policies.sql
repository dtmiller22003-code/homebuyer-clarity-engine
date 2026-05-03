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
-- leads: org scope + internal staff see all; realtor_partner sees attributed leads only.
-- DELETE: admins only. UPDATE: internal staff only (not realtor_partner).
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view their organization's leads" on leads;
drop policy if exists "Users can insert leads into their organization" on leads;
drop policy if exists "Users can update their organization's leads" on leads;
drop policy if exists "Users can delete their organization's leads" on leads;

create policy "Users can view their organization's leads"
  on leads for select
  using (
    organization_id = public.current_org_id()
    and (
      exists (
        select 1 from team_members tm
        where tm.user_id = auth.uid()
          and tm.organization_id = leads.organization_id
          and tm.role in ('admin', 'loan_officer', 'agent')
      )
      or exists (
        select 1 from team_members tm
        where tm.user_id = auth.uid()
          and tm.organization_id = leads.organization_id
          and tm.role = 'realtor_partner'
          and tm.realtor_partner_id is not null
          and leads.realtor_partner_id = tm.realtor_partner_id
      )
    )
  );

create policy "Users can insert leads into their organization"
  on leads for insert
  with check (organization_id = public.current_org_id());

create policy "Users can update their organization's leads"
  on leads for update
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = leads.organization_id
        and tm.role in ('admin', 'loan_officer', 'agent')
    )
  )
  with check (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = leads.organization_id
        and tm.role in ('admin', 'loan_officer', 'agent')
    )
  );

create policy "Users can delete their organization's leads"
  on leads for delete
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = leads.organization_id
        and tm.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- lead_events: scoped via the lead's org
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view events for their organization's leads" on lead_events;

create policy "Users can view events for their organization's leads"
  on lead_events for select
  using (
    exists (
      select 1 from leads l
      where l.id = lead_events.lead_id
        and l.organization_id = public.current_org_id()
        and (
          exists (
            select 1 from team_members tm
            where tm.user_id = auth.uid()
              and tm.organization_id = l.organization_id
              and tm.role in ('admin', 'loan_officer', 'agent')
          )
          or exists (
            select 1 from team_members tm
            where tm.user_id = auth.uid()
              and tm.organization_id = l.organization_id
              and tm.role = 'realtor_partner'
              and tm.realtor_partner_id is not null
              and l.realtor_partner_id = tm.realtor_partner_id
          )
        )
    )
  );

drop policy if exists "Users can insert events for their organization's leads" on lead_events;

create policy "Users can insert events for their organization's leads"
  on lead_events for insert
  with check (
    exists (
      select 1 from leads l
      join team_members tm
        on tm.organization_id = l.organization_id
        and tm.user_id = auth.uid()
      where l.id = lead_events.lead_id
        and tm.role in ('admin', 'loan_officer', 'agent')
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
drop policy if exists "Internal staff can view realtor partners in their org" on realtor_partners;
drop policy if exists "Realtor partners can view their own record" on realtor_partners;
drop policy if exists "Users can insert realtor partners in their org" on realtor_partners;
drop policy if exists "Admins can insert realtor partners in their org" on realtor_partners;
drop policy if exists "Users can update realtor partners in their org" on realtor_partners;
drop policy if exists "Admins can update realtor partners in their org" on realtor_partners;
drop policy if exists "Users can delete realtor partners in their org" on realtor_partners;
drop policy if exists "Admins can delete realtor partners in their org" on realtor_partners;

create policy "Internal staff can view realtor partners in their org"
  on realtor_partners for select
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = realtor_partners.organization_id
        and tm.role in ('admin', 'loan_officer', 'agent')
    )
  );

create policy "Realtor partners can view their own record"
  on realtor_partners for select
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = realtor_partners.organization_id
        and tm.role = 'realtor_partner'
        and tm.realtor_partner_id = realtor_partners.id
    )
  );

create policy "Admins can insert realtor partners in their org"
  on realtor_partners for insert
  with check (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = realtor_partners.organization_id
        and tm.role = 'admin'
    )
  );

create policy "Admins can update realtor partners in their org"
  on realtor_partners for update
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = realtor_partners.organization_id
        and tm.role = 'admin'
    )
  )
  with check (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = realtor_partners.organization_id
        and tm.role = 'admin'
    )
  );

create policy "Admins can delete realtor partners in their org"
  on realtor_partners for delete
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = realtor_partners.organization_id
        and tm.role = 'admin'
    )
  );

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
