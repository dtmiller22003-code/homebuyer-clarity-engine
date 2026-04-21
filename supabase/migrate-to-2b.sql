-- =============================================================================
-- Phase 2A → Phase 2B migration.
-- Run this ONCE in the Supabase SQL Editor BEFORE running the updated
-- policies.sql. It is fully idempotent (safe to run multiple times).
--
-- What it does:
--   1. Adds the font_preset enum
--   2. Adds branding + default-assignee + contact columns to organizations
--   3. Adds slug/phone/bio/calendly_url to team_members
--   4. Adds referrer_lo_slug to leads
--   5. Creates realtor_partners table
--   6. Creates rate_limits table
--   7. Creates the unique indexes for slug uniqueness
--
-- Verification: run this script twice. The second run should produce no changes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. font_preset enum (only create if not already present)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'font_preset') then
    create type font_preset as enum ('SYSTEM', 'SERIF', 'ROUNDED');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. organizations — branding + defaults
-- -----------------------------------------------------------------------------
alter table organizations
  add column if not exists primary_color text not null default '#1e40af';

alter table organizations
  add column if not exists secondary_color text not null default '#64748b';

alter table organizations
  add column if not exists accent_color text not null default '#f59e0b';

alter table organizations
  add column if not exists logo_url text;

alter table organizations
  add column if not exists font_preset font_preset not null default 'SYSTEM';

alter table organizations
  add column if not exists default_assignee_id uuid;

alter table organizations
  add column if not exists company_email text;

alter table organizations
  add column if not exists company_phone text;

-- -----------------------------------------------------------------------------
-- 3. team_members — public profile fields
-- -----------------------------------------------------------------------------
alter table team_members
  add column if not exists slug text;

alter table team_members
  add column if not exists phone text;

alter table team_members
  add column if not exists bio text;

alter table team_members
  add column if not exists calendly_url text;

-- One slug per org. Null slugs don't conflict (Postgres treats nulls as distinct).
create unique index if not exists team_members_org_slug_idx
  on team_members (organization_id, slug);

-- -----------------------------------------------------------------------------
-- 4. leads — attribution
-- -----------------------------------------------------------------------------
alter table leads
  add column if not exists referrer_lo_slug text;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'occupancy_intent') then
    create type occupancy_intent as enum ('PRIMARY_HOME', 'INVESTMENT_PROPERTY');
  end if;
end $$;

alter table leads
  add column if not exists occupancy_intent occupancy_intent not null default 'PRIMARY_HOME';

-- -----------------------------------------------------------------------------
-- 5. realtor_partners — schema only, no UI yet
-- -----------------------------------------------------------------------------
create table if not exists realtor_partners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  display_name text not null,
  email text not null,
  phone text,
  slug text not null,
  brokerage text,
  active text not null default 'true',
  created_at timestamptz not null default now()
);

create index if not exists realtor_partners_org_idx
  on realtor_partners (organization_id);

create unique index if not exists realtor_partners_org_slug_idx
  on realtor_partners (organization_id, slug);

-- -----------------------------------------------------------------------------
-- 6. rate_limits — IP-based throttling for public intake form
-- -----------------------------------------------------------------------------
create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  bucket text not null,
  count integer not null default 1,
  created_at timestamptz not null default now()
);

create unique index if not exists rate_limits_key_bucket_idx
  on rate_limits (key, bucket);

-- -----------------------------------------------------------------------------
-- Done. Now run the updated policies.sql to refresh RLS for the new tables.
-- =============================================================================
