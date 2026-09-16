\set ON_ERROR_STOP on

DO $$
DECLARE
  r record;
  v_password_is_null boolean;
BEGIN
  SELECT rolcanlogin, rolconnlimit, rolsuper, rolcreatedb, rolcreaterole,
         rolinherit, rolreplication, rolbypassrls
    INTO r
    FROM pg_roles
   WHERE rolname = 'wandora_platform_provisioner';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner role missing';
  END IF;

  IF r.rolcanlogin IS DISTINCT FROM true
     OR r.rolconnlimit <> 0
     OR r.rolsuper
     OR r.rolcreatedb
     OR r.rolcreaterole
     OR r.rolinherit
     OR r.rolreplication
     OR r.rolbypassrls THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner role attributes';
  END IF;

  SELECT rolpassword IS NULL
    INTO v_password_is_null
    FROM pg_authid
   WHERE rolname = 'wandora_platform_provisioner';

  IF v_password_is_null IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner has a password';
  END IF;

  IF NOT has_schema_privilege('wandora_platform_provisioner', 'wandora_private', 'USAGE') THEN
    RAISE EXCEPTION 'VERIFY_FAIL private schema usage missing';
  END IF;

  IF NOT has_function_privilege(
    'wandora_platform_provisioner',
    'wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioner execute missing';
  END IF;

  IF has_table_privilege('wandora_platform_provisioner', 'wandora.organizations', 'SELECT')
     OR has_table_privilege('wandora_platform_provisioner', 'wandora.users', 'SELECT')
     OR has_table_privilege('wandora_platform_provisioner', 'wandora.memberships', 'SELECT')
     OR has_table_privilege('wandora_platform_provisioner', 'wandora.digital_employees', 'SELECT')
     OR has_table_privilege('wandora_platform_provisioner', 'wandora_private.tenant_provisioning_requests', 'SELECT') THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner has direct table read';
  END IF;

  IF has_function_privilege(
       'authenticated',
       'wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)',
       'EXECUTE'
     ) OR has_function_privilege(
       'wandora_core_runtime',
       'wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning leaked to customer/core role';
  END IF;
END;
$$;

SELECT 'PLATFORM_PROVISIONER_ROLE_V1_LIVE_OK' AS result;
