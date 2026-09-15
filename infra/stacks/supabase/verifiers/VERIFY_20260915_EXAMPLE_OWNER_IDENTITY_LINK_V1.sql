\set ON_ERROR_STOP on

DO $$
DECLARE
  v_auth_subject uuid := 'd30f6070-03ba-42bb-ab40-313b1a9b7264';
  v_user uuid := 'e1000000-0000-4000-8000-000000000001';
  v_org uuid := 'e0000000-0000-4000-8000-000000000001';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
     WHERE id = v_auth_subject
       AND lower(email) = lower('aranha.com@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Auth user verifier failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.user_identities ui
      JOIN wandora.users u ON u.id = ui.user_id
      JOIN wandora.memberships m ON m.user_id = u.id
      JOIN wandora.organizations o ON o.id = m.organization_id
     WHERE ui.user_id = v_user
       AND ui.provider = 'supabase'
       AND ui.provider_subject = v_auth_subject::text
       AND u.display_name = 'Gestor Exemplo'
       AND m.organization_id = v_org
       AND m.role = 'owner'
       AND m.status = 'active'
       AND o.slug = 'empresa-exemplo'
       AND o.display_name = 'Empresa Exemplo'
       AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Canonical identity/membership verifier failed';
  END IF;

  IF (SELECT count(*) FROM wandora.user_identities WHERE provider = 'supabase' AND provider_subject = v_auth_subject::text) <> 1 THEN
    RAISE EXCEPTION 'Supabase subject must map to exactly one Wandora user';
  END IF;

  IF (SELECT count(*) FROM wandora.user_identities WHERE user_id = v_user AND provider = 'supabase') <> 1 THEN
    RAISE EXCEPTION 'Gestor Exemplo must have exactly one Supabase identity';
  END IF;
END $$;

SELECT 'EXAMPLE_OWNER_IDENTITY_LINK_V1_VERIFIED' AS result;
