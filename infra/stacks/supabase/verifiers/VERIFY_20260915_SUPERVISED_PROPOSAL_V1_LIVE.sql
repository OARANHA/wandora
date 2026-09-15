\set ON_ERROR_STOP on

DO $$
DECLARE
  rls_enabled boolean;
  authenticated_select boolean;
  core_select boolean;
  core_insert boolean;
  core_update boolean;
  core_delete boolean;
  read_policy text;
  insert_policy text;
  commitment_check text;
BEGIN
  IF to_regtype('wandora.work_proposal_kind') IS NULL THEN
    RAISE EXCEPTION 'work_proposal_kind type missing';
  END IF;

  IF to_regclass('wandora.work_proposals') IS NULL THEN
    RAISE EXCEPTION 'work_proposals table missing';
  END IF;

  SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
   WHERE oid = 'wandora.work_proposals'::regclass;
  IF rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'work_proposals RLS is not enabled';
  END IF;

  SELECT has_table_privilege('authenticated', 'wandora.work_proposals', 'SELECT')
    INTO authenticated_select;
  IF authenticated_select THEN
    RAISE EXCEPTION 'authenticated must not read work_proposals directly';
  END IF;

  SELECT has_table_privilege('wandora_core_runtime', 'wandora.work_proposals', 'SELECT'),
         has_table_privilege('wandora_core_runtime', 'wandora.work_proposals', 'INSERT'),
         has_table_privilege('wandora_core_runtime', 'wandora.work_proposals', 'UPDATE'),
         has_table_privilege('wandora_core_runtime', 'wandora.work_proposals', 'DELETE')
    INTO core_select, core_insert, core_update, core_delete;
  IF NOT core_select OR NOT core_insert OR core_update OR core_delete THEN
    RAISE EXCEPTION 'unexpected work_proposals core privileges: select %, insert %, update %, delete %',
      core_select, core_insert, core_update, core_delete;
  END IF;

  SELECT qual INTO read_policy
    FROM pg_policies
   WHERE schemaname = 'wandora'
     AND tablename = 'work_proposals'
     AND policyname = 'work_proposals_core_runtime_read';
  IF read_policy IS NULL OR read_policy NOT LIKE '%current_core_organization_id%' THEN
    RAISE EXCEPTION 'tenant-scoped work_proposals read policy missing';
  END IF;

  SELECT with_check INTO insert_policy
    FROM pg_policies
   WHERE schemaname = 'wandora'
     AND tablename = 'work_proposals'
     AND policyname = 'work_proposals_core_runtime_insert';
  IF insert_policy IS NULL OR insert_policy NOT LIKE '%current_core_organization_id%' THEN
    RAISE EXCEPTION 'tenant-scoped work_proposals insert policy missing';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO commitment_check
    FROM pg_constraint
   WHERE conrelid = 'wandora.work_proposals'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%commitment%none%';
  IF commitment_check IS NULL THEN
    RAISE EXCEPTION 'commitment=none constraint missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'wandora.work_proposals'::regclass
       AND contype = 'u'
       AND pg_get_constraintdef(oid) LIKE '%organization_id, source_event_id%'
  ) THEN
    RAISE EXCEPTION 'organization/source_event uniqueness missing';
  END IF;
END
$$;

SELECT 'SUPERVISED_PROPOSAL_V1_LIVE_OK' AS verifier;
