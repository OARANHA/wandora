BEGIN;

CREATE TYPE wandora.digital_employee_role AS ENUM ('commercial-assistant');
CREATE TYPE wandora.digital_employee_status AS ENUM ('active', 'paused');
CREATE TYPE wandora.autonomy_mode AS ENUM ('supervised');
CREATE TYPE wandora.conversation_status AS ENUM ('open', 'closed');
CREATE TYPE wandora.message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE wandora.work_kind AS ENUM ('qualify-new-contact');
CREATE TYPE wandora.work_status AS ENUM ('in-progress', 'waiting-approval', 'waiting-customer', 'attention-required', 'completed');
CREATE TYPE wandora.approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE wandora.commitment_kind AS ENUM (
  'none', 'discount', 'special-price', 'delivery-deadline', 'payment-terms', 'contractual'
);
CREATE TYPE wandora.audit_actor_type AS ENUM ('human', 'digital-employee', 'system');
CREATE TYPE wandora.audit_action AS ENUM (
  'inbound-accepted', 'approval-requested', 'approval-decided', 'outbound-sent', 'outbound-uncertain'
);
CREATE TYPE wandora_private.event_receipt_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE wandora_private.outbound_attempt_status AS ENUM ('planned', 'sending', 'succeeded', 'uncertain');

ALTER TABLE wandora.messaging_connections
  ADD CONSTRAINT messaging_connections_org_id_unique UNIQUE (organization_id, id);

CREATE TABLE wandora.digital_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  role wandora.digital_employee_role NOT NULL,
  status wandora.digital_employee_status NOT NULL DEFAULT 'active',
  autonomy_mode wandora.autonomy_mode NOT NULL DEFAULT 'supervised',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

CREATE TABLE wandora.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  channel wandora.messaging_channel NOT NULL,
  channel_address text NOT NULL CHECK (length(trim(channel_address)) BETWEEN 1 AND 255),
  display_name text CHECK (display_name IS NULL OR length(trim(display_name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, channel, channel_address),
  UNIQUE (organization_id, id)
);

CREATE TABLE wandora.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  messaging_connection_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  status wandora.conversation_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, messaging_connection_id)
    REFERENCES wandora.messaging_connections(organization_id, id),
  FOREIGN KEY (organization_id, contact_id)
    REFERENCES wandora.contacts(organization_id, id),
  UNIQUE (organization_id, messaging_connection_id, contact_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE wandora.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  direction wandora.message_direction NOT NULL,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 12000),
  source_event_id text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, conversation_id)
    REFERENCES wandora.conversations(organization_id, id),
  CHECK (direction <> 'inbound' OR source_event_id IS NOT NULL)
);

CREATE TABLE wandora.work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  kind wandora.work_kind NOT NULL,
  status wandora.work_status NOT NULL DEFAULT 'in-progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, employee_id)
    REFERENCES wandora.digital_employees(organization_id, id),
  FOREIGN KEY (organization_id, conversation_id)
    REFERENCES wandora.conversations(organization_id, id),
  UNIQUE (organization_id, id)
);

CREATE UNIQUE INDEX work_items_one_active_qualification_idx
  ON wandora.work_items (organization_id, employee_id, conversation_id, kind)
  WHERE status <> 'completed';

CREATE TABLE wandora.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  work_item_id uuid NOT NULL,
  source_event_id text NOT NULL,
  commitment wandora.commitment_kind NOT NULL,
  proposed_text text NOT NULL CHECK (length(trim(proposed_text)) BETWEEN 1 AND 12000),
  rationale text NOT NULL CHECK (length(trim(rationale)) BETWEEN 1 AND 4000),
  status wandora.approval_status NOT NULL DEFAULT 'pending',
  decided_by_user_id uuid REFERENCES wandora.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, employee_id)
    REFERENCES wandora.digital_employees(organization_id, id),
  FOREIGN KEY (organization_id, work_item_id)
    REFERENCES wandora.work_items(organization_id, id),
  FOREIGN KEY (organization_id, decided_by_user_id)
    REFERENCES wandora.memberships(organization_id, user_id),
  UNIQUE (organization_id, work_item_id, source_event_id)
);

CREATE TABLE wandora.audit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  actor_type wandora.audit_actor_type NOT NULL,
  actor_id text NOT NULL CHECK (length(trim(actor_id)) BETWEEN 1 AND 255),
  action wandora.audit_action NOT NULL,
  subject_type text NOT NULL CHECK (length(trim(subject_type)) BETWEEN 1 AND 64),
  subject_id text NOT NULL CHECK (length(trim(subject_id)) BETWEEN 1 AND 255),
  correlation_id text NOT NULL CHECK (length(trim(correlation_id)) BETWEEN 1 AND 255),
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wandora_private.inbound_event_receipts (
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  event_id text NOT NULL CHECK (length(trim(event_id)) BETWEEN 1 AND 255),
  messaging_connection_id uuid NOT NULL,
  status wandora_private.event_receipt_status NOT NULL DEFAULT 'processing',
  result jsonb,
  received_at timestamptz NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (organization_id, event_id),
  FOREIGN KEY (organization_id, messaging_connection_id)
    REFERENCES wandora.messaging_connections(organization_id, id),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE TABLE wandora_private.outbound_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  work_item_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  source_event_id text NOT NULL,
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) BETWEEN 1 AND 255),
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 12000),
  status wandora_private.outbound_attempt_status NOT NULL DEFAULT 'planned',
  gateway_request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, employee_id)
    REFERENCES wandora.digital_employees(organization_id, id),
  FOREIGN KEY (organization_id, work_item_id)
    REFERENCES wandora.work_items(organization_id, id),
  FOREIGN KEY (organization_id, conversation_id)
    REFERENCES wandora.conversations(organization_id, id),
  UNIQUE (organization_id, idempotency_key)
);

