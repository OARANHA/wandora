\set ON_ERROR_STOP on

DO $$
DECLARE
  role_name text;
BEGIN
  IF to_regclass('wandora_private.digital_employee_work_operations') IS NULL THEN
    RAISE EXCEPTION 'digital_employee_work_operations_missing';
  END IF;

  IF NOT has_table_privilege(
    'wandora_core_runtime',
    'wandora_private.digital_employee_work_operations',
    'SELECT'
  ) THEN
    RAISE EXCEPTION 'digital_employee_work_operations_runtime_select_missing';
  END IF;

  IF has_table_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_work_operations',
       'INSERT'
     )
     OR has_table_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_work_operations',
       'UPDATE'
     )
  THEN
    RAISE EXCEPTION 'digital_employee_work_operations_runtime_table_write_too_broad';
  END IF;

  IF NOT (
    has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','id','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','organization_id','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','employee_id','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','created_by_user_id','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','idempotency_key','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','request_hash','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','title','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','description','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','provider','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','catalog_key','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','provider_company_ref','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','provider_agent_ref','INSERT')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','status','INSERT')
  ) THEN
    RAISE EXCEPTION 'digital_employee_work_operations_runtime_insert_columns_missing';
  END IF;

  IF NOT (
    has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','status','UPDATE')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','provider_run_ref','UPDATE')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','execution_id','UPDATE')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','result_model','UPDATE')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','result_summary','UPDATE')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','submitted_at','UPDATE')
    AND has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_work_operations','result_recorded_at','UPDATE')
  ) THEN
    RAISE EXCEPTION 'digital_employee_work_operations_runtime_update_columns_missing';
  END IF;

  IF has_column_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_work_operations',
       'title',
       'UPDATE'
     )
     OR has_column_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_work_operations',
       'description',
       'UPDATE'
     )
     OR has_column_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_work_operations',
       'provider_company_ref',
       'UPDATE'
     )
     OR has_column_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_work_operations',
       'provider_agent_ref',
       'UPDATE'
     )
  THEN
    RAISE EXCEPTION 'digital_employee_work_operations_immutable_columns_writable';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
       AND (
         has_table_privilege(
           role_name,
           'wandora_private.digital_employee_work_operations',
           'SELECT'
         )
         OR has_any_column_privilege(
           role_name,
           'wandora_private.digital_employee_work_operations',
           'INSERT'
         )
         OR has_any_column_privilege(
           role_name,
           'wandora_private.digital_employee_work_operations',
           'UPDATE'
         )
       )
    THEN
      RAISE EXCEPTION 'role % unexpectedly accesses digital employee work journal', role_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_work_operations'
       AND policyname = 'digital_employee_work_operations_core_runtime_read'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_work_operations'
       AND policyname = 'digital_employee_work_operations_core_runtime_insert'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_work_operations'
       AND policyname = 'digital_employee_work_operations_core_runtime_update'
  ) THEN
    RAISE EXCEPTION 'digital_employee_work_operations_rls_policy_missing';
  END IF;
END
$$;

BEGIN;

INSERT INTO wandora.organizations(id, slug, display_name, status) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'work-admission-a', 'Work Admission A', 'active'),
  ('b1000000-0000-4000-8000-000000000002', 'work-admission-b', 'Work Admission B', 'active');

INSERT INTO wandora.users(id, display_name) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'Work Owner');

INSERT INTO wandora.digital_employees
  (id, organization_id, display_name, role, status, autonomy_mode)
VALUES
  ('b3000000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001',
   'Ana', 'commercial-assistant', 'active', 'supervised');

INSERT INTO wandora_private.control_plane_provider_bindings
  (organization_id, provider, provider_company_ref)
VALUES
  ('b1000000-0000-4000-8000-000000000001', 'paperclip', 'work-admission-company-a');

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config(
  'wandora.organization_id',
  'b1000000-0000-4000-8000-000000000001',
  true
);

INSERT INTO wandora_private.digital_employee_work_operations (
  id,
  organization_id,
  employee_id,
  created_by_user_id,
  idempotency_key,
  request_hash,
  title,
  description,
  provider,
  catalog_key,
  provider_company_ref,
  provider_agent_ref,
  status
) VALUES (
  'b4000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'b3000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000001',
  'work-admission-key-a',
  repeat('a', 64),
  'Preparar resumo comercial',
  'Preparar um resumo interno e supervisionado, sem envio externo.',
  'paperclip',
  'ana-commercial-v1',
  'work-admission-company-a',
  'managed:v1:' || repeat('b', 64),
  'planned'
);

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer
    INTO v_count
    FROM wandora_private.digital_employee_work_operations
   WHERE organization_id = 'b1000000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'digital_employee_work_operations_tenant_read_failed:%', v_count;
  END IF;

  UPDATE wandora_private.digital_employee_work_operations
     SET status = 'submitted',
         submitted_at = now()
   WHERE organization_id = 'b1000000-0000-4000-8000-000000000001'
     AND id = 'b4000000-0000-4000-8000-000000000001';

  BEGIN
    UPDATE wandora_private.digital_employee_work_operations
       SET title = 'forbidden mutation'
     WHERE id = 'b4000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'digital_employee_work_immutable_update_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config(
    'wandora.organization_id',
    'b1000000-0000-4000-8000-000000000002',
    true
  );

  SELECT count(*)::integer
    INTO v_count
    FROM wandora_private.digital_employee_work_operations;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'digital_employee_work_cross_tenant_read_visible:%', v_count;
  END IF;

  BEGIN
    INSERT INTO wandora_private.digital_employee_work_operations (
      id,
      organization_id,
      employee_id,
      created_by_user_id,
      idempotency_key,
      request_hash,
      title,
      description,
      provider,
      catalog_key,
      provider_company_ref,
      provider_agent_ref,
      status
    ) VALUES (
      'b4000000-0000-4000-8000-000000000002',
      'b1000000-0000-4000-8000-000000000001',
      'b3000000-0000-4000-8000-000000000001',
      'b2000000-0000-4000-8000-000000000001',
      'cross-tenant-key',
      repeat('c', 64),
      'Cross tenant',
      'Must not be inserted.',
      'paperclip',
      'ana-commercial-v1',
      'work-admission-company-a',
      'managed:v1:' || repeat('d', 64),
      'planned'
    );
    RAISE EXCEPTION 'digital_employee_work_cross_tenant_insert_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

RESET ROLE;
ROLLBACK;

SELECT 'DIGITAL_EMPLOYEE_WORK_ADMISSION_V1_OK' AS verifier;
