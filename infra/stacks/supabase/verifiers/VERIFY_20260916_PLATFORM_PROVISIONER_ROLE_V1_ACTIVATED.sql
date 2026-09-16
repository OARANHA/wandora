\set ON_ERROR_STOP on

-- Disposable-only verifier. The harness must temporarily activate the role with
-- a synthetic password and small connection limit before this file is executed.
DO $$
DECLARE
  r record;
BEGIN
  SELECT rolcanlogin, rolconnlimit
    INTO r
    FROM pg_roles
   WHERE rolname = 'wandora_platform_provisioner';

  IF NOT FOUND OR r.rolcanlogin IS DISTINCT FROM true OR r.rolconnlimit < 1 THEN
    RAISE EXCEPTION 'VERIFY_FAIL platform provisioner was not activated by disposable harness';
  END IF;
END;
$$;

SELECT 'PLATFORM_PROVISIONER_ROLE_V1_ACTIVATED_OK' AS result;
