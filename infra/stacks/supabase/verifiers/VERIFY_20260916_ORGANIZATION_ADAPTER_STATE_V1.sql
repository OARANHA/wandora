\set ON_ERROR_STOP on

DO $$
DECLARE
  table_name text;
  policy_count integer;
  sensitive_column_count integer;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'control_plane_provider_bindings',
    'digital_employee_provider_bindings',
    'digital_employee_hire_operations'
  ]
  LOOP
    IF to_regclass('wandora_private.' || table_name) IS NULL THEN
      RAISE EXCEPTION 'organization_adapter_state_missing_table:%', table_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'wandora_private'
        AND c.relname = table_name
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'organization_adapter_state_rls_disabled:%', table_name;
    END IF;

    SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'wandora_private' AND tablename = table_name;
    IF policy_count <> 0 THEN
      RAISE EXCEPTION 'organization_adapter_state_must_remain_inert:%:%', table_name, policy_count;
    END IF;

    IF has_table_privilege('authenticated', 'wandora_private.' || table_name, 'SELECT,INSERT,UPDATE,DELETE')
       OR has_table_privilege('wandora_core_runtime', 'wandora_private.' || table_name, 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'organization_adapter_state_unexpected_application_privilege:%', table_name;
    END IF;
  END LOOP;

  SELECT count(*) INTO sensitive_column_count
  FROM information_schema.columns
  WHERE table_schema = 'wandora_private'
    AND table_name IN (
      'control_plane_provider_bindings',
      'digital_employee_provider_bindings',
      'digital_employee_hire_operations'
    )
    AND column_name ~* '(secret|credential|token|password|api.?key)';
  IF sensitive_column_count <> 0 THEN
    RAISE EXCEPTION 'organization_adapter_state_contains_secret_like_columns:%', sensitive_column_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'wandora_private.digital_employee_hire_operations'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%organization_id, employee_id, provider%'
  ) THEN
    RAISE EXCEPTION 'organization_adapter_state_employee_provider_uniqueness_missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'wandora_private.digital_employee_hire_operations'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE '%employee_id%REFERENCES wandora.digital_employees%'
  ) THEN
    RAISE EXCEPTION 'organization_adapter_state_reserved_employee_must_not_require_existing_employee';
  END IF;
END
$$;

BEGIN;

INSERT INTO wandora.organizations (id, slug, display_name)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'adapter-proof-a', 'Adapter Proof A'),
  ('11111111-1111-4111-8111-111111111102', 'adapter-proof-b', 'Adapter Proof B');

INSERT INTO wandora.digital_employees
  (id, organization_id, display_name, role, status, autonomy_mode)
VALUES
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101',
   'Ana Proof', 'commercial-assistant', 'active', 'supervised');

INSERT INTO wandora_private.control_plane_provider_bindings
  (organization_id, provider, provider_company_ref)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'paperclip', 'paperclip-company-proof-a');

INSERT INTO wandora_private.digital_employee_provider_bindings
  (organization_id, employee_id, provider, provider_agent_ref)
VALUES
  ('11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201',
   'paperclip', 'paperclip-agent-proof-a');

INSERT INTO wandora_private.digital_employee_hire_operations
  (organization_id, idempotency_key, request_hash, employee_id, provider, status)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'hire-proof-v1',
   repeat('a', 64), '33333333-3333-4333-8333-333333333301', 'paperclip', 'planned');

DO $$
BEGIN
  BEGIN
    INSERT INTO wandora_private.control_plane_provider_bindings
      (organization_id, provider, provider_company_ref)
    VALUES
      ('11111111-1111-4111-8111-111111111102', 'paperclip', 'paperclip-company-proof-a');
    RAISE EXCEPTION 'expected_provider_company_uniqueness_failure';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO wandora_private.digital_employee_provider_bindings
      (organization_id, employee_id, provider, provider_agent_ref)
    VALUES
      ('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222201',
       'paperclip', 'paperclip-agent-other');
    RAISE EXCEPTION 'expected_cross_org_employee_binding_failure';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO wandora_private.digital_employee_hire_operations
      (organization_id, idempotency_key, request_hash, employee_id, provider, status)
    VALUES
      ('11111111-1111-4111-8111-111111111101', 'hire-proof-v2',
       repeat('b', 64), '33333333-3333-4333-8333-333333333301', 'paperclip', 'planned');
    RAISE EXCEPTION 'expected_reserved_employee_uniqueness_failure';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE wandora_private.digital_employee_hire_operations
       SET status = 'completed'
     WHERE organization_id = '11111111-1111-4111-8111-111111111101'
       AND idempotency_key = 'hire-proof-v1';
    RAISE EXCEPTION 'expected_completed_consistency_failure';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$$;

UPDATE wandora_private.digital_employee_hire_operations
   SET status = 'completed',
       provider_agent_ref = 'paperclip-agent-proof-final',
       completed_at = now()
 WHERE organization_id = '11111111-1111-4111-8111-111111111101'
   AND idempotency_key = 'hire-proof-v1';

DO $$
DECLARE
  operation_status text;
BEGIN
  SELECT status INTO operation_status
  FROM wandora_private.digital_employee_hire_operations
  WHERE organization_id = '11111111-1111-4111-8111-111111111101'
    AND idempotency_key = 'hire-proof-v1';
  IF operation_status <> 'completed' THEN
    RAISE EXCEPTION 'organization_adapter_state_valid_completion_failed:%', operation_status;
  END IF;
END
$$;

ROLLBACK;

SELECT 'ORGANIZATION_ADAPTER_STATE_V1_OK' AS result;
