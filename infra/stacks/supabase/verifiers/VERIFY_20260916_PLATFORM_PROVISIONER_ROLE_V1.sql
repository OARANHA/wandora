\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF NOT has_function_privilege(
    'wandora_platform_provisioner',
    'wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioner cannot execute canonical provision function';
  END IF;

  IF has_schema_privilege('wandora_platform_provisioner', 'wandora', 'USAGE') THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioner unexpectedly has wandora schema usage';
  END IF;

  IF has_function_privilege(
    'wandora_platform_provisioner',
    'wandora.current_core_organization_id()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioner can execute unrelated Core function';
  END IF;
END;
$$;

SET LOCAL ROLE wandora_platform_provisioner;

CREATE TEMP TABLE provision_result AS
SELECT *
FROM wandora_private.provision_beta_organization_v1(
  'verify-platform-provisioner-0001',
  'verify-platform-provisioner',
  'Verify Platform Provisioner',
  '00000000-0000-0000-0000-00000000b001',
  'Platform Owner',
  'Ana Platform'
);

RESET ROLE;

DO $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM provision_result;
  IF r.organization_id IS NULL OR r.user_id IS NULL OR r.employee_id IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner returned null ids';
  END IF;

  IF (SELECT count(*) FROM wandora.organizations WHERE id = r.organization_id) <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioned organization missing';
  END IF;
  IF (SELECT count(*) FROM wandora.memberships
      WHERE organization_id = r.organization_id
        AND user_id = r.user_id
        AND role = 'owner'
        AND status = 'active') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioned owner membership missing';
  END IF;
  IF (SELECT count(*) FROM wandora.digital_employees
      WHERE id = r.employee_id
        AND organization_id = r.organization_id
        AND role = 'commercial-assistant'
        AND status = 'active'
        AND autonomy_mode = 'supervised') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioned employee contract';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    SET LOCAL ROLE wandora_platform_provisioner;
    PERFORM 1 FROM wandora_private.tenant_provisioning_requests LIMIT 1;
    RESET ROLE;
    RAISE EXCEPTION 'VERIFY_FAIL provisioner read private evidence directly';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    SET LOCAL ROLE wandora_platform_provisioner;
    PERFORM 1 FROM wandora.organizations LIMIT 1;
    RESET ROLE;
    RAISE EXCEPTION 'VERIFY_FAIL provisioner read organizations directly';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    SET LOCAL ROLE wandora_platform_provisioner;
    PERFORM wandora.current_core_organization_id();
    RESET ROLE;
    RAISE EXCEPTION 'VERIFY_FAIL provisioner executed unrelated Core function';
  EXCEPTION WHEN insufficient_privilege OR undefined_function THEN
    RESET ROLE;
  END;
END;
$$;

ROLLBACK;

SELECT 'PLATFORM_PROVISIONER_ROLE_V1_OK' AS result;
