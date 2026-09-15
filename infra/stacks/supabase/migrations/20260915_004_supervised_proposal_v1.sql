BEGIN;

CREATE TYPE wandora.work_proposal_kind AS ENUM ('send-text');

CREATE TABLE wandora.work_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  work_item_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  source_event_id text NOT NULL CHECK (length(trim(source_event_id)) BETWEEN 1 AND 255),
  kind wandora.work_proposal_kind NOT NULL,
  proposed_text text NOT NULL CHECK (length(trim(proposed_text)) BETWEEN 1 AND 12000),
  commitment wandora.commitment_kind NOT NULL,
  rationale text NOT NULL CHECK (length(trim(rationale)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, employee_id)
    REFERENCES wandora.digital_employees(organization_id, id),
  FOREIGN KEY (organization_id, work_item_id)
    REFERENCES wandora.work_items(organization_id, id),
  FOREIGN KEY (organization_id, conversation_id)
    REFERENCES wandora.conversations(organization_id, id),
  UNIQUE (organization_id, source_event_id),
  UNIQUE (organization_id, id),
  CHECK (commitment = 'none'::wandora.commitment_kind)
);

CREATE INDEX work_proposals_org_work_created_idx
  ON wandora.work_proposals (organization_id, work_item_id, created_at DESC);
CREATE INDEX work_proposals_org_conversation_created_idx
  ON wandora.work_proposals (organization_id, conversation_id, created_at DESC);

ALTER TABLE wandora.work_proposals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON wandora.work_proposals FROM PUBLIC, authenticated;
GRANT SELECT, INSERT ON wandora.work_proposals TO wandora_core_runtime;

CREATE POLICY work_proposals_core_runtime_read
  ON wandora.work_proposals
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());

CREATE POLICY work_proposals_core_runtime_insert
  ON wandora.work_proposals
  FOR INSERT TO wandora_core_runtime
  WITH CHECK (organization_id = wandora.current_core_organization_id());

COMMENT ON TABLE wandora.work_proposals IS
  'Canonical Wandora employee proposals awaiting human supervision; provider/runtime identifiers remain private.';
COMMENT ON COLUMN wandora.work_proposals.source_event_id IS
  'Wandora normalized inbound-event correlation; not a raw provider message identifier.';
COMMENT ON COLUMN wandora.work_proposals.commitment IS
  'V1 canonical supervised proposals are safe commitment=none only; stronger commitments remain in wandora.approvals.';

COMMIT;
