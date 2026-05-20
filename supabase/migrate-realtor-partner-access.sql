-- =============================================================================
-- Safe migration: realtor partner attribution + team member link
--
-- Does NOT modify RLS on unrelated tables. Run after columns exist, then apply
-- the updated `leads`, `lead_events`, and `realtor_partners` policy blocks from
-- `supabase/policies.sql` (or run the full policies script if your process allows).
-- =============================================================================

alter table public.leads
  add column if not exists realtor_partner_id uuid references public.realtor_partners (id) on delete set null;

create index if not exists leads_realtor_partner_idx
  on public.leads (realtor_partner_id);

alter table public.team_members
  add column if not exists realtor_partner_id uuid references public.realtor_partners (id) on delete set null;

create index if not exists team_members_realtor_partner_idx
  on public.team_members (realtor_partner_id);
