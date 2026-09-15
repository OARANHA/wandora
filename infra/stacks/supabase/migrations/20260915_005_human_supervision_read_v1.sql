BEGIN;

CREATE FUNCTION wandora.resolve_core_user_id(
  p_provider text,
  p_provider_subject text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, wandora, pg_temp
AS $$
  SELECT ui.user_id
    FROM wandora.user_identities ui
   WHERE ui.provider = p_provider
     AND ui.provider_subject = p_provider_subject
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION wandora.resolve_core_user_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wandora.resolve_core_user_id(text, text) TO wandora_core_runtime;

COMMENT ON FUNCTION wandora.resolve_core_user_id(text, text) IS
  'Narrow Core-only external-subject to canonical Wandora user resolver; does not grant direct identity-table access.';

COMMIT;
