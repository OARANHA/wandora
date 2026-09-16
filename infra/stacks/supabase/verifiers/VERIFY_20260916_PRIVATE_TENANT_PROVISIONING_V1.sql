\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE provision_first AS
SELECT *
FROM wandora_private.provision_beta_organization_v1(
  'verify-provision-0001',
  'verify-beta-one',
  'Verify Beta One',
  '00000000-0000-0000-0000-00000000a001',
  'Owner One',
  'Ana'
);

DO $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM provision_first;
  IF r.organization_id IS NULL OR r.user_id IS NULL OR r.employee_id IS NULL THEN
    RAISE EXCEPTION 'VERIFY_FAIL first provisioning returned null ids';
  END IF;

  IF (SELECT count(*) FROM wandora.organizations WHERE slug = 'verify-beta-one') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL organization count';
  END IF;
  IF (SELECT count(*) FROM wandora.user_identities
       WHERE provider = 'supabase'
         AND provider_subject = '00000000-0000-0000-0000-00000000a001') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL identity count';
  END IF;
  IF (SELECT count(*) FROM wandora.memberships
       WHERE organization_id = r.organization_id
         AND user_id = r.user_id
         AND role = 'owner'
         AND status = 'active') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL owner membership';
  END IF;
  IF (SELECT count(*) FROM wandora.digital_employees
       WHERE id = r.employee_id
         AND organization_id = r.organization_id
         AND role = 'commercial-assistant'
         AND status = 'active'
         AND autonomy_mode = 'supervised') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL employee contract';
  END IF;
END;
$$;

CREATE TEMP TABLE provision_replay AS
SELECT *
FROM wandora_private.provision_beta_organization_v1(
  'verify-provision-0001',
  'verify-beta-one',
  'Verify Beta One',
  '00000000-0000-0000-0000-00000000a001',
  'Owner One',
  'Ana'
);

DO $$
DECLARE
  a record;
  b record;
BEGIN
  SELECT * INTO a FROM provision_first;
  SELECT * INTO b FROM provision_replay;
  IF a.organization_id <> b.organization_id
     OR a.user_id <> b.user_id
     OR a.employee_id <> b.employee_id THEN
    RAISE EXCEPTION 'VERIFY_FAIL idempotent replay ids changed';
  END IF;
  IF (SELECT count(*) FROM wandora.organizations WHERE slug = 'verify-beta-one') <> 1
     OR (SELECT count(*) FROM wandora_private.tenant_provisioning_requests
         WHERE request_key = 'verify-provision-0001') <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL idempotent replay duplicated state';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM * FROM wandora_private.provision_beta_organization_v1(
      'verify-provision-0001',
      'verify-beta-changed',
      'Changed Payload',
      '00000000-0000-0000-0000-00000000a001',
      'Owner One',
      'Ana'
    );
    RAISE EXCEPTION 'VERIFY_FAIL expected idempotency conflict';
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
    PERFORM * FROM wandora_private.provision_beta_organization_v1(
      'verify-provision-0002',
      'verify-beta-one',
      'Verify Beta One Again',
      '00000000-0000-0000-0000-00000000a002',
      'Other Owner',
      'Ana'
    );
    RAISE EXCEPTION 'VERIFY_FAIL expected slug conflict';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'wandora_provisioning_slug_conflict' THEN
      RAISE;
    END IF;
  END;
END;
$$;

CREATE TEMP TABLE provision_second_org AS
SELECT *
FROM wandora_private.provision_beta_organization_v1(
  'verify-provision-0003',
  'verify-beta-two',
  'Verify Beta Two',
  '00000000-0000-0000-0000-00000000a001',
  'Owner One Different Name Must Not Overwrite',
  'Ana Two'
);

DO $$
DECLARE
  first_row record;
  second_row record;
BEGIN
  SELECT * INTO first_row FROM provision_first;
  SELECT * INTO second_row FROM provision_second_org;

  IF first_row.organization_id = second_row.organization_id THEN
    RAISE EXCEPTION 'VERIFY_FAIL second organization was not new';
  END IF;
  IF first_row.user_id <> second_row.user_id THEN
    RAISE EXCEPTION 'VERIFY_FAIL canonical user was not reused';
  END IF;
  IF (SELECT count(*) FROM wandora.users WHERE id = first_row.user_id) <> 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL duplicate canonical user';
  END IF;
  IF (SELECT display_name FROM wandora.users WHERE id = first_row.user_id) <> 'Owner One' THEN
    RAISE EXCEPTION 'VERIFY_FAIL existing user display name was overwritten';
  END IF;
  IF (SELECT count(*) FROM wandora.memberships
      WHERE user_id = first_row.user_id AND role = 'owner' AND status = 'active') <> 2 THEN
    RAISE EXCEPTION 'VERIFY_FAIL reused owner memberships';
  END IF;
END;
$$;

DO $$
BEGIN
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
       'wandora_core_runtime',
       'wandora_private.tenant_provisioning_requests',
       'SELECT'
     ) THEN
    RAISE EXCEPTION 'VERIFY_FAIL wandora_core_runtime can read provisioning evidence';
  END IF;
END;
$$;

ROLLBACK;

SELECT 'PRIVATE_TENANT_PROVISIONING_V1_OK' AS result;
