\set ON_ERROR_STOP on

DO $$
DECLARE
  role_name text;
  rls_enabled boolean;
BEGIN
  IF to_regclass('wandora.digital_employee_guidance_entries') IS NULL THEN
    RAISE EXCEPTION 'digital_employee_guidance_entries_missing';
  END IF;

  SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
   WHERE oid = 'wandora.digital_employee_guidance_entries'::regclass;
  IF rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'digital_employee_guidance_entries_rls_disabled';
  END IF;

  IF NOT has_table_privilege('wandora_core_runtime','wandora.digital_employee_guidance_entries','SELECT') THEN
    RAISE EXCEPTION 'digital_employee_guidance_runtime_select_missing';
  END IF;

  IF has_table_privilege('wandora_core_runtime','wandora.digital_employee_guidance_entries','INSERT')
     OR has_table_privilege('wandora_core_runtime','wandora.digital_employee_guidance_entries','UPDATE')
     OR has_table_privilege('wandora_core_runtime','wandora.digital_employee_guidance_entries','DELETE')
  THEN
    RAISE EXCEPTION 'digital_employee_guidance_runtime_direct_write_present';
  END IF;

  IF NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.create_digital_employee_guidance_entry(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.retire_digital_employee_guidance_entry(uuid,uuid,uuid,uuid,text,timestamptz)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.correct_digital_employee_guidance_entry(uuid,uuid,uuid,uuid,uuid,text,text,text,text,timestamptz)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'digital_employee_guidance_bounded_mutation_function_missing';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
       AND (
         has_table_privilege(role_name,'wandora.digital_employee_guidance_entries','SELECT')
         OR has_table_privilege(role_name,'wandora.digital_employee_guidance_entries','INSERT')
         OR has_table_privilege(role_name,'wandora.digital_employee_guidance_entries','UPDATE')
         OR has_table_privilege(role_name,'wandora.digital_employee_guidance_entries','DELETE')
         OR has_function_privilege(
           role_name,
           'wandora.create_digital_employee_guidance_entry(uuid,uuid,uuid,uuid,text,text,text,text,text,text,timestamptz)',
           'EXECUTE'
         )
         OR has_function_privilege(
           role_name,
           'wandora.retire_digital_employee_guidance_entry(uuid,uuid,uuid,uuid,text,timestamptz)',
           'EXECUTE'
         )
         OR has_function_privilege(
           role_name,
           'wandora.correct_digital_employee_guidance_entry(uuid,uuid,uuid,uuid,uuid,text,text,text,text,timestamptz)',
           'EXECUTE'
         )
       )
    THEN
      RAISE EXCEPTION 'role % unexpectedly accesses digital employee guidance', role_name;
    END IF;
  END LOOP;
END
$$;

BEGIN;

INSERT INTO wandora.organizations(id, slug, display_name, status) VALUES
  ('d1000000-0000-4000-8000-000000000001','guidance-a','Guidance A','active'),
  ('d1000000-0000-4000-8000-000000000002','guidance-b','Guidance B','active');

INSERT INTO wandora.users(id, display_name) VALUES
  ('d2000000-0000-4000-8000-000000000001','Guidance Owner'),
  ('d2000000-0000-4000-8000-000000000002','Guidance Admin'),
  ('d2000000-0000-4000-8000-000000000003','Guidance Member');

INSERT INTO wandora.memberships(organization_id,user_id,role,status) VALUES
  ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','owner','active'),
  ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002','admin','active'),
  ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000003','member','active'),
  ('d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000003','owner','active');

INSERT INTO wandora.digital_employees(
  id, organization_id, display_name, role, status, autonomy_mode
) VALUES
  ('d3000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Ana','commercial-assistant','active','supervised'),
  ('d3000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','Ana','commercial-assistant','active','supervised');

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config('wandora.organization_id','d1000000-0000-4000-8000-000000000001',true);

SELECT wandora.create_digital_employee_guidance_entry(
  'd1000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  'responsibility',
  'Priorizar a qualificacao comercial antes de sugerir o proximo passo.',
  'owner_statement',
  NULL,
  NULL,
  'guidance-create-owner-v1',
  '2026-09-25T08:00:00Z'
);

SELECT wandora.create_digital_employee_guidance_entry(
  'd1000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000002',
  'd2000000-0000-4000-8000-000000000002',
  'practice',
  'Apresentar nome, codigo, preco e estoque nesta ordem quando revisar produtos.',
  'approved_evidence',
  'work-review:owner:2026-09-25',
  'Revisao humana do trabalho',
  'guidance-create-admin-v1',
  '2026-09-25T08:01:00Z'
);

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer INTO v_count
    FROM wandora.digital_employee_guidance_entries
   WHERE organization_id = 'd1000000-0000-4000-8000-000000000001'
     AND employee_id = 'd3000000-0000-4000-8000-000000000001'
     AND status = 'active';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'guidance_owner_admin_create_failed:%', v_count;
  END IF;

  BEGIN
    PERFORM wandora.create_digital_employee_guidance_entry(
      'd1000000-0000-4000-8000-000000000001',
      'd3000000-0000-4000-8000-000000000001',
      'd4000000-0000-4000-8000-000000000003',
      'd2000000-0000-4000-8000-000000000003',
      'behavior',
      'Member must not teach.',
      'owner_statement',
      NULL,
      NULL,
      'guidance-member-denied-v1',
      '2026-09-25T08:02:00Z'
    );
    RAISE EXCEPTION 'guidance_member_write_unexpectedly_allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%employee_guidance_mutation_forbidden%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM wandora.create_digital_employee_guidance_entry(
      'd1000000-0000-4000-8000-000000000001',
      'd3000000-0000-4000-8000-000000000001',
      'd4000000-0000-4000-8000-000000000004',
      'd2000000-0000-4000-8000-000000000001',
      'practice',
      'Evidence-required learning.',
      'approved_evidence',
      NULL,
      NULL,
      'guidance-evidence-required-v1',
      '2026-09-25T08:03:00Z'
    );
    RAISE EXCEPTION 'approved_evidence_without_ref_unexpectedly_allowed';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO wandora.digital_employee_guidance_entries(
      id, organization_id, employee_id, entry_type, content, provenance_type, created_by_user_id
    ) VALUES (
      'd4000000-0000-4000-8000-000000000005',
      'd1000000-0000-4000-8000-000000000001',
      'd3000000-0000-4000-8000-000000000001',
      'behavior',
      'Core runtime must not write directly.',
      'owner_statement',
      'd2000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'guidance_runtime_direct_write_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

SELECT wandora.correct_digital_employee_guidance_entry(
  'd1000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000006',
  'd2000000-0000-4000-8000-000000000001',
  'Priorizar a qualificacao comercial e registrar as lacunas antes do proximo passo.',
  'correction:owner-review:2026-09-25',
  'Correcao aprovada pelo owner',
  'guidance-correct-owner-v1',
  '2026-09-25T08:04:00Z'
);

DO $$
DECLARE
  old_status text;
  new_status text;
  new_type text;
  new_provenance text;
  new_supersedes uuid;
BEGIN
  SELECT status INTO old_status
    FROM wandora.digital_employee_guidance_entries
   WHERE id = 'd4000000-0000-4000-8000-000000000001';

  SELECT status, entry_type, provenance_type, supersedes_entry_id
    INTO new_status, new_type, new_provenance, new_supersedes
    FROM wandora.digital_employee_guidance_entries
   WHERE id = 'd4000000-0000-4000-8000-000000000006';

  IF old_status <> 'retired'
     OR new_status <> 'active'
     OR new_type <> 'responsibility'
     OR new_provenance <> 'approved_correction'
     OR new_supersedes <> 'd4000000-0000-4000-8000-000000000001'::uuid
  THEN
    RAISE EXCEPTION 'guidance_correction_history_failed';
  END IF;
END
$$;

SELECT wandora.retire_digital_employee_guidance_entry(
  'd1000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000002',
  'd2000000-0000-4000-8000-000000000002',
  'guidance-retire-admin-v1',
  '2026-09-25T08:05:00Z'
);

SELECT wandora.retire_digital_employee_guidance_entry(
  'd1000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000002',
  'd2000000-0000-4000-8000-000000000002',
  'guidance-retire-admin-v1',
  '2026-09-25T08:05:00Z'
);

DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('wandora.organization_id','d1000000-0000-4000-8000-000000000002',true);
  SELECT count(*)::integer INTO v_count
    FROM wandora.digital_employee_guidance_entries;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'guidance_cross_tenant_read_visible:%', v_count;
  END IF;

  BEGIN
    PERFORM wandora.retire_digital_employee_guidance_entry(
      'd1000000-0000-4000-8000-000000000001',
      'd3000000-0000-4000-8000-000000000001',
      'd4000000-0000-4000-8000-000000000006',
      'd2000000-0000-4000-8000-000000000001',
      'guidance-cross-tenant-v1',
      '2026-09-25T08:06:00Z'
    );
    RAISE EXCEPTION 'guidance_cross_tenant_write_unexpectedly_allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%employee_guidance_tenant_mismatch%' THEN RAISE; END IF;
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
   WHERE organization_id = 'd1000000-0000-4000-8000-000000000001'
     AND action IN (
       'employee-guidance-created',
       'employee-guidance-retired',
       'employee-guidance-corrected'
     );
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'guidance_audit_evidence_failed:%', v_count;
  END IF;
END
$$;

ROLLBACK;

SELECT 'DIGITAL_EMPLOYEE_GUIDANCE_CONTRACT_V1_OK' AS verifier;
