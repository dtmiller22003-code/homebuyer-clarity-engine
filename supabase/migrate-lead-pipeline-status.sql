-- =============================================================================
-- Migrate leads.status from lead_status enum to text pipeline values.
-- Run once after deploy. Preserves rows; maps legacy enum values.
-- =============================================================================

-- 1) Add new column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_pipeline text;

UPDATE leads SET status_pipeline = CASE status::text
  WHEN 'new' THEN 'new'
  WHEN 'reviewed' THEN 'contacted'
  WHEN 'approved' THEN 'preapproved'
  WHEN 'archived' THEN 'dead'
  WHEN 'sent_to_crm' THEN 'closed'
  ELSE 'new'
END
WHERE status_pipeline IS NULL;

ALTER TABLE leads ALTER COLUMN status_pipeline SET NOT NULL;
ALTER TABLE leads ALTER COLUMN status_pipeline SET DEFAULT 'new';

-- 2) Drop old column and enum, rename
ALTER TABLE leads DROP COLUMN IF EXISTS status;
ALTER TABLE leads RENAME COLUMN status_pipeline TO status;

DROP TYPE IF EXISTS lead_status;

-- 3) Recreate index (name may already exist from prior schema)
DROP INDEX IF EXISTS leads_status_idx;
CREATE INDEX leads_status_idx ON leads (status);
