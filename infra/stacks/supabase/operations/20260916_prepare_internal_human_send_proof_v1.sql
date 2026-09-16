\set ON_ERROR_STOP on

\if :{?target_phone}
\else
  \echo 'target_phone psql variable is required'
  \quit 3
\endif
\if :{?provider_connection_ref}
\else
  \echo 'provider_connection_ref psql variable is required'
  \quit 3
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';

CREATE TEMP TABLE wandora_internal_send_proof_args (
  target_phone text NOT NULL,
  provider_connection_ref text NOT NULL
) ON COMMIT DROP;
INSERT INTO wandora_internal_send_proof_args
VALUES (:'target_phone', :'provider_connection_ref');

DO $$
DECLARE
  v_org_id uuid;
  v_connection_id uuid := 'b3149620-7505-460c-ac62-f7ea50762dee'::uuid;
  v_employee_id uuid := 'a9e99be5-185d-4b2b-a42f-eedba759034f'::uuid;
  v_user_id uuid := 'e1000000-0000-4000-8000-000000000001'::uuid;
  v_contact_id uuid := 'afb85782-2b53-4b7b-8036-258714c2a7a9'::uuid;
  v_conversation_id uuid := '4280c1ed-f27e-4f50-8d7b-bdea1374235e'::uuid;
  v_message_id uuid := '50c0e299-fd69-4d85-990b-6152e8e48e92'::uuid;
  v_work_id uuid := '74fac09d-13ec-4a4f-bc42-53eba8787898'::uuid;
  v_proposal_id uuid := '363f2e27-3986-4531-9b1e-95185d005009'::uuid;
  v_source_event text := 'wandora-internal-human-send-proof-v1-inbound-001';
  v_phone text;
  v_provider_ref text;
