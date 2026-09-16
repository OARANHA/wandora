\set ON_ERROR_STOP on

DO $$
DECLARE
  v_user_id uuid := 'e1000000-0000-4000-8000-000000000001'::uuid;
  v_internal_org_id uuid;
  v_count integer;
BEGIN
  SELECT id INTO STRICT v_internal_org_id
    FROM wandora.organizations
   WHERE slug = 'wandora-internal-supervised-proof'
     AND display_name = 'Wandora Internal Supervised Proof'
     AND status = 'active';

  SELECT count(*) INTO v_count
    FROM wandora.memberships
   WHERE organization_id = v_internal_org_id
     AND user_id = v_user_id
     AND role = 'owner'
     AND status = 'active';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one active owner membership in internal proof tenant, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.memberships m
    JOIN wandora.organizations o ON o.id = m.organization_id
   WHERE m.user_id = v_user_id
     AND o.slug = 'empresa-exemplo'
     AND m.role = 'owner'
     AND m.status = 'active';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Empresa Exemplo owner membership was not preserved';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.user_identities
   WHERE user_id = v_user_id
     AND provider = 'supabase';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one Supabase identity for canonical user, got %', v_count;
  END IF;
END $$;

SELECT 'INTERNAL_PROOF_OWNER_LINK_V1_OK' AS result;
