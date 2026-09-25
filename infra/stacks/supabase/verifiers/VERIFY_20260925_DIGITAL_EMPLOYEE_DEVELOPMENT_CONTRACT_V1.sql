\set ON_ERROR_STOP on

DO $$
DECLARE
  role_name text;
  rls_enabled boolean;
BEGIN
  IF to_regclass('wandora.digital_employee_development_entries') IS NULL THEN
    RAISE EXCEPTION 'digital_employee_development_entries_missing';
  END IF;

  SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
   WHERE oid = 'wandora.digital_employee_development_entries'::regclass;
  IF rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'digital_employee_development_entries_rls_disabled';
  END IF;

  IF NOT has_table_privilege('wandora_core_runtime','wandora.digital_employee_development_entries','SELECT') THEN
    RAISE EXCEPTION 'digital_employee_development_runtime_select_missing';
  END IF;

  IF has_table_privilege('wandora_core_runtime','wandora.digital_employee_development_entries','INSERT')
     OR has_table_privilege('wandora_core_runtime','wandora.digital_employee_development_entries','UPDATE')
     OR has_table_privilege('wandora_core_runtime','wandora.digital_employee_development_entries','DELETE')
  THEN
    RAISE EXCEPTION 'digital_employee_development_runtime_direct_write_present';
  END IF;

  IF NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.create_digital_employee_development_entry(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.retire_digital_employee_development_entry(uuid,uuid,uuid,uuid,text,timestamptz)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.correct_digital_employee_development_entry(uuid,uuid,uuid,uuid,uuid,text,text,text,text,timestamptz)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'digital_employee_development_bounded_mutation_function_missing';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
       AND (
         has_table_privilege(role_name,'wandora.digital_employee_development_entries','SELECT')
         OR has_table_privilege(role_name,'wandora.digital_employee_development_entries','INSERT')
         OR has_table_privilege(role_name,'wandora.digital_employee_development_entries','UPDATE')
         OR has_table_privilege(role_name,'wandora.digital_employee_development_entries','DELETE')
       )
    THEN
      RAISE EXCEPTION 'role % unexpectedly accesses employee development table', role_name;
    END IF;
  END LOOP;
END
$$;

BEGIN;

INSERT INTO wandora.organizations(id,slug,display_name,status) VALUES
  ('e1000000-0000-4000-8000-000000000001','development-a','Development A','active'),
  ('e1000000-0000-4000-8000-000000000002','development-b','Development B','active');

INSERT INTO wandora.users(id,display_name) VALUES
  ('e2000000-0000-4000-8000-000000000001','Owner'),
  ('e2000000-0000-4000-8000-000000000002','Admin'),
  ('e2000000-0000-4000-8000-000000000003','Member');

INSERT INTO wandora.memberships(organization_id,user_id,role,status) VALUES
  ('e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','owner','active'),
  ('e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000002','admin','active'),
  ('e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000003','member','active'),
  ('e1000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000003','owner','active');

INSERT INTO wandora.digital_employees(
  id,organization_id,display_name,role,status,autonomy_mode
) VALUES
  ('e3000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','Ana','commercial-assistant','active','supervised'),
  ('e3000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000002','Ana','commercial-assistant','active','supervised');

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config('wandora.organization_id','e1000000-0000-4000-8000-000000000001',true);

SELECT wandora.create_digital_employee_development_entry(
  'e1000000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000001',
  'e4000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'responsibility',
  'Priorizar qualificacao comercial antes de encaminhar oportunidades.',
  'owner_statement',
  NULL,
  NULL,
  'development-create-owner-v1',
  '2026-09-25T08:00:00Z'
);

SELECT wandora.create_digital_employee_development_entry(
  'e1000000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000001',
  'e4000000-0000-4000-8000-000000000002',
  'e2000000-0000-4000-8000-000000000002',
  'practice',
  'Ao listar produtos, apresentar nome, codigo, preco e estoque nesta ordem.',
  'approved_learning',
  'wandora-work:e5000000-0000-4000-8000-000000000001',
  'Trabalho revisado pelo owner',
  'development-create-learning-v1',
  '2026-09-25T08:01:00Z'
);

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer INTO v_count
    FROM wandora.digital_employee_development_entries
   WHERE organization_id = 'e1000000-0000-4000-8000-000000000001'
     AND employee_id = 'e3000000-0000-4000-8000-000000000001'
     AND status = 'active';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'employee_development_owner_admin_create_failed:%', v_count;
  END IF;

  BEGIN
    PERFORM wandora.create_digital_employee_development_entry(
      'e1000000-0000-4000-8000-000000000001',
      'e3000000-0000-4000-8000-000000000001',
      'e4000000-0000-4000-8000-000000000003',
      'e2000000-0000-4000-8000-000000000003',
      'behavior',
      'Member cannot create guidance.',
      'owner_statement',
      NULL,
      NULL,
      'development-member-denied',
      '2026-09-25T08:02:00Z'
    );
    RAISE EXCEPTION 'employee_development_member_write_unexpectedly_allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%employee_development_mutation_forbidden%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM wandora.create_digital_employee_development_entry(
      'e1000000-0000-4000-8000-000000000001',
      'e3000000-0000-4000-8000-000000000001',
      'e4000000-0000-4000-8000-000000000004',
      'e2000000-0000-4000-8000-000000000001',
      'practice',
      'Learning without evidence must fail.',
      'approved_learning',
      NULL,
      NULL,
      'development-learning-source-required',
      '2026-09-25T08:03:00Z'
    );
    RAISE EXCEPTION 'approved_learning_without_source_unexpectedly_allowed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO wandora.digital_employee_development_entries(
      id,organization_id,employee_id,entry_kind,content,provenance_type,created_by_user_id
    ) VALUES (
      'e4000000-0000-4000-8000-000000000005',
      'e1000000-0000-4000-8000-000000000001',
      'e3000000-0000-4000-8000-000000000001',
      'behavior',
      'Core direct writes must fail.',
      'owner_statement',
      'e2000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'employee_development_runtime_direct_write_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

SELECT wandora.correct_digital_employee_development_entry(
  'e1000000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000001',
  'e4000000-0000-4000-8000-000000000002',
  'e4000000-0000-4000-8000-000000000006',
  'e2000000-0000-4000-8000-000000000001',
  'Ao listar produtos, apresentar nome, codigo, estoque e preco nesta ordem.',
  'wandora-review:owner:e5000000-0000-4000-8000-000000000001',
  'Correcao aprovada',
  'development-correct-owner-v1',
  '2026-09-25T08:04:00Z'
);

DO $$
DECLARE
  old_status text;
  new_status text;
  new_kind text;
  new_provenance text;
  new_supersedes uuid;
BEGIN
  SELECT status INTO old_status
    FROM wandora.digital_employee_development_entries
   WHERE id = 'e4000000-0000-4000-8000-000000000002';

  SELECT status, entry_kind, provenance_type, supersedes_entry_id
    INTO new_status, new_kind, new_provenance, new_supersedes
    FROM wandora.digital_employee_development_entries
   WHERE id = 'e4000000-0000-4000-8000-000000000006';

  IF old_status <> 'retired'
     OR new_status <> 'active'
     OR new_kind <> 'practice'
     OR new_provenance <> 'approved_correction'
     OR new_supersedes <> 'e4000000-0000-4000-8000-000000000002'::uuid
  THEN
    RAISE EXCEPTION 'employee_development_correction_history_failed';
  END IF;

  PERFORM set_config('wandora.organization_id','e1000000-0000-4000-8000-000000000002',true);
  SELECT count(*)::integer INTO old_status
    FROM wandora.digital_employee_development_entries;
EXCEPTION WHEN datatype_mismatch THEN
  -- The count assignment above is intentionally not used as a cross-tenant assertion.
  NULL;
END
$$;

SELECT set_config('wandora.organization_id','e1000000-0000-4000-8000-000000000001',true);

SELECT wandora.retire_digital_employee_development_entry(
  'e1000000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000001',
  'e4000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000002',
  'development-retire-admin-v1',
  '2026-09-25T08:05:00Z'
);

DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('wandora.organization_id','e1000000-0000-4000-8000-000000000002',true);
  SELECT count(*)::integer INTO v_count
    FROM wandora.digital_employee_development_entries;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'employee_development_cross_tenant_read_visible:%', v_count;
  END IF;

  BEGIN
    PERFORM wandora.retire_digital_employee_development_entry(
      'e1000000-0000-4000-8000-000000000001',
      'e3000000-0000-4000-8000-000000000001',
      'e4000000-0000-4000-8000-000000000006',
      'e2000000-0000-4000-8000-000000000001',
      'development-cross-tenant',
      '2026-09-25T08:06:00Z'
    );
    RAISE EXCEPTION 'employee_development_cross_tenant_write_unexpectedly_allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%employee_development_tenant_mismatch%' THEN RAISE; END IF;
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
   WHERE organization_id = 'e1000000-0000-4000-8000-000000000001'
     AND action IN (
       'employee-development-created',
       'employee-development-retired',
       'employee-development-corrected'
     );
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'employee_development_audit_evidence_failed:%', v_count;
  END IF;
END
$$;

ROLLBACK;

SELECT 'DIGITAL_EMPLOYEE_DEVELOPMENT_CONTRACT_V1_OK' AS verifier;
