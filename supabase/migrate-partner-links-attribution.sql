-- Partner public apply links, LO application_link, lead attribution, redirect event log.
-- Run against your Supabase Postgres (or merge into policies if you manage RLS separately).

-- Realtor partner branding + optional redirect override
alter table public.realtor_partners
  add column if not exists personal_logo_url text,
  add column if not exists subtitle text,
  add column if not exists default_application_link text;

-- Loan officer / team member external application URL
alter table public.team_members
  add column if not exists application_link text;

-- Lead intake attribution (in addition to referrer_lo_slug / realtor_partner_id)
alter table public.leads
  add column if not exists source_type text not null default 'company',
  add column if not exists source_slug text,
  add column if not exists source_team_member_id uuid references public.team_members (id) on delete set null;

create index if not exists leads_source_team_member_idx
  on public.leads (source_team_member_id);

-- Anonymous hits on /apply/realtor/* and /apply/lo/* before external redirect
create table if not exists public.partner_apply_redirect_events (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null,
  realtor_partner_id uuid references public.realtor_partners (id) on delete set null,
  team_member_id uuid references public.team_members (id) on delete set null,
  source_slug text not null,
  created_at timestamptz not null default now ()
);

create index if not exists partner_apply_redirect_events_org_idx
  on public.partner_apply_redirect_events (organization_id);

alter table public.partner_apply_redirect_events enable row level security;

-- Service-role / direct DB writes from the app bypass RLS when using the service role.
-- For authenticated Supabase clients, allow org-scoped read to internal staff only:
drop policy if exists "Internal staff can view partner apply events" on public.partner_apply_redirect_events;
create policy "Internal staff can view partner apply events"
  on public.partner_apply_redirect_events for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.user_id = auth.uid ()
        and tm.organization_id = partner_apply_redirect_events.organization_id
        and tm.role in ('admin', 'loan_officer', 'agent')
    )
  );
