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

  IF NOT has_table_privilege(
    'wandora_core_runtime',
    'wandora.organization_grounding_entries',
    'SELECT'
  ) THEN
    RAISE EXCEPTION 'organization_grounding_entries_runtime_select_missing';
  END IF;

  IF has_table_privilege('wandora_core_runtime','wandora.organization_grounding_entries','INSERT')
     OR has_table_privilege('wandora_core_runtime','wandora.organization_grounding_entries','UPDATE')
     OR has_table_privilege('wandora_core_runtime','wandora.organization_grounding_entries','DELETE')
  THEN
    RAISE EXCEPTION 'organization_grounding_entries_runtime_write_present';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
       AND (
         has_table_privilege(role_name, 'wandora.organization_grounding_entries', 'SELECT')
         OR has_table_privilege(role_name, 'wandora.organization_grounding_entries', 'INSERT')
         OR has_table_privilege(role_name, 'wandora.organization_grounding_entries', 'UPDATE')
         OR has_table_privilege(role_name, 'wandora.organization_grounding_entries', 'DELETE')
       )
    THEN
      RAISE EXCEPTION 'role % unexpectedly accesses organization grounding entries', role_name;
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
  ('c2000000-0000-4000-8000-000000000001', 'Grounding Owner');

INSERT INTO wandora.organization_grounding_entries (
  id, organization_id, entry_type, content, provenance_type,
  source_ref, source_label, created_by_user_id
) VALUES
  (
    'c3000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'fact',
    'A empresa atende somente as unidades aprovadas pelo owner.',
    'approved_source',
    'source:company-profile:v1',
    'Perfil oficial da empresa',
    'c2000000-0000-4000-8000-000000000001'
  ),
  (
    'c3000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'rule',
    'Nunca apresentar quantidade de clientes como fato sem fonte oficial ativa.',
    'owner_statement',
    NULL,
    NULL,
    'c2000000-0000-4000-8000-000000000001'
  );

DO $$
BEGIN
  BEGIN
    INSERT INTO wandora.organization_grounding_entries (
      id, organization_id, entry_type, content, provenance_type, created_by_user_id
    ) VALUES (
      'c3000000-0000-4000-8000-000000000003',
      'c1000000-0000-4000-8000-000000000001',
      'fact',
      'Este fato deveria ser rejeitado por ausência de source_ref.',
      'approved_source',
      'c2000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'approved_source_without_ref_unexpectedly_allowed';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$$;

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config(
  'wandora.organization_id',
  'c1000000-0000-4000-8000-000000000001',
  true
);

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer INTO v_count
    FROM wandora.organization_grounding_entries
   WHERE status = 'active';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'organization_grounding_tenant_read_failed:%', v_count;
  END IF;

  PERFORM set_config(
    'wandora.organization_id',
    'c1000000-0000-4000-8000-000000000002',
    true
  );

  SELECT count(*)::integer INTO v_count
    FROM wandora.organization_grounding_entries;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'organization_grounding_cross_tenant_read_visible:%', v_count;
  END IF;

  BEGIN
    INSERT INTO wandora.organization_grounding_entries (
      id, organization_id, entry_type, content, provenance_type, created_by_user_id
    ) VALUES (
      'c3000000-0000-4000-8000-000000000004',
      'c1000000-0000-4000-8000-000000000002',
      'rule',
      'Core runtime must not write grounding.',
      'owner_statement',
      'c2000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'organization_grounding_runtime_write_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

RESET ROLE;
ROLLBACK;

SELECT 'ORGANIZATION_GROUNDING_CONTRACT_V1_OK' AS verifier;