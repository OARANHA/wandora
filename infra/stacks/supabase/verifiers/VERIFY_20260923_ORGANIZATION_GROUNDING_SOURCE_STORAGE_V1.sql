\set ON_ERROR_STOP on

DO $$
DECLARE
  bucket_public boolean;
  bucket_limit bigint;
  bucket_mimes text[];
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'grounding_source_storage_fixture_missing';
  END IF;

  SELECT public, file_size_limit, allowed_mime_types
    INTO bucket_public, bucket_limit, bucket_mimes
    FROM storage.buckets
   WHERE id = 'organization-grounding-sources';

  IF NOT FOUND OR bucket_public IS DISTINCT FROM false OR bucket_limit IS DISTINCT FROM 10485760 THEN
    RAISE EXCEPTION 'grounding_source_bucket_contract_invalid';
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
    RAISE EXCEPTION 'grounding_source_bucket_mime_contract_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='storage'
       AND tablename='objects'
       AND policyname='organization_grounding_sources_member_read'
       AND cmd='SELECT'
       AND roles = ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'grounding_source_member_read_policy_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='storage'
       AND tablename='objects'
       AND policyname='organization_grounding_sources_owner_admin_insert'
       AND cmd='INSERT'
       AND roles = ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'grounding_source_owner_admin_insert_policy_missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='storage'
       AND tablename='objects'
       AND policyname LIKE 'organization_grounding_sources_%'
       AND cmd IN ('UPDATE','DELETE')
  ) THEN
    RAISE EXCEPTION 'grounding_source_mutable_policy_forbidden';
  END IF;
END
$$;

BEGIN;

INSERT INTO wandora.organizations(id, slug, display_name, status) VALUES
  ('d1000000-0000-4000-8000-000000000001','source-a','Source A','active'),
  ('d1000000-0000-4000-8000-000000000002','source-b','Source B','active');

INSERT INTO wandora.users(id, display_name) VALUES
  ('d2000000-0000-4000-8000-000000000001','Source Owner'),
  ('d2000000-0000-4000-8000-000000000002','Source Admin'),
  ('d2000000-0000-4000-8000-000000000003','Source Member'),
  ('d2000000-0000-4000-8000-000000000004','Other Owner');

INSERT INTO wandora.user_identities(user_id,provider,provider_subject) VALUES
  ('d2000000-0000-4000-8000-000000000001','supabase','source-owner-sub'),
  ('d2000000-0000-4000-8000-000000000002','supabase','source-admin-sub'),
  ('d2000000-0000-4000-8000-000000000003','supabase','source-member-sub'),
  ('d2000000-0000-4000-8000-000000000004','supabase','source-other-sub');

INSERT INTO wandora.memberships(organization_id,user_id,role,status) VALUES
  ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','owner','active'),
  ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002','admin','active'),
  ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000003','member','active'),
  ('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000004','owner','active');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','source-owner-sub',true);

INSERT INTO storage.objects(id,bucket_id,name)
VALUES (
  'd3000000-0000-4000-8000-000000000001',
  'organization-grounding-sources',
  'd1000000-0000-4000-8000-000000000001/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/precos.pdf'
);

DO $$
DECLARE c integer;
BEGIN
  SELECT count(*)::integer INTO c
    FROM storage.objects
   WHERE bucket_id='organization-grounding-sources';
  IF c <> 1 THEN RAISE EXCEPTION 'grounding_source_owner_insert_or_read_failed:%', c; END IF;
END
$$;

SELECT set_config('request.jwt.claim.sub','source-member-sub',true);

DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects(id,bucket_id,name)
    VALUES (
      'd3000000-0000-4000-8000-000000000002',
      'organization-grounding-sources',
      'd1000000-0000-4000-8000-000000000001/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/normas.pdf'
    );
    RAISE EXCEPTION 'grounding_source_member_insert_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

DO $$
DECLARE c integer;
BEGIN
  SELECT count(*)::integer INTO c
    FROM storage.objects
   WHERE bucket_id='organization-grounding-sources';
  IF c <> 1 THEN RAISE EXCEPTION 'grounding_source_member_read_failed:%', c; END IF;
END
$$;

SELECT set_config('request.jwt.claim.sub','source-other-sub',true);

DO $$
DECLARE c integer;
BEGIN
  SELECT count(*)::integer INTO c
    FROM storage.objects
   WHERE bucket_id='organization-grounding-sources';
  IF c <> 0 THEN RAISE EXCEPTION 'grounding_source_cross_tenant_read_visible:%', c; END IF;
END
$$;

SELECT set_config('request.jwt.claim.sub','source-owner-sub',true);

DO $$
BEGIN
  BEGIN
    UPDATE storage.objects
       SET name = 'd1000000-0000-4000-8000-000000000001/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/alterado.pdf'
     WHERE id='d3000000-0000-4000-8000-000000000001';
    IF FOUND THEN RAISE EXCEPTION 'grounding_source_update_unexpectedly_allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    DELETE FROM storage.objects
     WHERE id='d3000000-0000-4000-8000-000000000001';
    IF FOUND THEN RAISE EXCEPTION 'grounding_source_delete_unexpectedly_allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO storage.objects(id,bucket_id,name)
    VALUES (
      'd3000000-0000-4000-8000-000000000003',
      'organization-grounding-sources',
      'd1000000-0000-4000-8000-000000000001/not-a-sha256/file.pdf'
    );
    RAISE EXCEPTION 'grounding_source_invalid_path_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

ROLLBACK;

SELECT 'ORGANIZATION_GROUNDING_SOURCE_STORAGE_V1_VERIFY_OK';
