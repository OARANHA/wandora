INSERT INTO wandora.organizations (id, slug, display_name) VALUES
  ('00000000-0000-4000-8000-000000000001', 'acme', 'Acme'),
  ('00000000-0000-4000-8000-000000000002', 'beta', 'Beta');

INSERT INTO wandora.users (id, display_name) VALUES
  ('00000000-0000-4000-8000-000000000011', 'Alice'),
  ('00000000-0000-4000-8000-000000000012', 'Bob'),
  ('00000000-0000-4000-8000-000000000013', 'Carol');

INSERT INTO wandora.user_identities (user_id, provider, provider_subject) VALUES
  ('00000000-0000-4000-8000-000000000011', 'supabase', 'sub-alice'),
  ('00000000-0000-4000-8000-000000000012', 'supabase', 'sub-bob'),
  ('00000000-0000-4000-8000-000000000013', 'supabase', 'sub-carol');

INSERT INTO wandora.memberships (organization_id, user_id, role) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'owner'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000012', 'admin'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'member');

INSERT INTO wandora.messaging_connections (id, organization_id, channel, label) VALUES
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'whatsapp', 'Acme WhatsApp'),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000002', 'whatsapp', 'Beta WhatsApp');

INSERT INTO wandora_private.messaging_provider_bindings
  (connection_id, provider, provider_connection_ref, credential_ref)
VALUES
  ('00000000-0000-4000-8000-000000000021', 'evolution', 'provider-acme', 'secret://acme'),
  ('00000000-0000-4000-8000-000000000022', 'evolution', 'provider-beta', 'secret://beta');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'sub-alice', false);

DO $$
BEGIN
  IF wandora.current_user_id() <> '00000000-0000-4000-8000-000000000011'::uuid THEN
    RAISE EXCEPTION 'alice identity mapping failed';
  END IF;
  IF (SELECT count(*) FROM wandora.organizations) <> 1 THEN
    RAISE EXCEPTION 'alice organization RLS failed';
  END IF;
  IF (SELECT count(*) FROM wandora.messaging_connections) <> 1 THEN
    RAISE EXCEPTION 'alice connection RLS failed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT wandora.is_active_member('00000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'alice own membership denied';
  END IF;
  IF wandora.is_active_member('00000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'cross-tenant membership allowed';
  END IF;
  IF NOT wandora.has_org_role(
    '00000000-0000-4000-8000-000000000001',
    ARRAY['owner','admin']::wandora.membership_role[]
  ) THEN
    RAISE EXCEPTION 'owner role resolution failed';
  END IF;
  IF NOT wandora.can_access_messaging_connection('00000000-0000-4000-8000-000000000021') THEN
    RAISE EXCEPTION 'own connection access denied';
  END IF;
  IF wandora.can_access_messaging_connection('00000000-0000-4000-8000-000000000022') THEN
    RAISE EXCEPTION 'cross-tenant connection access allowed';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM wandora_private.messaging_provider_bindings LIMIT 1;
    RAISE EXCEPTION 'provider-private binding unexpectedly readable';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', 'sub-carol', false);
DO $$
BEGIN
  IF wandora.has_org_role(
    '00000000-0000-4000-8000-000000000001',
    ARRAY['owner','admin']::wandora.membership_role[]
  ) THEN
    RAISE EXCEPTION 'member escalated into admin role';
  END IF;
  IF NOT wandora.can_access_messaging_connection('00000000-0000-4000-8000-000000000021') THEN
    RAISE EXCEPTION 'active member lost tenant-scoped connection visibility';
  END IF;
END $$;

RESET ROLE;
UPDATE wandora.memberships
SET status = 'suspended'
WHERE organization_id = '00000000-0000-4000-8000-000000000001'
  AND user_id = '00000000-0000-4000-8000-000000000013';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'sub-carol', false);
DO $$
BEGIN
  IF wandora.is_active_member('00000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'suspended membership retained access';
  END IF;
  IF (SELECT count(*) FROM wandora.messaging_connections) <> 0 THEN
    RAISE EXCEPTION 'suspended member can still read messaging connection';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'unknown-subject', false);
DO $$
BEGIN
  IF wandora.current_user_id() IS NOT NULL THEN
    RAISE EXCEPTION 'unknown auth subject mapped to user';
  END IF;
  IF (SELECT count(*) FROM wandora.organizations) <> 0 THEN
    RAISE EXCEPTION 'unknown subject can read organizations';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'sub-bob', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM wandora.messaging_connections) <> 1 THEN
    RAISE EXCEPTION 'bob connection visibility failed';
  END IF;
  IF NOT wandora.can_access_messaging_connection('00000000-0000-4000-8000-000000000022') THEN
    RAISE EXCEPTION 'bob own connection denied';
  END IF;
  IF wandora.can_access_messaging_connection('00000000-0000-4000-8000-000000000021') THEN
    RAISE EXCEPTION 'bob can access acme connection';
  END IF;
END $$;

RESET ROLE;
SELECT 'CORE_MULTITENANT_AUTH_V1_OK' AS result;
