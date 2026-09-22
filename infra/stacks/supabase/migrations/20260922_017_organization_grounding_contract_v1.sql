BEGIN;

ALTER TYPE wandora.audit_action ADD VALUE IF NOT EXISTS 'grounding-created';
ALTER TYPE wandora.audit_action ADD VALUE IF NOT EXISTS 'grounding-retired';
ALTER TYPE wandora.audit_action ADD VALUE IF NOT EXISTS 'grounding-corrected';

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
  supersedes_entry_id uuid,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired')),
  created_by_user_id uuid NOT NULL REFERENCES wandora.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, supersedes_entry_id)
    REFERENCES wandora.organization_grounding_entries(organization_id, id)
    ON DELETE RESTRICT,
  CHECK (provenance_type = 'owner_statement' OR source_ref IS NOT NULL),
  CHECK (
    (provenance_type = 'approved_correction' AND supersedes_entry_id IS NOT NULL)
    OR (provenance_type <> 'approved_correction' AND supersedes_entry_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS organization_grounding_entries_org_status_type_idx
  ON wandora.organization_grounding_entries
  (organization_id, status, entry_type, created_at, id);

CREATE INDEX IF NOT EXISTS organization_grounding_entries_supersedes_idx
  ON wandora.organization_grounding_entries
  (organization_id, supersedes_entry_id)
  WHERE supersedes_entry_id IS NOT NULL;

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

CREATE OR REPLACE FUNCTION wandora.create_organization_grounding_entry(
  p_organization_id uuid,
  p_entry_id uuid,
  p_actor_user_id uuid,
  p_entry_type text,
  p_content text,
  p_provenance_type text,
  p_source_ref text,
  p_source_label text,
  p_correlation_id text,
  p_occurred_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, wandora, pg_temp
AS $$
DECLARE
  existing wandora.organization_grounding_entries%ROWTYPE;
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'grounding_tenant_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.memberships m
      JOIN wandora.organizations o ON o.id = m.organization_id
     WHERE m.organization_id = p_organization_id
       AND m.user_id = p_actor_user_id
       AND m.status = 'active'
       AND m.role IN ('owner', 'admin')
       AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'grounding_mutation_forbidden';
  END IF;

  IF p_entry_type NOT IN ('fact', 'rule')
     OR p_provenance_type NOT IN ('owner_statement', 'approved_source')
  THEN
    RAISE EXCEPTION 'grounding_invalid_create_contract';
  END IF;

  INSERT INTO wandora.organization_grounding_entries (
    id, organization_id, entry_type, content, provenance_type,
    source_ref, source_label, created_by_user_id
  ) VALUES (
    p_entry_id,
    p_organization_id,
    p_entry_type,
    btrim(p_content),
    p_provenance_type,
    nullif(btrim(p_source_ref), ''),
    nullif(btrim(p_source_label), ''),
    p_actor_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO existing
    FROM wandora.organization_grounding_entries
   WHERE id = p_entry_id;

  IF NOT FOUND
     OR existing.organization_id IS DISTINCT FROM p_organization_id
     OR existing.entry_type IS DISTINCT FROM p_entry_type
     OR existing.content IS DISTINCT FROM btrim(p_content)
     OR existing.provenance_type IS DISTINCT FROM p_provenance_type
     OR existing.source_ref IS DISTINCT FROM nullif(btrim(p_source_ref), '')
     OR existing.source_label IS DISTINCT FROM nullif(btrim(p_source_label), '')
     OR existing.supersedes_entry_id IS NOT NULL
     OR existing.created_by_user_id IS DISTINCT FROM p_actor_user_id
  THEN
    RAISE EXCEPTION 'grounding_idempotency_conflict';
  END IF;

  PERFORM wandora.append_core_audit(
    p_organization_id,
    'human'::wandora.audit_actor_type,
    p_actor_user_id::text,
    'grounding-created'::wandora.audit_action,
    'organization-grounding',
    p_entry_id::text,
    p_correlation_id,
    p_occurred_at
  );

  RETURN p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION wandora.retire_organization_grounding_entry(
  p_organization_id uuid,
  p_entry_id uuid,
  p_actor_user_id uuid,
  p_correlation_id text,
  p_occurred_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, wandora, pg_temp
AS $$
DECLARE
  current_status text;
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'grounding_tenant_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.memberships m
      JOIN wandora.organizations o ON o.id = m.organization_id
     WHERE m.organization_id = p_organization_id
       AND m.user_id = p_actor_user_id
       AND m.status = 'active'
       AND m.role IN ('owner', 'admin')
       AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'grounding_mutation_forbidden';
  END IF;

  SELECT status INTO current_status
    FROM wandora.organization_grounding_entries
   WHERE organization_id = p_organization_id
     AND id = p_entry_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'grounding_not_found';
  END IF;

  IF current_status = 'retired' THEN
    IF EXISTS (
      SELECT 1
        FROM wandora.audit_records ar
       WHERE ar.organization_id = p_organization_id
         AND ar.action = 'grounding-retired'::wandora.audit_action
         AND ar.subject_type = 'organization-grounding'
         AND ar.subject_id = p_entry_id::text
         AND ar.correlation_id = p_correlation_id
    ) THEN
      RETURN p_entry_id;
    END IF;
    RAISE EXCEPTION 'grounding_not_active';
  END IF;

  UPDATE wandora.organization_grounding_entries
     SET status = 'retired'
   WHERE organization_id = p_organization_id
     AND id = p_entry_id;

  PERFORM wandora.append_core_audit(
    p_organization_id,
    'human'::wandora.audit_actor_type,
    p_actor_user_id::text,
    'grounding-retired'::wandora.audit_action,
    'organization-grounding',
    p_entry_id::text,
    p_correlation_id,
    p_occurred_at
  );

  RETURN p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION wandora.correct_organization_grounding_entry(
  p_organization_id uuid,
  p_entry_id uuid,
  p_replacement_entry_id uuid,
  p_actor_user_id uuid,
  p_content text,
  p_source_ref text,
  p_source_label text,
  p_correlation_id text,
  p_occurred_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, wandora, pg_temp
AS $$
DECLARE
  original wandora.organization_grounding_entries%ROWTYPE;
  replacement wandora.organization_grounding_entries%ROWTYPE;
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'grounding_tenant_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.memberships m
      JOIN wandora.organizations o ON o.id = m.organization_id
     WHERE m.organization_id = p_organization_id
       AND m.user_id = p_actor_user_id
       AND m.status = 'active'
       AND m.role IN ('owner', 'admin')
       AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'grounding_mutation_forbidden';
  END IF;

  IF nullif(btrim(p_source_ref), '') IS NULL THEN
    RAISE EXCEPTION 'grounding_correction_source_required';
  END IF;

  SELECT * INTO original
    FROM wandora.organization_grounding_entries
   WHERE organization_id = p_organization_id
     AND id = p_entry_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'grounding_not_found';
  END IF;

  SELECT * INTO replacement
    FROM wandora.organization_grounding_entries
   WHERE id = p_replacement_entry_id;

  IF FOUND THEN
    IF replacement.organization_id IS DISTINCT FROM p_organization_id
       OR replacement.entry_type IS DISTINCT FROM original.entry_type
       OR replacement.content IS DISTINCT FROM btrim(p_content)
       OR replacement.provenance_type IS DISTINCT FROM 'approved_correction'
       OR replacement.source_ref IS DISTINCT FROM nullif(btrim(p_source_ref), '')
       OR replacement.source_label IS DISTINCT FROM nullif(btrim(p_source_label), '')
       OR replacement.supersedes_entry_id IS DISTINCT FROM p_entry_id
       OR replacement.created_by_user_id IS DISTINCT FROM p_actor_user_id
    THEN
      RAISE EXCEPTION 'grounding_idempotency_conflict';
    END IF;
  ELSE
    IF original.status <> 'active' THEN
      RAISE EXCEPTION 'grounding_not_active';
    END IF;

    INSERT INTO wandora.organization_grounding_entries (
      id, organization_id, entry_type, content, provenance_type,
      source_ref, source_label, supersedes_entry_id, created_by_user_id
    ) VALUES (
      p_replacement_entry_id,
      p_organization_id,
      original.entry_type,
      btrim(p_content),
      'approved_correction',
      nullif(btrim(p_source_ref), ''),
      nullif(btrim(p_source_label), ''),
      p_entry_id,
      p_actor_user_id
    );

    UPDATE wandora.organization_grounding_entries
       SET status = 'retired'
     WHERE organization_id = p_organization_id
       AND id = p_entry_id;
  END IF;

  PERFORM wandora.append_core_audit(
    p_organization_id,
    'human'::wandora.audit_actor_type,
    p_actor_user_id::text,
    'grounding-corrected'::wandora.audit_action,
    'organization-grounding',
    p_replacement_entry_id::text,
    p_correlation_id,
    p_occurred_at
  );

  RETURN p_replacement_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION wandora.create_organization_grounding_entry(
  uuid, uuid, uuid, text, text, text, text, text, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION wandora.retire_organization_grounding_entry(
  uuid, uuid, uuid, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION wandora.correct_organization_grounding_entry(
  uuid, uuid, uuid, uuid, text, text, text, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION wandora.create_organization_grounding_entry(
  uuid, uuid, uuid, text, text, text, text, text, text, timestamptz
) TO wandora_core_runtime;
GRANT EXECUTE ON FUNCTION wandora.retire_organization_grounding_entry(
  uuid, uuid, uuid, text, timestamptz
) TO wandora_core_runtime;
GRANT EXECUTE ON FUNCTION wandora.correct_organization_grounding_entry(
  uuid, uuid, uuid, uuid, text, text, text, text, timestamptz
) TO wandora_core_runtime;

COMMENT ON TABLE wandora.organization_grounding_entries IS
  'Minimum Wandora-owned durable semantic grounding: official company facts and house rules with provenance. This is not a retrieval, memory, prompt, vector, skill, policy-engine or provider-runtime store.';
COMMENT ON COLUMN wandora.organization_grounding_entries.entry_type IS
  'fact = official company truth; rule = official owner/product instruction. Runtime inference and unknown information are never entries.';
COMMENT ON COLUMN wandora.organization_grounding_entries.provenance_type IS
  'How the entry became authoritative: direct owner statement, approved source, or explicitly approved correction.';
COMMENT ON COLUMN wandora.organization_grounding_entries.source_ref IS
  'Provider-neutral opaque reference to approved source/correction evidence. It is not a provider object ID and does not authorize runtime retrieval.';
COMMENT ON COLUMN wandora.organization_grounding_entries.supersedes_entry_id IS
  'Wandora grounding entry replaced by this approved correction. Corrections create history; they never rewrite prior content.';
COMMENT ON COLUMN wandora.organization_grounding_entries.status IS
  'Product semantic lifecycle only: active entries may ground work; retired entries remain historical product state until a later retention policy says otherwise.';

COMMIT;