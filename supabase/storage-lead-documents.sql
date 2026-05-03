-- =============================================================================
-- Supabase Storage policies for bucket `lead-documents`
-- Run AFTER creating the bucket in Dashboard → Storage (private bucket recommended).
--
-- Convention: object keys start with the organization UUID, e.g.
--   {organization_id}/{lead_id}/{filename}
-- so policies can scope objects to the caller's org.
--
-- Deletes are restricted to admins so loan officers cannot remove binaries even
-- if they guess an object path. Server actions may use SUPABASE_SERVICE_ROLE_KEY
-- for removal after verifying admin in application code (bypasses these policies).
-- =============================================================================

-- Adjust if your bucket id differs from lib/constants/storage.ts (LEAD_DOCUMENTS_BUCKET).

drop policy if exists "Lead docs: org members can select" on storage.objects;
drop policy if exists "Lead docs: org members can insert" on storage.objects;
drop policy if exists "Lead docs: admins can delete" on storage.objects;

create policy "Lead docs: org members can select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lead-documents'
    and split_part(name, '/', 1) = public.current_org_id()::text
  );

create policy "Lead docs: org members can insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lead-documents'
    and split_part(name, '/', 1) = public.current_org_id()::text
  );

create policy "Lead docs: admins can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lead-documents'
    and split_part(name, '/', 1) = public.current_org_id()::text
    and exists (
      select 1 from team_members tm
      where tm.user_id = auth.uid()
        and tm.organization_id = public.current_org_id()
        and tm.role = 'admin'
    )
  );
