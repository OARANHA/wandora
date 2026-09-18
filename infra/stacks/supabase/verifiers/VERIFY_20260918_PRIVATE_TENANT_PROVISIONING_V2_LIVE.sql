\set ON_ERROR_STOP on

DO $$
DECLARE
  v_employee_nullable text;
  v_version_nullable text;
  v_constraint_validated boolean;
  v_prosecdef boolean;
  v_proconfig text[];
BEGIN
  IF to_regclass('wandora_private.tenant_provisioning_requests') IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning ledger missing';
  END IF;

  SELECT is_nullable
    INTO v_employee_nullable
    FROM information_schema.columns
   WHERE table_schema = 'wandora_private'
     AND table_name = 'tenant_provisioning_requests'
     AND column_name = 'employee_id';

  IF v_employee_nullable IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'VERIFY_FAIL employee_id must be nullable for v2';
  END IF;

  SELECT is_nullable
    INTO v_version_nullable
    FROM information_schema.columns
   WHERE table_schema = 'wandora_private'
     AND table_name = 'tenant_provisioning_requests'
     AND column_name = 'provisioning_version';

  IF v_version_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning_version missing or nullable';
  END IF;

  SELECT convalidated
    INTO v_constraint_validated
    FROM pg_constraint
   WHERE conrelid = 'wandora_private.tenant_provisioning_requests'::regclass
     AND conname = 'tenant_provisioning_requests_version_shape';

  IF v_constraint_validated IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning version shape constraint missing/unvalidated';
  END IF;

  IF to_regprocedure('wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL v1 provisioner missing';
  END IF;

  IF to_regprocedure('wandora_private.provision_beta_organization_v2(text,text,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 provisioner missing';
  END IF;

  SELECT p.prosecdef, p.proconfig
    INTO v_prosecdef, v_proconfig
    FROM pg_proc p
   WHERE p.oid = to_regprocedure(
     'wandora_private.provision_beta_organization_v2(text,text,text,text,text)'
   );

  IF v_prosecdef IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 function is not SECURITY DEFINER';
  END IF;

  IF NOT ('search_path=pg_catalog, wandora, wandora_private, pg_temp' = ANY(COALESCE(v_proconfig, ARRAY[]::text[]))) THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 search_path is not pinned';
  END IF;

  IF NOT has_function_privilege(
       'wandora_platform_provisioner',
       'wandora_private.provision_beta_organization_v2(text,text,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner execute v2 missing';
  END IF;

  IF has_function_privilege(
       'authenticated',
       'wandora_private.provision_beta_organization_v2(text,text,text,text,text)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'anon',
       'wandora_private.provision_beta_organization_v2(text,text,text,text,text)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'wandora_core_runtime',
       'wandora_private.provision_beta_organization_v2(text,text,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 leaked outside platform provisioner';
  END IF;

  IF has_table_privilege(
       'wandora_platform_provisioner',
       'wandora_private.tenant_provisioning_requests',
       'SELECT'
     )
     OR has_table_privilege(
       'wandora_platform_provisioner',
       'wandora_private.tenant_provisioning_requests',
       'INSERT'
     )
     OR has_table_privilege(
       'wandora_platform_provisioner',
       'wandora_private.tenant_provisioning_requests',
       'UPDATE'
     )
     OR has_table_privilege(
       'wandora_platform_provisioner',
       'wandora_private.tenant_provisioning_requests',
       'DELETE'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner has direct ledger privilege';
  END IF;
END;
$$;

SELECT 'PRIVATE_TENANT_PROVISIONING_V2_LIVE_OK' AS result;
