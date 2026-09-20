\set ON_ERROR_STOP on

DO $$
DECLARE
  role_name text;
BEGIN
  IF has_table_privilege('wandora_core_runtime', 'wandora.digital_employees', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora.digital_employees', 'status', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora.digital_employees', 'updated_at', 'UPDATE')
  THEN
    RAISE EXCEPTION 'activation_projection_must_not_grant_direct_employee_update';
  END IF;

  IF NOT has_function_privilege(
       'wandora_core_runtime',
       'wandora_private.lock_catalog_digital_employee_activation_v1(uuid,uuid)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'wandora_core_runtime',
       'wandora_private.activate_catalog_digital_employee_projection_v1(uuid,uuid)',
       'EXECUTE'
     )
  THEN
    RAISE EXCEPTION 'activation_projection_runtime_execute_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'wandora_private'
       AND p.proname = 'lock_catalog_digital_employee_activation_v1'
       AND p.prosecdef
       AND p.provolatile = 'v'
       AND p.proconfig @> ARRAY[
         'search_path=pg_catalog, wandora, wandora_private, pg_temp'
       ]::text[]
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'wandora_private'
       AND p.proname = 'activate_catalog_digital_employee_projection_v1'
       AND p.prosecdef
       AND p.provolatile = 'v'
       AND p.proconfig @> ARRAY[
         'search_path=pg_catalog, wandora, wandora_private, pg_temp'
       ]::text[]
  ) THEN
    RAISE EXCEPTION 'activation_projection_function_security_drift';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
       AND (
         has_function_privilege(
           role_name,
           'wandora_private.lock_catalog_digital_employee_activation_v1(uuid,uuid)',
           'EXECUTE'
         )
         OR has_function_privilege(
           role_name,
           'wandora_private.activate_catalog_digital_employee_projection_v1(uuid,uuid)',
           'EXECUTE'
         )
       )
    THEN
      RAISE EXCEPTION 'role % unexpectedly executes activation projection helper', role_name;
    END IF;
  END LOOP;
END
$$;

BEGIN;

INSERT INTO wandora.organizations(id, slug, display_name, status) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'activation-projection-a', 'Activation Projection A', 'active'),
  ('a1000000-0000-4000-8000-000000000002', 'activation-projection-b', 'Activation Projection B', 'active');

INSERT INTO wandora.digital_employees
  (id, organization_id, display_name, role, status, autonomy_mode)
VALUES
  ('a2000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001',
   'Ana', 'commercial-assistant', 'paused', 'supervised');

INSERT INTO wandora_private.control_plane_provider_bindings
  (organization_id, provider, provider_company_ref)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'paperclip', 'activation-projection-company-a');

INSERT INTO wandora_private.digital_employee_provider_bindings
  (organization_id, employee_id, provider, provider_agent_ref)
VALUES
  ('a1000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001',
   'paperclip', 'activation-projection-agent-a');

INSERT INTO wandora_private.digital_employee_hire_operations
  (organization_id, idempotency_key, request_hash, employee_id, provider,
   catalog_key, provider_company_ref, status, provider_agent_ref, completed_at)
VALUES
  ('a1000000-0000-4000-8000-000000000001',
   'activation-projection-hire-a', repeat('a', 64),
   'a2000000-0000-4000-8000-000000000001',
   'paperclip', 'ana-commercial-v1', 'activation-projection-company-a',
   'completed', 'activation-projection-agent-a', now());

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config('wandora.organization_id', 'a1000000-0000-4000-8000-000000000001', true);

DO $$
DECLARE
  v_status text;
  v_activated boolean;
BEGIN
  SELECT wandora_private.lock_catalog_digital_employee_activation_v1(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001'
  ) INTO v_status;
  IF v_status IS DISTINCT FROM 'paused' THEN
    RAISE EXCEPTION 'activation_projection_lock_expected_paused:%', v_status;
  END IF;

  BEGIN
    UPDATE wandora.digital_employees
       SET status = 'active'
     WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
       AND id = 'a2000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'activation_projection_direct_update_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  SELECT wandora_private.activate_catalog_digital_employee_projection_v1(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001'
  ) INTO v_activated;
  IF v_activated IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'activation_projection_finalize_failed';
  END IF;

  SELECT de.status::text
    INTO v_status
    FROM wandora.digital_employees de
   WHERE de.organization_id = 'a1000000-0000-4000-8000-000000000001'
     AND de.id = 'a2000000-0000-4000-8000-000000000001';
  IF v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'activation_projection_status_not_active:%', v_status;
  END IF;

  SELECT wandora_private.lock_catalog_digital_employee_activation_v1(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001'
  ) INTO v_status;
  IF v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'activation_projection_active_replay_lock_failed:%', v_status;
  END IF;

  SELECT wandora_private.activate_catalog_digital_employee_projection_v1(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001'
  ) INTO v_activated;
  IF v_activated IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'activation_projection_active_replay_finalize_failed';
  END IF;

  BEGIN
    PERFORM wandora_private.lock_catalog_digital_employee_activation_v1(
      'a1000000-0000-4000-8000-000000000002',
      'a2000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'activation_projection_cross_tenant_unexpectedly_allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

RESET ROLE;

UPDATE wandora_private.digital_employee_provider_bindings
   SET provider_agent_ref = 'activation-projection-agent-mismatch'
 WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
   AND employee_id = 'a2000000-0000-4000-8000-000000000001'
   AND provider = 'paperclip';

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config('wandora.organization_id', 'a1000000-0000-4000-8000-000000000001', true);

DO $$
DECLARE
  v_status text;
  v_activated boolean;
BEGIN
  SELECT wandora_private.lock_catalog_digital_employee_activation_v1(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001'
  ) INTO v_status;
  IF v_status IS NOT NULL THEN
    RAISE EXCEPTION 'activation_projection_mismatched_binding_lock_not_closed:%', v_status;
  END IF;

  SELECT wandora_private.activate_catalog_digital_employee_projection_v1(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001'
  ) INTO v_activated;
  IF v_activated IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'activation_projection_mismatched_binding_finalize_not_closed';
  END IF;
END
$$;

RESET ROLE;
ROLLBACK;

SELECT 'DIGITAL_EMPLOYEE_ACTIVATION_PROJECTION_V1_OK' AS verifier;
