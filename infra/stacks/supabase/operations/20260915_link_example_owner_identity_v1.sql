\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $$
DECLARE
  v_auth_subject uuid := 'd30f6070-03ba-42bb-ab40-313b1a9b7264';
  v_expected_email text := 'aranha.com@gmail.com';
  v_user uuid := 'e1000000-0000-4000-8000-000000000001';
  v_org uuid := 'e0000000-0000-4000-8000-000000000001';
  v_auth_email text;
  v_existing_user uuid;
  v_existing_subject text;
BEGIN
  SELECT email
    INTO v_auth_email
    FROM auth.users
   WHERE id = v_auth_subject;

  IF v_auth_email IS NULL THEN
    RAISE EXCEPTION 'Supabase Auth user % not found', v_auth_subject;
  END IF;

  IF lower(v_auth_email) <> lower(v_expected_email) THEN
    RAISE EXCEPTION 'Supabase Auth email mismatch for %', v_auth_subject;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.users
     WHERE id = v_user
       AND display_name = 'Gestor Exemplo'
  ) THEN
    RAISE EXCEPTION 'Gestor Exemplo canonical user mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.memberships m
      JOIN wandora.organizations o ON o.id = m.organization_id
     WHERE m.organization_id = v_org
       AND m.user_id = v_user
       AND m.role = 'owner'
       AND m.status = 'active'
       AND o.slug = 'empresa-exemplo'
       AND o.display_name = 'Empresa Exemplo'
       AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Empresa Exemplo owner membership precondition failed';
  END IF;

  SELECT user_id
    INTO v_existing_user
    FROM wandora.user_identities
   WHERE provider = 'supabase'
     AND provider_subject = v_auth_subject::text;

  IF v_existing_user IS NOT NULL AND v_existing_user <> v_user THEN
    RAISE EXCEPTION 'Supabase subject is already linked to another Wandora user';
  END IF;

  SELECT provider_subject
    INTO v_existing_subject
    FROM wandora.user_identities
   WHERE user_id = v_user
     AND provider = 'supabase';

  IF v_existing_subject IS NOT NULL AND v_existing_subject <> v_auth_subject::text THEN
    RAISE EXCEPTION 'Gestor Exemplo is already linked to another Supabase subject';
  END IF;

  INSERT INTO wandora.user_identities (user_id, provider, provider_subject)
  VALUES (v_user, 'supabase', v_auth_subject::text)
  ON CONFLICT (provider, provider_subject) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.user_identities
     WHERE user_id = v_user
       AND provider = 'supabase'
       AND provider_subject = v_auth_subject::text
  ) THEN
    RAISE EXCEPTION 'Identity link postcondition failed';
  END IF;
END $$;

COMMIT;

SELECT 'EXAMPLE_OWNER_IDENTITY_LINK_V1_APPLIED' AS result;
