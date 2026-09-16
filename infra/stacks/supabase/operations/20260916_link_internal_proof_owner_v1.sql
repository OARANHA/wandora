\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := 'e1000000-0000-4000-8000-000000000001'::uuid;
BEGIN
  SELECT id INTO STRICT v_org_id
    FROM wandora.organizations
   WHERE slug = 'wandora-internal-supervised-proof'
     AND display_name = 'Wandora Internal Supervised Proof'
     AND status = 'active';

  IF NOT EXISTS (
    SELECT 1 FROM wandora.users
     WHERE id = v_user_id AND display_name = 'Gestor Exemplo'
  ) THEN
    RAISE EXCEPTION 'canonical Gestor Exemplo user precondition failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM wandora.user_identities
     WHERE user_id = v_user_id AND provider = 'supabase'
  ) THEN
    RAISE EXCEPTION 'canonical Supabase identity link precondition failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.memberships m
      JOIN wandora.organizations o ON o.id = m.organization_id
     WHERE m.user_id = v_user_id
       AND o.slug = 'empresa-exemplo'
       AND m.role = 'owner'
       AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Empresa Exemplo owner membership precondition failed';
  END IF;

  INSERT INTO wandora.memberships (organization_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, 'owner', 'active')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM wandora.memberships
     WHERE organization_id = v_org_id
       AND user_id = v_user_id
       AND role = 'owner'
       AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'internal proof owner membership postcondition failed';
  END IF;
END $$;

COMMIT;