CREATE UNIQUE INDEX messages_inbound_event_once_idx
  ON wandora.messages (organization_id, source_event_id)
  WHERE direction = 'inbound';
CREATE UNIQUE INDEX messages_outbound_event_once_idx
  ON wandora.messages (organization_id, source_event_id)
  WHERE direction = 'outbound';
CREATE UNIQUE INDEX audit_records_action_once_idx
  ON wandora.audit_records (organization_id, action, subject_type, subject_id, correlation_id);

CREATE INDEX conversations_org_status_idx
  ON wandora.conversations (organization_id, status, updated_at DESC);
CREATE INDEX messages_conversation_time_idx
  ON wandora.messages (organization_id, conversation_id, occurred_at);
CREATE INDEX work_items_org_status_idx
  ON wandora.work_items (organization_id, status, updated_at DESC);
CREATE INDEX approvals_org_status_idx
  ON wandora.approvals (organization_id, status, created_at DESC);
CREATE INDEX audit_records_org_time_idx
  ON wandora.audit_records (organization_id, occurred_at DESC);
CREATE INDEX outbound_attempts_org_status_idx
  ON wandora_private.outbound_attempts (organization_id, status, updated_at DESC);

CREATE FUNCTION wandora.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER digital_employees_set_updated_at
  BEFORE UPDATE ON wandora.digital_employees
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();
CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON wandora.contacts
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();
CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON wandora.conversations
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();
CREATE TRIGGER work_items_set_updated_at
  BEFORE UPDATE ON wandora.work_items
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();
CREATE TRIGGER outbound_attempts_set_updated_at
  BEFORE UPDATE ON wandora_private.outbound_attempts
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

ALTER TABLE wandora.approvals ADD CONSTRAINT approvals_decision_consistency CHECK (
  (status = 'pending' AND decided_by_user_id IS NULL AND decided_at IS NULL)
  OR (status <> 'pending' AND decided_by_user_id IS NOT NULL AND decided_at IS NOT NULL)
);

ALTER TABLE wandora.digital_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora.audit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY digital_employees_member_read ON wandora.digital_employees
  FOR SELECT USING (wandora.is_active_member(organization_id));
CREATE POLICY contacts_member_read ON wandora.contacts
  FOR SELECT USING (wandora.is_active_member(organization_id));
CREATE POLICY conversations_member_read ON wandora.conversations
  FOR SELECT USING (wandora.is_active_member(organization_id));
CREATE POLICY messages_member_read ON wandora.messages
  FOR SELECT USING (wandora.is_active_member(organization_id));
CREATE POLICY work_items_member_read ON wandora.work_items
  FOR SELECT USING (wandora.is_active_member(organization_id));
CREATE POLICY approvals_member_read ON wandora.approvals
  FOR SELECT USING (wandora.is_active_member(organization_id));

REVOKE ALL ON wandora.digital_employees FROM PUBLIC, authenticated;
REVOKE ALL ON wandora.contacts FROM PUBLIC, authenticated;
REVOKE ALL ON wandora.conversations FROM PUBLIC, authenticated;
REVOKE ALL ON wandora.messages FROM PUBLIC, authenticated;
REVOKE ALL ON wandora.work_items FROM PUBLIC, authenticated;
REVOKE ALL ON wandora.approvals FROM PUBLIC, authenticated;
REVOKE ALL ON wandora.audit_records FROM PUBLIC, authenticated;
REVOKE ALL ON wandora_private.inbound_event_receipts FROM PUBLIC, authenticated;
REVOKE ALL ON wandora_private.outbound_attempts FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION wandora.set_updated_at() FROM PUBLIC;

COMMENT ON TABLE wandora.digital_employees IS
  'Canonical Wandora digital employees; provider/runtime identities never replace this ID.';
COMMENT ON TABLE wandora.contacts IS
  'Organization-owned customer/contact identity for business work.';
COMMENT ON TABLE wandora.conversations IS
  'Provider-neutral business conversation bound to one canonical messaging connection and contact.';
COMMENT ON TABLE wandora.work_items IS
  'Human-readable business work assigned to a canonical Wandora digital employee.';
COMMENT ON TABLE wandora.approvals IS
  'Human approval boundary for employee proposals that exceed configured autonomy.';
COMMENT ON TABLE wandora.audit_records IS
  'Canonical Wandora audit trail using Wandora actor semantics and normalized correlation IDs.';
COMMENT ON TABLE wandora_private.inbound_event_receipts IS
  'Private durable receipt for normalized inbound event idempotency.';
COMMENT ON TABLE wandora_private.outbound_attempts IS
  'Private durable outbound attempt state used to prevent duplicate sends after ambiguous failures.';

COMMIT;
