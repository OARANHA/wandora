\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';

DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := 'e1000000-0000-4000-8000-000000000001'::uuid;
  v_connection_id uuid := 'b3149620-7505-460c-ac62-f7ea50762dee'::uuid;
  v_employee_id uuid := 'a9e99be5-185d-4b2b-a42f-eedba759034f'::uuid;
  v_contact_id uuid := 'afb85782-2b53-4b7b-8036-258714c2a7a9'::uuid;
  v_conversation_id uuid := '4280c1ed-f27e-4f50-8d7b-bdea1374235e'::uuid;
  v_work_id uuid := '74fac09d-13ec-4a4f-bc42-53eba8787898'::uuid;
  v_v1_proposal_id uuid := '363f2e27-3986-4531-9b1e-95185d005009'::uuid;
  v_v2_message_id uuid := '3691d140-e765-48c3-8820-43e7a7bf2af5'::uuid;
  v_v2_proposal_id uuid := '47b63811-e036-4986-a872-6b738c6855cf'::uuid;
  v_v2_source_event text := 'wandora-internal-human-send-proof-v2-inbound-001';
  v_count integer;
BEGIN
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

  PERFORM 1 FROM wandora_private.messaging_provider_bindings
   WHERE connection_id = v_connection_id
     AND provider = 'evolution'
     AND provider_connection_ref = 'wandora-lab-01'
     AND credential_ref = 'messaging-gateway:evolution-api-key';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof provider binding precondition failed';
  END IF;

  PERFORM 1 FROM wandora.digital_employees
   WHERE organization_id = v_org_id
     AND id = v_employee_id
     AND display_name = 'Ana — Internal Supervised Proof'
     AND status = 'active'
     AND autonomy_mode = 'supervised';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'canonical internal proof employee precondition failed';
  END IF;

  PERFORM 1 FROM wandora.contacts
   WHERE organization_id = v_org_id
     AND id = v_contact_id
     AND channel = 'whatsapp';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof contact precondition failed';
  END IF;

  PERFORM 1 FROM wandora.conversations
   WHERE organization_id = v_org_id
     AND id = v_conversation_id
     AND messaging_connection_id = v_connection_id
     AND contact_id = v_contact_id
     AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof conversation precondition failed';
  END IF;

  PERFORM 1 FROM wandora.work_items
   WHERE organization_id = v_org_id
     AND id = v_work_id
     AND employee_id = v_employee_id
     AND conversation_id = v_conversation_id
     AND kind = 'qualify-new-contact'
     AND status = 'attention-required';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal proof work precondition failed';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora_private.outbound_attempts
   WHERE organization_id = v_org_id
     AND proposal_id = v_v1_proposal_id
     AND status = 'uncertain';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'V1 uncertain attempt precondition mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.messages
   WHERE organization_id = v_org_id
     AND direction = 'outbound'
     AND source_event_id = 'proposal-send:363f2e27-3986-4531-9b1e-95185d005009';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'V1 must remain without canonical outbound message';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.messages
     WHERE organization_id = v_org_id
       AND source_event_id = v_v2_source_event
       AND id <> v_v2_message_id
  ) THEN
    RAISE EXCEPTION 'V2 source event already exists under another message';
  END IF;

  INSERT INTO wandora.messages
    (id, organization_id, conversation_id, direction, body, source_event_id, occurred_at)
  VALUES
    (v_v2_message_id, v_org_id, v_conversation_id, 'inbound',
     'Teste interno autorizado V2: repetir a prova após correção do boundary Evolution Origin.',
     v_v2_source_event, now())
  ON CONFLICT (id) DO NOTHING;

  PERFORM 1 FROM wandora.messages
   WHERE id = v_v2_message_id
     AND organization_id = v_org_id
     AND conversation_id = v_conversation_id
     AND direction = 'inbound'
     AND source_event_id = v_v2_source_event;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'V2 inbound message postcondition failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.work_proposals
     WHERE organization_id = v_org_id
       AND source_event_id = v_v2_source_event
       AND id <> v_v2_proposal_id
  ) THEN
    RAISE EXCEPTION 'V2 source event already exists under another proposal';
  END IF;

  INSERT INTO wandora.work_proposals
    (id, organization_id, employee_id, work_item_id, conversation_id,
     source_event_id, kind, proposed_text, commitment, rationale)
  VALUES
    (v_v2_proposal_id, v_org_id, v_employee_id, v_work_id, v_conversation_id,
     v_v2_source_event, 'send-text',
     'Teste Wandora V2: envio supervisionado concluído com sucesso. Nenhuma ação é necessária.',
     'none',
     'Segunda prova interna autorizada após correção do Evolution Private Outbound Origin V1.')
  ON CONFLICT (id) DO NOTHING;

  PERFORM 1 FROM wandora.work_proposals
   WHERE id = v_v2_proposal_id
     AND organization_id = v_org_id
     AND employee_id = v_employee_id
     AND work_item_id = v_work_id
     AND conversation_id = v_conversation_id
     AND source_event_id = v_v2_source_event
     AND kind = 'send-text'
     AND commitment = 'none';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'V2 proposal postcondition failed';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora_private.outbound_attempts
   WHERE organization_id = v_org_id
     AND proposal_id = v_v2_proposal_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'V2 must start without outbound attempt';
  END IF;
END $$;

COMMIT;
