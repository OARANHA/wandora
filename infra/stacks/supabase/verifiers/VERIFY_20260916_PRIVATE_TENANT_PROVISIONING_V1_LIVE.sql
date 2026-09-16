\set ON_ERROR_STOP on

DO $$
DECLARE
  v_prosecdef boolean;
  v_search_path text[];
BEGIN
  IF to_regclass('wandora_private.tenant_provisioning_requests') IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning request table missing';
  END IF;

  IF to_regprocedure('wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning function missing';
  END IF;

  SELECT p.prosecdef, p.proconfig
    INTO v_prosecdef, v_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'wandora_private'
     AND p.proname = 'provision_beta_organization_v1'
     AND pg_get_function_identity_arguments(p.oid) = 'p_request_key text, p_organization_slug text, p_organization_display_name text, p_owner_supabase_subject text, p_owner_display_name text, p_employee_display_name text';

  IF v_prosecdef IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning function is not SECURITY DEFINER';
  END IF;

  IF NOT ('search_path=pg_catalog, wandora, wandora_private, pg_temp' = ANY(COALESCE(v_search_path, ARRAY[]::text[]))) THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning function search_path is not pinned';
  END IF;

  IF has_function_privilege(
       'authenticated',
       'wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL authenticated can execute provisioner';
  END IF;

  IF has_function_privilege(
       'wandora_core_runtime',
       'wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL wandora_core_runtime can execute provisioner';
  END IF;

  IF has_table_privilege(
       'authenticated',
       'wandora_private.tenant_provisioning_requests',
       'SELECT'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL authenticated can read provisioning evidence';
  END IF;

  IF has_table_privilege(
       'wandora_core_runtime',
       'wandora_private.tenant_provisioning_requests',
       'SELECT'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL wandora_core_runtime can read provisioning evidence';
  END IF;
END;
$$;

SELECT 'PRIVATE_TENANT_PROVISIONING_V1_LIVE_OK' AS result;
