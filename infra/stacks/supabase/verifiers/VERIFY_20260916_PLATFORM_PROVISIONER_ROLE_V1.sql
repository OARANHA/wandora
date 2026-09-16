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

  IF has_table_privilege('wandora_platform_provisioner', 'wandora.organizations', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('wandora_platform_provisioner', 'wandora.users', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('wandora_platform_provisioner', 'wandora.memberships', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('wandora_platform_provisioner', 'wandora.digital_employees', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('wandora_platform_provisioner', 'wandora_private.tenant_provisioning_requests', 'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioner has direct table privilege';
  END IF;
END;
$$;

SET LOCAL ROLE wandora_platform_provisioner;

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
  v_org_id uuid;
  v_user_id uuid;
  v_employee_id uuid;
BEGIN
  SELECT organization_id, user_id, employee_id
    INTO v_org_id, v_user_id, v_employee_id
    FROM wandora_private.tenant_provisioning_requests
   WHERE request_key = 'verify-platform-provisioner-0001';

  IF v_org_id IS NULL OR v_user_id IS NULL OR v_employee_id IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioning evidence missing';
  END IF;

  IF (SELECT count(*) FROM wandora.organizations WHERE id = v_org_id) <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioned organization missing';
  END IF;
  IF (SELECT count(*) FROM wandora.memberships
      WHERE organization_id = v_org_id
        AND user_id = v_user_id
        AND role = 'owner'
        AND status = 'active') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioned owner membership missing';
  END IF;
  IF (SELECT count(*) FROM wandora.digital_employees
      WHERE id = v_employee_id
        AND organization_id = v_org_id
        AND role = 'commercial-assistant'
        AND status = 'active'
        AND autonomy_mode = 'supervised') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL provisioned employee contract';
  END IF;
END;
$$;

ROLLBACK;

SELECT 'PLATFORM_PROVISIONER_ROLE_V1_OK' AS result;
