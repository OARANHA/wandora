\set ON_ERROR_STOP on

DO $
DECLARE
  v_role text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_roles
     WHERE rolname = 'wandora_customer_hire_operator'
       AND NOT rolcanlogin
       AND NOT rolsuper
       AND NOT rolcreatedb
       AND NOT rolcreaterole
       AND NOT rolinherit
       AND NOT rolreplication
       AND NOT rolbypassrls
  ) THEN
    RAISE EXCEPTION 'customer_hire_operator_role_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'wandora_private'
       AND table_name = 'digital_employee_catalog_hire_eligibility'
       AND column_name = 'organization_id'
       AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'customer_hire_eligibility_org_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'wandora_private'
       AND table_name = 'digital_employee_catalog_hire_eligibility'
       AND column_name = 'catalog_key'
       AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'customer_hire_eligibility_catalog_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'wandora_private'
       AND table_name = 'digital_employee_catalog_hire_eligibility'
       AND column_name = 'enabled'
       AND is_nullable = 'NO'
       AND column_default = 'false'
  ) THEN
    RAISE EXCEPTION 'customer_hire_eligibility_enabled_contract_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'wandora_private'
       AND c.relname = 'digital_employee_catalog_hire_eligibility'
       AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'customer_hire_eligibility_rls_missing';
  END IF;

  IF NOT has_table_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'SELECT'
     )
     OR has_table_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'INSERT'
     )
     OR has_table_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'UPDATE'
     )
     OR has_table_privilege(
       'wandora_core_runtime',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'DELETE'
     )
  THEN
    RAISE EXCEPTION 'customer_hire_eligibility_core_privileges_invalid';
  END IF;

  FOR v_role IN
    SELECT rolname
      FROM pg_roles
     WHERE rolname IN ('anon', 'authenticated', 'service_role', 'supabase_functions_admin')
  LOOP
    IF has_table_privilege(
         v_role,
         'wandora_private.digital_employee_catalog_hire_eligibility',
         'SELECT'
       )
       OR has_table_privilege(
         v_role,
         'wandora_private.digital_employee_catalog_hire_eligibility',
         'INSERT'
       )
       OR has_table_privilege(
         v_role,
         'wandora_private.digital_employee_catalog_hire_eligibility',
         'UPDATE'
       )
       OR has_table_privilege(
         v_role,
         'wandora_private.digital_employee_catalog_hire_eligibility',
         'DELETE'
       )
    THEN
      RAISE EXCEPTION 'customer_hire_eligibility_non_operator_leak:%', v_role;
    END IF;
  END LOOP;

  IF has_table_privilege(
       'wandora_customer_hire_operator',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'SELECT'
     )
     OR has_table_privilege(
       'wandora_customer_hire_operator',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'INSERT'
     )
     OR has_table_privilege(
       'wandora_customer_hire_operator',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'UPDATE'
     )
     OR has_table_privilege(
       'wandora_customer_hire_operator',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'DELETE'
     )
  THEN
    RAISE EXCEPTION 'customer_hire_operator_direct_table_authority_leak';
  END IF;

  IF has_table_privilege(
       'wandora_platform_provisioner',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'SELECT'
     )
     OR has_table_privilege(
       'wandora_platform_provisioner',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'INSERT'
     )
     OR has_table_privilege(
       'wandora_platform_provisioner',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'UPDATE'
     )
     OR has_table_privilege(
       'wandora_platform_provisioner',
       'wandora_private.digital_employee_catalog_hire_eligibility',
       'DELETE'
     )
  THEN
    RAISE EXCEPTION 'customer_hire_eligibility_provisioner_table_authority_leak';
  END IF;

  IF NOT has_function_privilege(
       'wandora_customer_hire_operator',
       'wandora_private.set_digital_employee_catalog_hire_eligibility(uuid,text,boolean)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'wandora_core_runtime',
       'wandora_private.set_digital_employee_catalog_hire_eligibility(uuid,text,boolean)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'wandora_platform_provisioner',
       'wandora_private.set_digital_employee_catalog_hire_eligibility(uuid,text,boolean)',
       'EXECUTE'
     )
  THEN
    RAISE EXCEPTION 'customer_hire_eligibility_function_authority_invalid';
  END IF;

  FOR v_role IN
    SELECT rolname
      FROM pg_roles
     WHERE rolname IN ('anon', 'authenticated', 'service_role', 'supabase_functions_admin')
  LOOP
    IF has_function_privilege(
         v_role,
         'wandora_private.set_digital_employee_catalog_hire_eligibility(uuid,text,boolean)',
         'EXECUTE'
       )
    THEN
      RAISE EXCEPTION 'customer_hire_eligibility_function_leak:%', v_role;
    END IF;
  END LOOP;