BEGIN
  SELECT target_phone, provider_connection_ref
    INTO STRICT v_phone, v_provider_ref
    FROM wandora_internal_send_proof_args;

  IF v_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'target_phone must be canonical E.164';
  END IF;
  IF length(trim(v_provider_ref)) < 1 OR length(v_provider_ref) > 255 THEN
    RAISE EXCEPTION 'provider_connection_ref is invalid';
  END IF;

  SELECT id INTO STRICT v_org_id
    FROM wandora.organizations
   WHERE slug = 'wandora-internal-supervised-proof'
     AND display_name = 'Wandora Internal Supervised Proof'
     AND status = 'active';

  PERFORM 1 FROM wandora.memberships
   WHERE organization_id = v_org_id
     AND user_id = v_user_id
     AND role = 'owner'
     AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof owner membership precondition failed';
  END IF;

  PERFORM 1 FROM wandora.messaging_connections
   WHERE organization_id = v_org_id
     AND id = v_connection_id
     AND channel = 'whatsapp'
     AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'canonical internal proof connection precondition failed';
  END IF;

  PERFORM 1 FROM wandora.digital_employees
   WHERE organization_id = v_org_id
     AND id = v_employee_id
     AND display_name = 'Ana — Internal Supervised Proof'
     AND role = 'commercial-assistant'
     AND status = 'active'
     AND autonomy_mode = 'supervised';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'canonical internal proof employee precondition failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora_private.messaging_provider_bindings
     WHERE connection_id = v_connection_id
       AND (provider <> 'evolution'
         OR provider_connection_ref <> v_provider_ref
         OR credential_ref <> 'messaging-gateway:evolution-api-key')
  ) THEN
    RAISE EXCEPTION 'existing provider binding does not match internal proof contract';
  END IF;
  IF EXISTS (
    SELECT 1 FROM wandora_private.messaging_provider_bindings
     WHERE provider = 'evolution'
       AND provider_connection_ref = v_provider_ref
       AND connection_id <> v_connection_id
  ) THEN
    RAISE EXCEPTION 'Evolution provider connection is already bound elsewhere';
  END IF;

  INSERT INTO wandora_private.messaging_provider_bindings
    (connection_id, provider, provider_connection_ref, credential_ref)
  VALUES
    (v_connection_id, 'evolution', v_provider_ref, 'messaging-gateway:evolution-api-key')
  ON CONFLICT (connection_id) DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM wandora.contacts
     WHERE organization_id = v_org_id
       AND channel = 'whatsapp'
       AND channel_address = v_phone
       AND id <> v_contact_id
  ) THEN
    RAISE EXCEPTION 'target phone already belongs to another contact in internal proof tenant';
  END IF;

  INSERT INTO wandora.contacts
    (id, organization_id, channel, channel_address, display_name)
  VALUES
    (v_contact_id, v_org_id, 'whatsapp', v_phone, 'Authorized Human Send Proof Target')
  ON CONFLICT DO NOTHING;

  PERFORM 1 FROM wandora.contacts
   WHERE id = v_contact_id
     AND organization_id = v_org_id
     AND channel = 'whatsapp'
     AND channel_address = v_phone;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof contact postcondition failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.conversations
     WHERE organization_id = v_org_id
       AND messaging_connection_id = v_connection_id
       AND contact_id = v_contact_id
       AND id <> v_conversation_id
  ) THEN
    RAISE EXCEPTION 'internal proof conversation already exists under another id';
  END IF;

  INSERT INTO wandora.conversations
    (id, organization_id, messaging_connection_id, contact_id, status)
  VALUES
    (v_conversation_id, v_org_id, v_connection_id, v_contact_id, 'open')
  ON CONFLICT DO NOTHING;

  PERFORM 1 FROM wandora.conversations
   WHERE id = v_conversation_id
     AND organization_id = v_org_id
     AND messaging_connection_id = v_connection_id
     AND contact_id = v_contact_id
     AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof conversation postcondition failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.messages
     WHERE organization_id = v_org_id
       AND direction = 'inbound'
       AND source_event_id = v_source_event
       AND id <> v_message_id
  ) THEN
    RAISE EXCEPTION 'internal proof source event already exists under another message';
  END IF;

  INSERT INTO wandora.messages
    (id, organization_id, conversation_id, direction, body, source_event_id, occurred_at)
  VALUES
    (v_message_id, v_org_id, v_conversation_id, 'inbound',
     'Teste interno autorizado: validar o fluxo supervisionado Wandora.',
     v_source_event, now())
  ON CONFLICT DO NOTHING;

  PERFORM 1 FROM wandora.messages
   WHERE id = v_message_id
     AND organization_id = v_org_id
     AND conversation_id = v_conversation_id
     AND direction = 'inbound'
     AND source_event_id = v_source_event;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof inbound message postcondition failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.work_items
     WHERE organization_id = v_org_id
       AND employee_id = v_employee_id
       AND conversation_id = v_conversation_id
       AND kind = 'qualify-new-contact'
       AND status <> 'completed'
       AND id <> v_work_id
  ) THEN
    RAISE EXCEPTION 'internal proof active work already exists under another id';
  END IF;

  INSERT INTO wandora.work_items
    (id, organization_id, employee_id, conversation_id, kind, status)
  VALUES
    (v_work_id, v_org_id, v_employee_id, v_conversation_id,
     'qualify-new-contact', 'attention-required')
  ON CONFLICT DO NOTHING;

  PERFORM 1 FROM wandora.work_items
   WHERE id = v_work_id
     AND organization_id = v_org_id
     AND employee_id = v_employee_id
     AND conversation_id = v_conversation_id
     AND kind = 'qualify-new-contact'
     AND status = 'attention-required';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof work postcondition failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.work_proposals
     WHERE organization_id = v_org_id
       AND source_event_id = v_source_event
       AND id <> v_proposal_id
  ) THEN
    RAISE EXCEPTION 'internal proof proposal source event already exists under another id';
  END IF;

  INSERT INTO wandora.work_proposals
    (id, organization_id, employee_id, work_item_id, conversation_id,
     source_event_id, kind, proposed_text, commitment, rationale)
  VALUES
    (v_proposal_id, v_org_id, v_employee_id, v_work_id, v_conversation_id,
     v_source_event, 'send-text',
     'Teste Wandora: envio supervisionado concluído com sucesso. Nenhuma ação é necessária.',
     'none',
     'Prova interna autorizada do Human Send Proposal V1 em canal controlado.')
  ON CONFLICT DO NOTHING;

  PERFORM 1 FROM wandora.work_proposals
   WHERE id = v_proposal_id
     AND organization_id = v_org_id
     AND employee_id = v_employee_id
     AND work_item_id = v_work_id
     AND conversation_id = v_conversation_id
     AND source_event_id = v_source_event
     AND kind = 'send-text'
     AND commitment = 'none';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof proposal postcondition failed';
  END IF;
END $$;

COMMIT;
