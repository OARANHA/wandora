\set ON_ERROR_STOP on

INSERT INTO wandora.organizations (id, slug, display_name) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'org-a', 'Org A'),
  ('00000000-0000-0000-0000-0000000000b1', 'org-b', 'Org B');

INSERT INTO wandora.users (id, display_name) VALUES
  ('10000000-0000-0000-0000-0000000000a1', 'Owner A'),
  ('10000000-0000-0000-0000-0000000000b1', 'Owner B');

INSERT INTO wandora.user_identities (user_id, provider, provider_subject) VALUES
  ('10000000-0000-0000-0000-0000000000a1', 'supabase', 'subject-a'),
  ('10000000-0000-0000-0000-0000000000b1', 'supabase', 'subject-b');

INSERT INTO wandora.memberships (organization_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 'owner');

INSERT INTO wandora.messaging_connections (id, organization_id, channel, label) VALUES
  ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'whatsapp', 'WhatsApp A'),
  ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'whatsapp', 'WhatsApp B');

INSERT INTO wandora.digital_employees (id, organization_id, display_name, role) VALUES
  ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Ana', 'commercial-assistant'),
  ('30000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Ana B', 'commercial-assistant');
INSERT INTO wandora.contacts (id, organization_id, channel, channel_address, display_name) VALUES
  ('40000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'whatsapp', '+555100000001', 'Maria'),
  ('40000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'whatsapp', '+555100000001', 'Maria B');

INSERT INTO wandora.conversations (id, organization_id, messaging_connection_id, contact_id) VALUES
  ('50000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1'),
  ('50000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1');

DO $$
BEGIN
  BEGIN
    INSERT INTO wandora.conversations (organization_id, messaging_connection_id, contact_id)
    VALUES ('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000a1');
    RAISE EXCEPTION 'cross-tenant connection unexpectedly accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;

INSERT INTO wandora.work_items (id, organization_id, employee_id, conversation_id, kind)
VALUES ('60000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1', 'qualify-new-contact');
DO $$
BEGIN
  BEGIN
    INSERT INTO wandora.work_items (organization_id, employee_id, conversation_id, kind)
    VALUES ('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1', 'qualify-new-contact');
    RAISE EXCEPTION 'second active qualification unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

UPDATE wandora.work_items
SET status = 'completed'
WHERE id = '60000000-0000-0000-0000-0000000000a1';

INSERT INTO wandora.work_items (id, organization_id, employee_id, conversation_id, kind)
VALUES ('60000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1', 'qualify-new-contact');

INSERT INTO wandora.messages (organization_id, conversation_id, direction, body, source_event_id, occurred_at)
VALUES ('00000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1', 'inbound', 'Olá', 'evt-001', now());

DO $$
BEGIN
  BEGIN
    INSERT INTO wandora.messages (organization_id, conversation_id, direction, body, source_event_id, occurred_at)
    VALUES ('00000000-0000-0000-0000-0000000000a1', '50000000-0000-0000-0000-0000000000a1', 'inbound', 'Duplicada', 'evt-001', now());
    RAISE EXCEPTION 'duplicate inbound event unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

INSERT INTO wandora_private.inbound_event_receipts (
  organization_id, event_id, messaging_connection_id, status, received_at, completed_at, result
) VALUES (
  '00000000-0000-0000-0000-0000000000a1', 'evt-001', '20000000-0000-0000-0000-0000000000a1',
  'completed', now(), now(), '{"status":"accepted"}'::jsonb
);

DO $$
BEGIN
  BEGIN
    INSERT INTO wandora_private.inbound_event_receipts (organization_id, event_id, messaging_connection_id, received_at)
    VALUES ('00000000-0000-0000-0000-0000000000a1', 'evt-001', '20000000-0000-0000-0000-0000000000a1', now());
    RAISE EXCEPTION 'duplicate receipt unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO wandora_private.inbound_event_receipts (organization_id, event_id, messaging_connection_id, received_at)
    VALUES ('00000000-0000-0000-0000-0000000000a1', 'evt-cross', '20000000-0000-0000-0000-0000000000b1', now());
    RAISE EXCEPTION 'cross-tenant receipt unexpectedly accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;

INSERT INTO wandora.approvals (
  id, organization_id, employee_id, work_item_id, source_event_id, commitment, proposed_text, rationale
) VALUES (
  '70000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
  '30000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-0000000000a2',
  'evt-002', 'discount', 'Posso oferecer 12% de desconto.', 'Cliente pediu condição especial.'
);
DO $$
BEGIN
  BEGIN
    UPDATE wandora.approvals
    SET status = 'approved'
    WHERE id = '70000000-0000-0000-0000-0000000000a1';
    RAISE EXCEPTION 'approval without human decision unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

UPDATE wandora.approvals
SET status = 'approved',
    decided_by_user_id = '10000000-0000-0000-0000-0000000000a1',
    decided_at = now()
WHERE id = '70000000-0000-0000-0000-0000000000a1';

INSERT INTO wandora_private.outbound_attempts (
  organization_id, employee_id, work_item_id, conversation_id,
  source_event_id, idempotency_key, body, status
) VALUES (
  '00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1',
  '60000000-0000-0000-0000-0000000000a2', '50000000-0000-0000-0000-0000000000a1',
  'evt-003', 'out-org-a-evt-003', 'Olá, posso entender melhor sua necessidade?', 'planned'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO wandora_private.outbound_attempts (
      organization_id, employee_id, work_item_id, conversation_id, source_event_id, idempotency_key, body
    ) VALUES (
      '00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1',
      '60000000-0000-0000-0000-0000000000a2', '50000000-0000-0000-0000-0000000000a1',
      'evt-004', 'out-org-a-evt-003', 'Duplicada'
    );
    RAISE EXCEPTION 'duplicate outbound idempotency key unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
DO $$
BEGIN
  BEGIN
    INSERT INTO wandora_private.outbound_attempts (
      organization_id, employee_id, work_item_id, conversation_id, source_event_id, idempotency_key, body
    ) VALUES (
      '00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000b1',
      '60000000-0000-0000-0000-0000000000a2', '50000000-0000-0000-0000-0000000000a1',
      'evt-cross-2', 'out-cross', 'Cross tenant'
    );
    RAISE EXCEPTION 'cross-tenant employee unexpectedly accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;

INSERT INTO wandora.audit_records (
  organization_id, actor_type, actor_id, action, subject_type, subject_id, correlation_id, occurred_at
) VALUES (
  '00000000-0000-0000-0000-0000000000a1', 'digital-employee',
  '30000000-0000-0000-0000-0000000000a1', 'approval-requested', 'approval',
  '70000000-0000-0000-0000-0000000000a1', 'evt-002', now()
);

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'wandora.digital_employees', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated unexpectedly has direct digital_employees read';
  END IF;
  IF has_table_privilege('authenticated', 'wandora.contacts', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated unexpectedly has direct contacts read';
  END IF;
  IF has_table_privilege('authenticated', 'wandora.approvals', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated unexpectedly has direct approvals read';
  END IF;
  IF has_table_privilege('authenticated', 'wandora_private.inbound_event_receipts', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated unexpectedly has private receipt read';
  END IF;
END $$;

DO $$
DECLARE
  active_work_count integer;
  approval_count integer;
  receipt_count integer;
BEGIN
  SELECT count(*) INTO active_work_count
  FROM wandora.work_items
  WHERE organization_id = '00000000-0000-0000-0000-0000000000a1'
    AND status <> 'completed';
  IF active_work_count <> 1 THEN
    RAISE EXCEPTION 'expected one active qualification work item, got %', active_work_count;
  END IF;

  SELECT count(*) INTO approval_count FROM wandora.approvals;
  IF approval_count <> 1 THEN
    RAISE EXCEPTION 'expected one approval, got %', approval_count;
  END IF;

  SELECT count(*) INTO receipt_count FROM wandora_private.inbound_event_receipts;
  IF receipt_count <> 1 THEN
    RAISE EXCEPTION 'expected one durable receipt, got %', receipt_count;
  END IF;
END $$;

SELECT 'ANA_DURABLE_CORE_STATE_V1_OK' AS result;
