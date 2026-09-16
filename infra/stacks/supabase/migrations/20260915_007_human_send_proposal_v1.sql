BEGIN;

ALTER TYPE wandora.audit_action
  ADD VALUE IF NOT EXISTS 'proposal-send-requested';

ALTER TABLE wandora_private.outbound_attempts
  ADD COLUMN proposal_id uuid,
  ADD COLUMN requested_by_user_id uuid;

ALTER TABLE wandora_private.outbound_attempts
  ADD CONSTRAINT outbound_attempts_human_linkage_consistency CHECK (
    (proposal_id IS NULL AND requested_by_user_id IS NULL)
    OR (proposal_id IS NOT NULL AND requested_by_user_id IS NOT NULL)
  );

ALTER TABLE wandora_private.outbound_attempts
  ADD CONSTRAINT outbound_attempts_proposal_fk
    FOREIGN KEY (organization_id, proposal_id)
    REFERENCES wandora.work_proposals(organization_id, id),
  ADD CONSTRAINT outbound_attempts_requested_by_membership_fk
    FOREIGN KEY (organization_id, requested_by_user_id)
    REFERENCES wandora.memberships(organization_id, user_id);

CREATE UNIQUE INDEX outbound_attempts_one_per_proposal_idx
  ON wandora_private.outbound_attempts (organization_id, proposal_id)
  WHERE proposal_id IS NOT NULL;

COMMENT ON COLUMN wandora_private.outbound_attempts.proposal_id IS
  'Canonical supervised proposal authorized for this outbound attempt; null only for legacy/non-human attempts.';
COMMENT ON COLUMN wandora_private.outbound_attempts.requested_by_user_id IS
  'Canonical human Wandora user who authorized this supervised outbound attempt; null only for legacy/non-human attempts.';

COMMIT;
