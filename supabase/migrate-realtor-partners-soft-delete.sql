-- Realtor partners: boolean is_active + soft delete (deleted_at).
-- Replaces legacy text `active` column. Does NOT touch leads or auth users.
-- Run after migrate-partner-links-attribution.sql (or any prior realtor_partners migrations).

begin;

alter table public.realtor_partners
  add column if not exists is_active boolean,
  add column if not exists deleted_at timestamptz;

-- Backfill is_active from legacy `active` text column when present
update public.realtor_partners rp
set is_active = (rp.active = 'true')
where rp.is_active is null
  and exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'realtor_partners'
      and c.column_name = 'active'
  );

update public.realtor_partners
set is_active = coalesce(is_active, true)
where is_active is null;

alter table public.realtor_partners
  alter column is_active set default true,
  alter column is_active set not null;

-- Optional: mark inconsistent rows (should not happen)
update public.realtor_partners
set is_active = false
where deleted_at is not null
  and is_active = true;

drop index if exists public.realtor_partners_org_slug_idx;

create unique index if not exists realtor_partners_org_slug_alive_idx
  on public.realtor_partners (organization_id, slug)
  where deleted_at is null;

alter table public.realtor_partners
  drop column if exists active;

commit;
