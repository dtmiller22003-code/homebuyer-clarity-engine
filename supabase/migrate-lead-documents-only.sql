-- =============================================================================
-- Safe migration: lead_documents only
--
-- Does NOT alter RLS or policies on any other table. Safe to run when you
-- cannot use `drizzle-kit push` because it would rewrite Supabase RLS elsewhere.
--
-- Prerequisites: `organizations`, `leads`, and `public.current_org_id()` must
-- already exist (from your main schema + policies.sql).
--
-- Run in Supabase SQL Editor once.
-- =============================================================================

-- 1) Table (no FKs yet — added in step 2 so we can guard with IF NOT EXISTS)
create table if not exists public.lead_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lead_id uuid not null,
  storage_bucket text,
  storage_path text,
  original_filename text not null,
  content_type text,
  uploaded_by_user_id uuid,
  created_at timestamptz not null default now()
);

-- 2) Foreign keys — only add when no FK to that parent table already exists
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class child on c.conrelid = child.oid
    join pg_class parent on c.confrelid = parent.oid
    join pg_namespace child_ns on child.relnamespace = child_ns.oid
    join pg_namespace parent_ns on parent.relnamespace = parent_ns.oid
    where child_ns.nspname = 'public'
      and parent_ns.nspname = 'public'
      and child.relname = 'lead_documents'
      and parent.relname = 'organizations'
      and c.contype = 'f'
  ) then
    alter table public.lead_documents
      add constraint lead_documents_organization_id_fkey
      foreign key (organization_id)
      references public.organizations (id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class child on c.conrelid = child.oid
    join pg_class parent on c.confrelid = parent.oid
    join pg_namespace child_ns on child.relnamespace = child_ns.oid
    join pg_namespace parent_ns on parent.relnamespace = parent_ns.oid
    where child_ns.nspname = 'public'
      and parent_ns.nspname = 'public'
      and child.relname = 'lead_documents'
      and parent.relname = 'leads'
      and c.contype = 'f'
  ) then
    alter table public.lead_documents
      add constraint lead_documents_lead_id_fkey
      foreign key (lead_id)
      references public.leads (id)
      on delete cascade;
  end if;
end $$;

-- 3) Indexes — only names used by Drizzle schema (create if not exists)
create index if not exists lead_documents_org_idx
  on public.lead_documents (organization_id);

create index if not exists lead_documents_lead_idx
  on public.lead_documents (lead_id);

-- 4) RLS — this table only (does not touch any other table)
alter table public.lead_documents enable row level security;

-- 5) Policies — lead_documents only (drops/recreates only these policy names)
drop policy if exists "Users can view lead documents in their org" on public.lead_documents;
drop policy if exists "Users can insert lead documents in their org" on public.lead_documents;
drop policy if exists "Admins can delete lead documents in their org" on public.lead_documents;

create policy "Users can view lead documents in their org"
  on public.lead_documents for select
  using (organization_id = public.current_org_id());

create policy "Users can insert lead documents in their org"
  on public.lead_documents for insert
  with check (organization_id = public.current_org_id());

create policy "Admins can delete lead documents in their org"
  on public.lead_documents for delete
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from public.team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = lead_documents.organization_id
        and tm.role = 'admin'
    )
  );
