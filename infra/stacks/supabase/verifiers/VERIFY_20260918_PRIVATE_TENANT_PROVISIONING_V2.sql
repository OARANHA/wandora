\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE provision_v2_first AS
SELECT *
FROM wandora_private.provision_beta_organization_v2(
  'verify-provision-v2-0001',
  'verify-v2-beta-one',
  'Verify V2 Beta One',
  '00000000-0000-0000-0000-00000000c001',
  'Owner V2 One'
);

DO $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM provision_v2_first;

  IF r.organization_id IS NULL OR r.user_id IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 first provisioning returned null ids';
  END IF;

  IF (SELECT count(*) FROM wandora.organizations WHERE id = r.organization_id AND slug = 'verify-v2-beta-one' AND status = 'active') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 organization contract';
  END IF;

  IF (SELECT count(*) FROM wandora.memberships
       WHERE organization_id = r.organization_id
         AND user_id = r.user_id
         AND role = 'owner'
         AND status = 'active') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 owner membership';
  END IF;

  IF (SELECT count(*) FROM wandora.digital_employees WHERE organization_id = r.organization_id) <> 0 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 created digital employee';
  END IF;

  IF (SELECT count(*)
        FROM wandora_private.tenant_provisioning_requests
       WHERE request_key = 'verify-provision-v2-0001'
         AND organization_id = r.organization_id
         AND user_id = r.user_id
         AND employee_id IS NULL
         AND provisioning_version = 2) <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 provisioning evidence';
  END IF;
END;
$$;

CREATE TEMP TABLE provision_v2_replay AS
SELECT *
FROM wandora_private.provision_beta_organization_v2(
  'verify-provision-v2-0001',
  'verify-v2-beta-one',
  'Verify V2 Beta One',
  '00000000-0000-0000-0000-00000000c001',
  'Owner V2 One'
);

DO $$
DECLARE
  a record;
  b record;
BEGIN
  SELECT * INTO a FROM provision_v2_first;
  SELECT * INTO b FROM provision_v2_replay;

  IF a.organization_id <> b.organization_id OR a.user_id <> b.user_id THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 idempotent replay ids changed';
  END IF;

  IF (SELECT count(*) FROM wandora.organizations WHERE slug = 'verify-v2-beta-one') <> 1
     OR (SELECT count(*) FROM wandora_private.tenant_provisioning_requests
         WHERE request_key = 'verify-provision-v2-0001') <> 1
     OR (SELECT count(*) FROM wandora.digital_employees
         WHERE organization_id = a.organization_id) <> 0 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 idempotent replay duplicated state';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM * FROM wandora_private.provision_beta_organization_v2(
      'verify-provision-v2-0001',
      'verify-v2-beta-changed',
      'Changed V2 Payload',
      '00000000-0000-0000-0000-00000000c001',
      'Owner V2 One'
    );
    RAISE EXCEPTION 'VERIFY_FAIL expected v2 idempotency conflict';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'wandora_provisioning_idempotency_conflict' THEN
      RAISE;
    END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM * FROM wandora_private.provision_beta_organization_v2(
      'verify-provision-v2-0002',
      'verify-v2-beta-one',
      'Verify V2 Beta One Again',
      '00000000-0000-0000-0000-00000000c002',
      'Other Owner'
    );
    RAISE EXCEPTION 'VERIFY_FAIL expected v2 slug conflict';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'wandora_provisioning_slug_conflict' THEN
      RAISE;
    END IF;
  END;
END;
$$;

CREATE TEMP TABLE provision_v2_second AS
SELECT *
FROM wandora_private.provision_beta_organization_v2(
  'verify-provision-v2-0003',
  'verify-v2-beta-two',
  'Verify V2 Beta Two',
  '00000000-0000-0000-0000-00000000c001',
  'Owner V2 Different Name Must Not Overwrite'
);

DO $$
DECLARE
  first_row record;
  second_row record;
BEGIN
  SELECT * INTO first_row FROM provision_v2_first;
  SELECT * INTO second_row FROM provision_v2_second;

  IF first_row.organization_id = second_row.organization_id THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 second organization was not new';
  END IF;

  IF first_row.user_id <> second_row.user_id THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 canonical user was not reused';
  END IF;

  IF (SELECT display_name FROM wandora.users WHERE id = first_row.user_id) <> 'Owner V2 One' THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 existing user display name was overwritten';
  END IF;

  IF (SELECT count(*) FROM wandora.memberships
      WHERE user_id = first_row.user_id AND role = 'owner' AND status = 'active') <> 2 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 reused owner memberships';
  END IF;

  IF (SELECT count(*) FROM wandora.digital_employees
      WHERE organization_id IN (first_row.organization_id, second_row.organization_id)) <> 0 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v2 reuse path created employee';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM * FROM wandora_private.provision_beta_organization_v1(
      'verify-provision-v2-0001',
      'verify-v2-cross-version',
      'Verify Cross Version',
      '00000000-0000-0000-0000-00000000c003',
      'Cross Version Owner',
      'Ana'
    );
    RAISE EXCEPTION 'VERIFY_FAIL cross-version request key was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'wandora_provisioning_idempotency_conflict' THEN
      RAISE;
    END IF;
  END;
END;
$$;

CREATE TEMP TABLE provision_v1_regression AS
SELECT *
FROM wandora_private.provision_beta_organization_v1(
  'verify-provision-v1-regression-0001',
  'verify-v1-regression',
  'Verify V1 Regression',
  '00000000-0000-0000-0000-00000000c004',
  'Owner V1 Regression',
  'Ana Regression'
);

DO $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM provision_v1_regression;

  IF r.organization_id IS NULL OR r.user_id IS NULL OR r.employee_id IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL v1 regression returned null ids';
  END IF;

  IF (SELECT count(*)
        FROM wandora_private.tenant_provisioning_requests
       WHERE request_key = 'verify-provision-v1-regression-0001'
         AND employee_id = r.employee_id
         AND provisioning_version = 1) <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v1 regression evidence version';
  END IF;

  IF (SELECT count(*)
        FROM wandora.digital_employees
       WHERE id = r.employee_id
         AND organization_id = r.organization_id
         AND role = 'commercial-assistant'
         AND status = 'active'
         AND autonomy_mode = 'supervised') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL v1 employee contract changed';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT has_function_privilege(
       'wandora_platform_provisioner',
       'wandora_private.provision_beta_organization_v2(text,text,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner cannot execute v2';
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
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner can read provisioning ledger';
  END IF;
END;
$$;

SET LOCAL ROLE wandora_platform_provisioner;

SELECT *
FROM wandora_private.provision_beta_organization_v2(
  'verify-platform-provisioner-v2-0001',
  'verify-platform-provisioner-v2',
  'Verify Platform Provisioner V2',
  '00000000-0000-0000-0000-00000000c005',
  'Platform Owner V2'
);

RESET ROLE;

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id
    INTO v_org_id
    FROM wandora_private.tenant_provisioning_requests
   WHERE request_key = 'verify-platform-provisioner-v2-0001'
     AND provisioning_version = 2
     AND employee_id IS NULL;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner v2 evidence missing';
  END IF;

  IF (SELECT count(*) FROM wandora.digital_employees WHERE organization_id = v_org_id) <> 0 THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner v2 created employee';
  END IF;
END;
$$;

ROLLBACK;

SELECT 'PRIVATE_TENANT_PROVISIONING_V2_OK' AS result;
