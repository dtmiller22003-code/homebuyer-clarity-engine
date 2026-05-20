-- Snapshot display name on leads for attribution reporting (realtor / LO).
-- Intake and deactivate/soft-remove flows populate this; optional backfill below.
--
-- If you ever hard-delete a realtor_partners row (not recommended), run first:
--   update leads set source_display_name = coalesce(source_display_name, '<name>')
--   where realtor_partner_id = '<id>' and source_type = 'realtor';
-- then clear realtor_partner_id if needed. Prefer soft-delete (deleted_at) instead.

alter table public.leads
  add column if not exists source_display_name text;

update public.leads l
set source_display_name = rp.display_name
from public.realtor_partners rp
where l.realtor_partner_id = rp.id
  and l.source_type = 'realtor'
  and l.source_display_name is null
  and nullif(trim(rp.display_name), '') is not null;
