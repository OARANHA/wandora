BEGIN;

CREATE FUNCTION wandora.resolve_core_human_session(
  p_provider text,
  p_provider_subject text
)
RETURNS TABLE (
  user_id uuid,
  user_display_name text,
  organization_id uuid,
  organization_slug text,
  organization_display_name text,
  membership_role wandora.membership_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, wandora, pg_temp
AS $$
  SELECT u.id,
         u.display_name,
         active_org.organization_id,
         active_org.organization_slug,
         active_org.organization_display_name,
         active_org.membership_role
    FROM wandora.user_identities ui
    JOIN wandora.users u ON u.id = ui.user_id
    LEFT JOIN LATERAL (
      SELECT o.id AS organization_id,
             o.slug AS organization_slug,
             o.display_name AS organization_display_name,
             m.role AS membership_role
        FROM wandora.memberships m
        JOIN wandora.organizations o ON o.id = m.organization_id
       WHERE m.user_id = u.id
         AND m.status = 'active'
         AND o.status = 'active'
       ORDER BY o.display_name, o.id
    ) active_org ON true
   WHERE ui.provider = p_provider
     AND ui.provider_subject = p_provider_subject;
$$;

REVOKE ALL ON FUNCTION wandora.resolve_core_human_session(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wandora.resolve_core_human_session(text, text) TO wandora_core_runtime;

COMMENT ON FUNCTION wandora.resolve_core_human_session(text, text) IS
  'Core-only verified external identity bootstrap returning canonical Wandora user plus active organization memberships.';

COMMIT;
