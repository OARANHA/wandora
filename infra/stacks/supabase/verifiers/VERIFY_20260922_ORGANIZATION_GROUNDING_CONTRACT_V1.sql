\set ON_ERROR_STOP on

DO $$
DECLARE
  role_name text;
  rls_enabled boolean;
BEGIN
  IF to_regclass('wandora.organization_grounding_entries') IS NULL THEN
    RAISE EXCEPTION 'organization_grounding_entries_missing';
  END IF;

  SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
   WHERE oid = 'wandora.organization_grounding_entries'::regclass;
  IF rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'organization_grounding_entries_rls_disabled';
  END IF;

  IF NOT has_table_privilege('wandora_core_runtime','wandora.organization_grounding_entries','SELECT') THEN
    RAISE EXCEPTION 'organization_grounding_entries_runtime_select_missing';
  END IF;

  IF has_table_privilege('wandora_core_runtime','wandora.organization_grounding_entries','INSERT')
     OR has_table_privilege('wandora_core_runtime','wandora.organization_grounding_entries','UPDATE')
     OR has_table_privilege('wandora_core_runtime','wandora.organization_grounding_entries','DELETE')
  THEN
    RAISE EXCEPTION 'organization_grounding_entries_runtime_write_present';
  END IF;

  IF NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.create_organization_grounding_entry(uuid,uuid,uuid,text,text,text,text,text,text,timestamptz)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.retire_organization_grounding_entry(uuid,uuid,uuid,text,timestamptz)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.correct_organization_grounding_entry(uuid,uuid,uuid,uuid,text,text,text,text,timestamptz)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'organization_grounding_bounded_mutation_function_missing';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
       AND (
         has_table_privilege(role_name, 'wandora.organization_grounding_entries', 'SELECT')
         OR has_table_privilege(role_name, 'wandora.organization_grounding_entries', 'INSERT')
         OR has_table_privilege(role_name, 'wandora.organization_grounding_entries', 'UPDATE')
         OR has_table_privilege(role_name, 'wandora.organization_grounding_entries', 'DELETE')
         OR has_function_privilege(
           role_name,
           'wandora.create_organization_grounding_entry(uuid,uuid,uuid,text,text,text,text,text,text,timestamptz)',
           'EXECUTE'
         )
         OR has_function_privilege(
           role_name,
           'wandora.retire_organization_grounding_entry(uuid,uuid,uuid,text,timestamptz)',
           'EXECUTE'
         )
         OR has_function_privilege(
           role_name,
           'wandora.correct_organization_grounding_entry(uuid,uuid,uuid,uuid,text,text,text,text,timestamptz)',
           'EXECUTE'
         )
       )
    THEN
      RAISE EXCEPTION 'role % unexpectedly accesses organization grounding contract', role_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora'
       AND tablename = 'organization_grounding_entries'
       AND policyname = 'organization_grounding_entries_core_runtime_read'
       AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'organization_grounding_entries_core_read_policy_missing';
  END IF;
END
$$;

BEGIN;

INSERT INTO wandora.organizations(id, slug, display_name, status) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'grounding-a', 'Grounding A', 'active'),
  ('c1000000-0000-4000-8000-000000000002', 'grounding-b', 'Grounding B', 'active');

INSERT INTO wandora.users(id, display_name) VALUES
  ('c2000000-0000-4000-8000-000000000001', 'Grounding Owner'),
  ('c2000000-0000-4000-8000-000000000002', 'Grounding Admin'),
  ('c2000000-0000-4000-8000-000000000003', 'Grounding Member');

INSERT INTO wandora.memberships(organization_id, user_id, role, status) VALUES
  ('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','owner','active'),
  ('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000002','admin','active'),
  ('c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000003','member','active'),
  ('c1000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000003','owner','active');

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config('wandora.organization_id','c1000000-0000-4000-8000-000000000001',true);

SELECT wandora.create_organization_grounding_entry(
  'c1000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  'fact',
  'A empresa atende somente as unidades aprovadas pelo owner.',
  'approved_source',
  'source:company-profile:v1',
  'Perfil oficial da empresa',
  'grounding-create-owner-v1',
  '2026-09-22T08:00:00Z'
);

