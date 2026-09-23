BEGIN;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL
  THEN
    RAISE EXCEPTION 'grounding_source_storage_unavailable';
  END IF;
END
$$;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'organization-grounding-sources',
  'organization-grounding-sources',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  bucket_public boolean;
  bucket_limit bigint;
  bucket_mimes text[];
BEGIN
  SELECT public, file_size_limit, allowed_mime_types
    INTO bucket_public, bucket_limit, bucket_mimes
    FROM storage.buckets
   WHERE id = 'organization-grounding-sources'
     AND name = 'organization-grounding-sources';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'grounding_source_bucket_missing';
  END IF;
  IF bucket_public IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'grounding_source_bucket_must_be_private';
  END IF;
  IF bucket_limit IS DISTINCT FROM 10485760 THEN
    RAISE EXCEPTION 'grounding_source_bucket_limit_mismatch';
  END IF;
  IF cardinality(bucket_mimes) <> 7
     OR NOT bucket_mimes @> ARRAY[
       'application/pdf',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'text/csv',
       'text/plain',
       'image/png',
       'image/jpeg'
     ]::text[]
  THEN
    RAISE EXCEPTION 'grounding_source_bucket_mime_mismatch';
  END IF;
END
$$;

DROP POLICY IF EXISTS organization_grounding_sources_member_read
  ON storage.objects;
CREATE POLICY organization_grounding_sources_member_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'organization-grounding-sources'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND split_part(name, '/', 2) ~ '^[0-9a-f]{64}$'
    AND split_part(name, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$'
    AND split_part(name, '/', 4) = ''
    AND wandora.is_active_member(split_part(name, '/', 1)::uuid)
  );

DROP POLICY IF EXISTS organization_grounding_sources_owner_admin_insert
  ON storage.objects;
CREATE POLICY organization_grounding_sources_owner_admin_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organization-grounding-sources'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND split_part(name, '/', 2) ~ '^[0-9a-f]{64}$'
    AND split_part(name, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$'
    AND split_part(name, '/', 4) = ''
    AND wandora.has_org_role(
      split_part(name, '/', 1)::uuid,
      ARRAY['owner', 'admin']::wandora.membership_role[]
    )
  );

COMMENT ON POLICY organization_grounding_sources_member_read
  ON storage.objects IS
  'Private grounding evidence read: active organization members only; source path remains tenant-scoped.';

COMMENT ON POLICY organization_grounding_sources_owner_admin_insert
  ON storage.objects IS
  'Immutable grounding evidence create: active organization owner/admin only. V1 intentionally grants no UPDATE or DELETE policy.';

COMMIT;
