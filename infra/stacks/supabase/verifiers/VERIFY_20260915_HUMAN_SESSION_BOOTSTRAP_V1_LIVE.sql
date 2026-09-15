\set ON_ERROR_STOP on

DO $$
DECLARE
  is_security_definer boolean;
  core_execute boolean;
  authenticated_execute boolean;
  public_execute boolean;
  core_identity_select boolean;
  core_users_select boolean;
  core_memberships_select boolean;
BEGIN
  IF to_regprocedure('wandora.resolve_core_human_session(text,text)') IS NULL THEN
    RAISE EXCEPTION 'resolve_core_human_session(text,text) missing';
  END IF;

  SELECT prosecdef
    INTO is_security_definer
    FROM pg_proc
   WHERE oid = 'wandora.resolve_core_human_session(text,text)'::regprocedure;
  IF is_security_definer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'resolve_core_human_session must be SECURITY DEFINER';
  END IF;

  SELECT has_function_privilege('wandora_core_runtime', 'wandora.resolve_core_human_session(text,text)', 'EXECUTE'),
         has_function_privilege('authenticated', 'wandora.resolve_core_human_session(text,text)', 'EXECUTE'),
         has_function_privilege('public', 'wandora.resolve_core_human_session(text,text)', 'EXECUTE')
    INTO core_execute, authenticated_execute, public_execute;
  IF NOT core_execute OR authenticated_execute OR public_execute THEN
    RAISE EXCEPTION 'unexpected bootstrap execute privileges core %, authenticated %, public %',
      core_execute, authenticated_execute, public_execute;
  END IF;

  SELECT has_table_privilege('wandora_core_runtime', 'wandora.user_identities', 'SELECT'),
         has_table_privilege('wandora_core_runtime', 'wandora.users', 'SELECT'),
         has_table_privilege('wandora_core_runtime', 'wandora.memberships', 'SELECT')
    INTO core_identity_select, core_users_select, core_memberships_select;
  IF core_identity_select OR core_users_select THEN
    RAISE EXCEPTION 'Core must not gain direct identity reads: identities %, users %',
      core_identity_select, core_users_select;
  END IF;
  IF NOT core_memberships_select THEN
    RAISE EXCEPTION 'Existing tenant-scoped Core memberships SELECT unexpectedly missing';
  END IF;
END
$$;

SELECT 'HUMAN_SESSION_BOOTSTRAP_V1_LIVE_OK' AS verifier;
