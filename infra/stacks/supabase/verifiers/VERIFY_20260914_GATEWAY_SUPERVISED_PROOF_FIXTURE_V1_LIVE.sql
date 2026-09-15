\set ON_ERROR_STOP on

BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';

DO $$
DECLARE
  v_org uuid := '3ddc8ca6-8961-4ad3-99e0-d7f869249a61';
  v_connection uuid := 'b3149620-7505-460c-ac62-f7ea50762dee';
  v_employee uuid := 'a9e99be5-185d-4b2b-a42f-eedba759034f';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM wandora.organizations
    WHERE id = v_org
      AND slug = 'wandora-internal-supervised-proof'
      AND display_name = 'Wandora Internal Supervised Proof'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'controlled proof organization is absent or drifted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM wandora.messaging_connections
    WHERE id = v_connection
      AND organization_id = v_org
      AND channel = 'whatsapp'
      AND label = 'WhatsApp Lab — Supervised Proof'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'controlled proof messaging connection is absent or drifted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM wandora.digital_employees
    WHERE id = v_employee
      AND organization_id = v_org
      AND display_name = 'Ana — Internal Supervised Proof'
      AND role = 'commercial-assistant'
      AND status = 'active'
      AND autonomy_mode = 'supervised'
  ) THEN
    RAISE EXCEPTION 'controlled proof Ana employee is absent or drifted';
  END IF;
END $$;

SELECT 'GATEWAY_SUPERVISED_PROOF_FIXTURE_V1_LIVE_OK' AS verifier;
ROLLBACK;
