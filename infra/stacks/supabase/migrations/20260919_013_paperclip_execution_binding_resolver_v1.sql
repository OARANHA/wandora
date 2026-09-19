BEGIN;

CREATE OR REPLACE FUNCTION wandora_private.resolve_paperclip_execution_organization(
  p_provider_company_ref text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, wandora, wandora_private, pg_temp
AS $$
  SELECT o.id
    FROM wandora_private.control_plane_provider_bindings b
    JOIN wandora.organizations o ON o.id = b.organization_id
   WHERE b.provider = 'paperclip'
     AND b.provider_company_ref = p_provider_company_ref
     AND o.status = 'active'
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION wandora_private.resolve_paperclip_execution_organization(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wandora_private.resolve_paperclip_execution_organization(text)
  TO wandora_core_runtime;

COMMENT ON FUNCTION wandora_private.resolve_paperclip_execution_organization(text) IS
  'Least-privilege Paperclip company -> active Wandora organization resolver for the private execution bridge. Returns no provider secret or employee state.';

COMMIT;
