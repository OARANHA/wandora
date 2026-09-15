\set ON_ERROR_STOP on

DO $$
DECLARE
  is_security_definer boolean;
  core_execute boolean;
  authenticated_execute boolean;
  public_execute boolean;
  core_identity_select boolean;
  core_users_select boolean;
BEGIN
  IF to_regprocedure('wandora.resolve_core_user_id(text,text)') IS NULL THEN
    RAISE EXCEPTION 'resolve_core_user_id(text,text) missing';
  END IF;

  SELECT prosecdef
    INTO is_security_definer
    FROM pg_proc
   WHERE oid = 'wandora.resolve_core_user_id(text,text)'::regprocedure;
  IF is_security_definer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'resolve_core_user_id must be SECURITY DEFINER';
  END IF;

  SELECT has_function_privilege('wandora_core_runtime', 'wandora.resolve_core_user_id(text,text)', 'EXECUTE'),
         has_function_privilege('authenticated', 'wandora.resolve_core_user_id(text,text)', 'EXECUTE'),
         has_function_privilege('public', 'wandora.resolve_core_user_id(text,text)', 'EXECUTE')
    INTO core_execute, authenticated_execute, public_execute;
  IF NOT core_execute OR authenticated_execute OR public_execute THEN
    RAISE EXCEPTION 'unexpected resolver execute privileges core %, authenticated %, public %',
      core_execute, authenticated_execute, public_execute;
  END IF;

  SELECT has_table_privilege('wandora_core_runtime', 'wandora.user_identities', 'SELECT'),
         has_table_privilege('wandora_core_runtime', 'wandora.users', 'SELECT')
    INTO core_identity_select, core_users_select;
  IF core_identity_select OR core_users_select THEN
    RAISE EXCEPTION 'Core must not receive direct user identity/table reads: identities %, users %',
      core_identity_select, core_users_select;
  END IF;
END
$$;

SELECT 'HUMAN_SUPERVISION_READ_V1_LIVE_OK' AS verifier;
