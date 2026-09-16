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

CREATE TEMP TABLE wandora_internal_send_proof_verify_args (
  target_phone text NOT NULL,
  provider_connection_ref text NOT NULL
) ON COMMIT DROP;
INSERT INTO wandora_internal_send_proof_verify_args
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
  v_count integer;
BEGIN
  SELECT target_phone, provider_connection_ref
    INTO STRICT v_phone, v_provider_ref
    FROM wandora_internal_send_proof_verify_args;

  SELECT id INTO STRICT v_org_id
    FROM wandora.organizations
   WHERE slug = 'wandora-internal-supervised-proof'
     AND display_name = 'Wandora Internal Supervised Proof'
     AND status = 'active';

  SELECT count(*) INTO v_count FROM wandora.memberships
   WHERE organization_id = v_org_id
     AND user_id = v_user_id
     AND role = 'owner'
     AND status = 'active';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'internal proof owner membership mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora_private.messaging_provider_bindings
   WHERE connection_id = v_connection_id
     AND provider = 'evolution'
     AND provider_connection_ref = v_provider_ref
     AND credential_ref = 'messaging-gateway:evolution-api-key';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'provider binding mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM wandora.contacts
   WHERE id = v_contact_id
     AND organization_id = v_org_id
     AND channel = 'whatsapp'
     AND channel_address = v_phone;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'internal proof contact mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM wandora.conversations
   WHERE id = v_conversation_id
     AND organization_id = v_org_id
     AND messaging_connection_id = v_connection_id
     AND contact_id = v_contact_id
     AND status = 'open';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'internal proof conversation mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM wandora.messages
   WHERE id = v_message_id
     AND organization_id = v_org_id
     AND conversation_id = v_conversation_id
     AND direction = 'inbound'
     AND source_event_id = v_source_event;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'internal proof inbound message mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM wandora.work_items
   WHERE id = v_work_id
     AND organization_id = v_org_id
     AND employee_id = v_employee_id
     AND conversation_id = v_conversation_id
     AND kind = 'qualify-new-contact'
     AND status = 'attention-required';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'internal proof work mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM wandora.work_proposals
   WHERE id = v_proposal_id
     AND organization_id = v_org_id
     AND employee_id = v_employee_id
     AND work_item_id = v_work_id
     AND conversation_id = v_conversation_id
     AND source_event_id = v_source_event
     AND kind = 'send-text'
     AND commitment = 'none'
     AND proposed_text = 'Teste Wandora: envio supervisionado concluído com sucesso. Nenhuma ação é necessária.';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'internal proof proposal mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora_private.outbound_attempts
   WHERE organization_id = v_org_id
     AND proposal_id = v_proposal_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'proof proposal must have no outbound attempt before human action';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.messages
   WHERE organization_id = v_org_id
     AND direction = 'outbound'
     AND source_event_id = 'proposal-send:363f2e27-3986-4531-9b1e-95185d005009';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'proof proposal must have no outbound message before human action';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora_private.messaging_provider_bindings pb
    JOIN wandora.messaging_connections mc ON mc.id = pb.connection_id
    JOIN wandora.organizations o ON o.id = mc.organization_id
   WHERE o.slug = 'empresa-exemplo';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Empresa Exemplo must remain without provider binding';
  END IF;
END $$;

SELECT 'INTERNAL_HUMAN_SEND_PROOF_V1_READY' AS result;
