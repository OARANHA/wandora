\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $$
DECLARE
  v_org uuid := '3ddc8ca6-8961-4ad3-99e0-d7f869249a61';
  v_connection uuid := 'b3149620-7505-460c-ac62-f7ea50762dee';
  v_employee uuid := 'a9e99be5-185d-4b2b-a42f-eedba759034f';
BEGIN
  IF EXISTS (
    SELECT 1 FROM wandora.organizations
    WHERE id = v_org
      AND (slug <> 'wandora-internal-supervised-proof'
        OR display_name <> 'Wandora Internal Supervised Proof')
  ) THEN
    RAISE EXCEPTION 'proof organization id is already used by different data';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.organizations
    WHERE slug = 'wandora-internal-supervised-proof' AND id <> v_org
  ) THEN
    RAISE EXCEPTION 'proof organization slug is already used by another id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.messaging_connections
    WHERE id = v_connection AND organization_id <> v_org
  ) THEN
    RAISE EXCEPTION 'proof messaging connection id belongs to another organization';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.digital_employees
    WHERE id = v_employee AND organization_id <> v_org
  ) THEN
    RAISE EXCEPTION 'proof employee id belongs to another organization';
  END IF;
END $$;

INSERT INTO wandora.organizations (id, slug, display_name, status)
VALUES (
  '3ddc8ca6-8961-4ad3-99e0-d7f869249a61',
  'wandora-internal-supervised-proof',
  'Wandora Internal Supervised Proof',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wandora.messaging_connections (id, organization_id, channel, label, status)
VALUES (
  'b3149620-7505-460c-ac62-f7ea50762dee',
  '3ddc8ca6-8961-4ad3-99e0-d7f869249a61',
  'whatsapp',
  'WhatsApp Lab — Supervised Proof',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wandora.digital_employees (
  id, organization_id, display_name, role, status, autonomy_mode
)
VALUES (
  'a9e99be5-185d-4b2b-a42f-eedba759034f',
  '3ddc8ca6-8961-4ad3-99e0-d7f869249a61',
  'Ana — Internal Supervised Proof',
  'commercial-assistant',
  'active',
  'supervised'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

SELECT 'GATEWAY_SUPERVISED_PROOF_FIXTURE_V1_APPLIED' AS result;
