BEGIN;

CREATE TABLE IF NOT EXISTS wandora.organization_grounding_entries (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('fact', 'rule')),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 4000),
  provenance_type text NOT NULL
    CHECK (provenance_type IN ('owner_statement', 'approved_source', 'approved_correction')),
  source_ref text CHECK (
    source_ref IS NULL OR length(trim(source_ref)) BETWEEN 1 AND 1024
  ),
  source_label text CHECK (
    source_label IS NULL OR length(trim(source_label)) BETWEEN 1 AND 255
  ),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired')),
  created_by_user_id uuid NOT NULL REFERENCES wandora.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  CHECK (provenance_type = 'owner_statement' OR source_ref IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS organization_grounding_entries_org_status_type_idx
  ON wandora.organization_grounding_entries
  (organization_id, status, entry_type, created_at, id);

DROP TRIGGER IF EXISTS organization_grounding_entries_set_updated_at
  ON wandora.organization_grounding_entries;
CREATE TRIGGER organization_grounding_entries_set_updated_at
  BEFORE UPDATE ON wandora.organization_grounding_entries
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

ALTER TABLE wandora.organization_grounding_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON wandora.organization_grounding_entries
  FROM PUBLIC, anon, authenticated, service_role, wandora_core_runtime;

GRANT SELECT ON wandora.organization_grounding_entries
  TO wandora_core_runtime;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'wandora'
       AND tablename = 'organization_grounding_entries'
       AND policyname = 'organization_grounding_entries_core_runtime_read'
  ) THEN
    CREATE POLICY organization_grounding_entries_core_runtime_read
      ON wandora.organization_grounding_entries
      FOR SELECT TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id());
  END IF;
END
$$;

COMMENT ON TABLE wandora.organization_grounding_entries IS
  'Minimum Wandora-owned durable semantic grounding: official company facts and house rules with provenance. This is not a retrieval, memory, prompt, vector, skill, policy-engine or provider-runtime store.';
COMMENT ON COLUMN wandora.organization_grounding_entries.entry_type IS
  'fact = official company truth; rule = official owner/product instruction. Runtime inference and unknown information are never entries.';
COMMENT ON COLUMN wandora.organization_grounding_entries.provenance_type IS
  'How the entry became authoritative: direct owner statement, approved source, or explicitly approved correction.';
COMMENT ON COLUMN wandora.organization_grounding_entries.source_ref IS
  'Provider-neutral opaque reference to approved source/correction evidence. It is not a provider object ID and does not authorize runtime retrieval.';
COMMENT ON COLUMN wandora.organization_grounding_entries.status IS
  'Product semantic lifecycle only: active entries may ground work; retired entries remain historical product state until a later retention policy says otherwise.';

COMMIT;