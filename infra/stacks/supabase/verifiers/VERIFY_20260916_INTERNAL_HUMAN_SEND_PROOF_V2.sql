\set ON_ERROR_STOP on

DO $$
DECLARE
  v_org_id uuid;
  v_connection_id uuid := 'b3149620-7505-460c-ac62-f7ea50762dee'::uuid;
  v_employee_id uuid := 'a9e99be5-185d-4b2b-a42f-eedba759034f'::uuid;
  v_conversation_id uuid := '4280c1ed-f27e-4f50-8d7b-bdea1374235e'::uuid;
  v_work_id uuid := '74fac09d-13ec-4a4f-bc42-53eba8787898'::uuid;
  v_v1_proposal_id uuid := '363f2e27-3986-4531-9b1e-95185d005009'::uuid;
  v_v2_message_id uuid := '3691d140-e765-48c3-8820-43e7a7bf2af5'::uuid;
  v_v2_proposal_id uuid := '47b63811-e036-4986-a872-6b738c6855cf'::uuid;
  v_v2_source_event text := 'wandora-internal-human-send-proof-v2-inbound-001';
  v_latest_id uuid;
  v_count integer;
BEGIN
  SELECT id INTO STRICT v_org_id
    FROM wandora.organizations
   WHERE slug = 'wandora-internal-supervised-proof'
     AND display_name = 'Wandora Internal Supervised Proof'
     AND status = 'active';

  SELECT count(*) INTO v_count
    FROM wandora_private.messaging_provider_bindings
   WHERE connection_id = v_connection_id
     AND provider = 'evolution'
     AND provider_connection_ref = 'wandora-lab-01'
     AND credential_ref = 'messaging-gateway:evolution-api-key';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'internal provider binding mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.work_items
   WHERE organization_id = v_org_id
     AND id = v_work_id
     AND employee_id = v_employee_id
     AND conversation_id = v_conversation_id
     AND kind = 'qualify-new-contact'
     AND status = 'attention-required';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'internal work mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora_private.outbound_attempts
   WHERE organization_id = v_org_id
     AND proposal_id = v_v1_proposal_id
     AND status = 'uncertain';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'V1 uncertain attempt mismatch: %', v_count;
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.messages
   WHERE organization_id = v_org_id
     AND direction = 'outbound'
     AND source_event_id = 'proposal-send:363f2e27-3986-4531-9b1e-95185d005009';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'V1 canonical outbound must remain absent';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.messages
   WHERE id = v_v2_message_id
     AND organization_id = v_org_id
     AND conversation_id = v_conversation_id
     AND direction = 'inbound'
     AND source_event_id = v_v2_source_event
     AND body = 'Teste interno autorizado V2: repetir a prova após correção do boundary Evolution Origin.';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'V2 inbound message mismatch: %', v_count;
  END IF;

  SELECT id INTO v_latest_id
    FROM wandora.messages
   WHERE organization_id = v_org_id
     AND conversation_id = v_conversation_id
   ORDER BY occurred_at DESC, created_at DESC, id DESC
   LIMIT 1;
  IF v_latest_id IS DISTINCT FROM v_v2_message_id THEN
    RAISE EXCEPTION 'V2 inbound message is not latest conversation message';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.work_proposals
   WHERE id = v_v2_proposal_id
     AND organization_id = v_org_id
     AND employee_id = v_employee_id
     AND work_item_id = v_work_id
     AND conversation_id = v_conversation_id
     AND source_event_id = v_v2_source_event
     AND kind = 'send-text'
     AND commitment = 'none'
     AND proposed_text = 'Teste Wandora V2: envio supervisionado concluído com sucesso. Nenhuma ação é necessária.';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'V2 proposal mismatch: %', v_count;
  END IF;

  SELECT id INTO v_latest_id
    FROM wandora.work_proposals
   WHERE organization_id = v_org_id
     AND work_item_id = v_work_id
   ORDER BY created_at DESC, id DESC
   LIMIT 1;
  IF v_latest_id IS DISTINCT FROM v_v2_proposal_id THEN
    RAISE EXCEPTION 'V2 proposal is not latest work proposal';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora_private.outbound_attempts
   WHERE organization_id = v_org_id
     AND proposal_id = v_v2_proposal_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'V2 must have no outbound attempt before human action';
  END IF;

  SELECT count(*) INTO v_count
    FROM wandora.messages
   WHERE organization_id = v_org_id
     AND direction = 'outbound'
     AND source_event_id = 'proposal-send:47b63811-e036-4986-a872-6b738c6855cf';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'V2 must have no canonical outbound message before human action';
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

SELECT 'INTERNAL_HUMAN_SEND_PROOF_V2_READY' AS result;