END
$$;

BEGIN;

INSERT INTO wandora.organizations (id, slug, display_name)
VALUES
  ('61111111-1111-4111-8111-111111111101', 'hire-eligibility-a', 'Hire Eligibility A'),
  ('61111111-1111-4111-8111-111111111102', 'hire-eligibility-b', 'Hire Eligibility B');

SET LOCAL ROLE wandora_customer_hire_operator;

SELECT *
FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
  '61111111-1111-4111-8111-111111111101',
  ' ANA-COMMERCIAL-V1 ',
  true
);

RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_catalog_hire_eligibility
     WHERE organization_id = '61111111-1111-4111-8111-111111111101'
       AND catalog_key = 'ana-commercial-v1'
       AND enabled
  ) THEN
    RAISE EXCEPTION 'customer_hire_eligibility_operator_enable_failed';
  END IF;
END
$$;

SET LOCAL ROLE wandora_customer_hire_operator;

SELECT *
FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
  '61111111-1111-4111-8111-111111111101',
  'ana-commercial-v1',
  false
);

SELECT *
FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
  '61111111-1111-4111-8111-111111111101',
  'ana-commercial-v1',
  true
);

RESET ROLE;

INSERT INTO wandora_private.digital_employee_catalog_hire_eligibility
  (organization_id, catalog_key, enabled)
VALUES
  ('61111111-1111-4111-8111-111111111102', 'ana-commercial-v1', true);

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config(
  'wandora.organization_id',
  '61111111-1111-4111-8111-111111111101',
  true
);

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n
    FROM wandora_private.digital_employee_catalog_hire_eligibility;

  IF n <> 1 THEN
    RAISE EXCEPTION 'customer_hire_eligibility_tenant_scope_failed:%', n;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_catalog_hire_eligibility
     WHERE organization_id = '61111111-1111-4111-8111-111111111101'
       AND catalog_key = 'ana-commercial-v1'
       AND enabled
  ) THEN
    RAISE EXCEPTION 'customer_hire_eligibility_expected_row_hidden';
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    UPDATE wandora_private.digital_employee_catalog_hire_eligibility
       SET enabled = false
     WHERE organization_id = '61111111-1111-4111-8111-111111111101';
    RAISE EXCEPTION 'expected_customer_hire_eligibility_core_write_denial';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

RESET ROLE;

UPDATE wandora.organizations
   SET status = 'suspended'
 WHERE id = '61111111-1111-4111-8111-111111111102';

SET LOCAL ROLE wandora_customer_hire_operator;

DO $$
BEGIN
  BEGIN
    PERFORM *
      FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
        '61111111-1111-4111-8111-111111111102',
        'ana-commercial-v1',
        true
      );
    RAISE EXCEPTION 'expected_customer_hire_eligibility_suspended_enable_denial';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'customer_hire_eligibility_organization_not_active' THEN
      RAISE;
    END IF;
  END;
END
$$;

SELECT *
FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
  '61111111-1111-4111-8111-111111111102',
  'ana-commercial-v1',
  false
);

DO $$
BEGIN
  BEGIN
    PERFORM *
      FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
        '61111111-1111-4111-8111-111111111101',
        NULL,
        true
      );
    RAISE EXCEPTION 'expected_customer_hire_eligibility_null_catalog_denial';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'customer_hire_eligibility_invalid_catalog_key' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM *
      FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
        '61111111-1111-4111-8111-111111111101',
        'ana-commercial-v1',
        NULL
      );
    RAISE EXCEPTION 'expected_customer_hire_eligibility_null_enabled_denial';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'customer_hire_eligibility_enabled_required' THEN
      RAISE;
    END IF;
  END;
END
$$;

RESET ROLE;

DO $$
BEGIN
  IF (SELECT enabled
        FROM wandora_private.digital_employee_catalog_hire_eligibility
       WHERE organization_id = '61111111-1111-4111-8111-111111111102'
         AND catalog_key = 'ana-commercial-v1') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'customer_hire_eligibility_suspended_disable_failed';
  END IF;

  BEGIN
    INSERT INTO wandora_private.digital_employee_catalog_hire_eligibility
      (organization_id, catalog_key, enabled)
    VALUES
      ('61111111-1111-4111-8111-111111111101', 'INVALID KEY', true);
    RAISE EXCEPTION 'expected_customer_hire_eligibility_catalog_check';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$$;

ROLLBACK;

SELECT 'CUSTOMER_HIRE_TENANT_ELIGIBILITY_V1_OK' AS result;