SELECT wandora.create_organization_grounding_entry(
  'c1000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000002',
  'rule',
  'Nunca apresentar quantidade de clientes como fato sem fonte oficial ativa.',
  'owner_statement',
  NULL,
  NULL,
  'grounding-create-admin-v1',
  '2026-09-22T08:01:00Z'
);

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer INTO v_count
    FROM wandora.organization_grounding_entries
   WHERE organization_id = 'c1000000-0000-4000-8000-000000000001'
     AND status = 'active';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'organization_grounding_owner_admin_create_failed:%', v_count;
  END IF;

  BEGIN
    PERFORM wandora.create_organization_grounding_entry(
      'c1000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000003',
      'c2000000-0000-4000-8000-000000000003',
      'fact',
      'Member must not write.',
      'owner_statement',
      NULL,
      NULL,
      'grounding-member-denied-v1',
      '2026-09-22T08:02:00Z'
    );
    RAISE EXCEPTION 'grounding_member_write_unexpectedly_allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%grounding_mutation_forbidden%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM wandora.create_organization_grounding_entry(
      'c1000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000004',
      'c2000000-0000-4000-8000-000000000001',
      'fact',
      'Approved source without evidence must fail.',
      'approved_source',
      NULL,
      NULL,
      'grounding-source-required-v1',
      '2026-09-22T08:03:00Z'
    );
    RAISE EXCEPTION 'approved_source_without_ref_unexpectedly_allowed';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO wandora.organization_grounding_entries (
      id, organization_id, entry_type, content, provenance_type, created_by_user_id
    ) VALUES (
      'c3000000-0000-4000-8000-000000000005',
      'c1000000-0000-4000-8000-000000000001',
      'rule',
      'Core runtime must not write grounding directly.',
      'owner_statement',
      'c2000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'organization_grounding_runtime_direct_write_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

SELECT wandora.correct_organization_grounding_entry(
  'c1000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000006',
  'c2000000-0000-4000-8000-000000000001',
  'A empresa atende as unidades listadas no cadastro oficial vigente.',
  'correction:owner-reviewed:2026-09-22',
  'Correcao aprovada pelo owner',
  'grounding-correct-owner-v1',
  '2026-09-22T08:04:00Z'
);

DO $$
DECLARE
  old_status text;
  new_status text;
  new_provenance text;
  new_supersedes uuid;
  old_content text;
BEGIN
  SELECT status, content INTO old_status, old_content
    FROM wandora.organization_grounding_entries
   WHERE id = 'c3000000-0000-4000-8000-000000000001';
  SELECT status, provenance_type, supersedes_entry_id
    INTO new_status, new_provenance, new_supersedes
    FROM wandora.organization_grounding_entries
   WHERE id = 'c3000000-0000-4000-8000-000000000006';

  IF old_status <> 'retired'
     OR old_content <> 'A empresa atende somente as unidades aprovadas pelo owner.'
     OR new_status <> 'active'
     OR new_provenance <> 'approved_correction'
     OR new_supersedes <> 'c3000000-0000-4000-8000-000000000001'::uuid
  THEN
    RAISE EXCEPTION 'grounding_correction_history_failed';
  END IF;

  BEGIN
    PERFORM wandora.correct_organization_grounding_entry(
      'c1000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000002',
      'c3000000-0000-4000-8000-000000000007',
      'c2000000-0000-4000-8000-000000000001',
      'Correction without source must fail.',
      NULL,
      NULL,
      'grounding-correction-source-required-v1',
      '2026-09-22T08:05:00Z'
    );
    RAISE EXCEPTION 'approved_correction_without_ref_unexpectedly_allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%grounding_correction_source_required%' THEN RAISE; END IF;
  END;
END
$$;

SELECT wandora.retire_organization_grounding_entry(
  'c1000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000002',
  'grounding-retire-admin-v1',
  '2026-09-22T08:06:00Z'
);

SELECT wandora.retire_organization_grounding_entry(
  'c1000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000002',
  'grounding-retire-admin-v1',
  '2026-09-22T08:06:00Z'
);

DO $$
BEGIN
  BEGIN
    PERFORM wandora.retire_organization_grounding_entry(
      'c1000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000002',
      'c2000000-0000-4000-8000-000000000002',
      'grounding-retire-admin-v2',
      '2026-09-22T08:06:30Z'
    );
    RAISE EXCEPTION 'grounding_retire_new_key_noop_unexpectedly_allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%grounding_not_active%' THEN RAISE; END IF;
  END;
END
$$;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer INTO v_count
    FROM wandora.organization_grounding_entries
   WHERE status = 'retired';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'grounding_retirement_history_failed:%', v_count;
  END IF;

  PERFORM set_config('wandora.organization_id','c1000000-0000-4000-8000-000000000002',true);
  SELECT count(*)::integer INTO v_count FROM wandora.organization_grounding_entries;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'organization_grounding_cross_tenant_read_visible:%', v_count;
  END IF;

  BEGIN
    PERFORM wandora.retire_organization_grounding_entry(
      'c1000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000006',
      'c2000000-0000-4000-8000-000000000001',
      'grounding-cross-tenant-v1',
      '2026-09-22T08:07:00Z'
    );
    RAISE EXCEPTION 'grounding_cross_tenant_write_unexpectedly_allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%grounding_tenant_mismatch%' THEN RAISE; END IF;
  END;
END
$$;

RESET ROLE;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer INTO v_count
    FROM wandora.audit_records
   WHERE organization_id = 'c1000000-0000-4000-8000-000000000001'
     AND action IN ('grounding-created','grounding-retired','grounding-corrected');
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'grounding_audit_evidence_failed:%', v_count;
  END IF;
END
$$;

ROLLBACK;

SELECT 'ORGANIZATION_GROUNDING_CONTRACT_V1_OK' AS verifier;

[executed on device: wandora-vps-01 (4f062e11-0f3c-4c6e-8f71-7d6136c1bee9)]