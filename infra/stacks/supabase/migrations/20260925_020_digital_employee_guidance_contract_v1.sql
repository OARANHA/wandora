BEGIN;

ALTER TYPE wandora.audit_action ADD VALUE IF NOT EXISTS 'employee-guidance-created';
ALTER TYPE wandora.audit_action ADD VALUE IF NOT EXISTS 'employee-guidance-retired';
ALTER TYPE wandora.audit_action ADD VALUE IF NOT EXISTS 'employee-guidance-corrected';

CREATE TABLE IF NOT EXISTS wandora.digital_employee_guidance_entries (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  entry_type text NOT NULL
    CHECK (entry_type IN ('responsibility', 'behavior', 'practice')),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 4000),
  provenance_type text NOT NULL
    CHECK (provenance_type IN ('owner_statement', 'approved_evidence', 'approved_correction')),
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
  UNIQUE (organization_id, employee_id, id),
  FOREIGN KEY (organization_id, employee_id)
    REFERENCES wandora.digital_employees(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, employee_id, supersedes_entry_id)
    REFERENCES wandora.digital_employee_guidance_entries(organization_id, employee_id, id)
    ON DELETE RESTRICT,
  CHECK (provenance_type = 'owner_statement' OR source_ref IS NOT NULL),
  CHECK (
    (provenance_type = 'approved_correction' AND supersedes_entry_id IS NOT NULL)
    OR (provenance_type <> 'approved_correction' AND supersedes_entry_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS digital_employee_guidance_entries_org_employee_status_type_idx
  ON wandora.digital_employee_guidance_entries
  (organization_id, employee_id, status, entry_type, created_at, id);

CREATE INDEX IF NOT EXISTS digital_employee_guidance_entries_supersedes_idx
  ON wandora.digital_employee_guidance_entries
  (organization_id, employee_id, supersedes_entry_id)
  WHERE supersedes_entry_id IS NOT NULL;

DROP TRIGGER IF EXISTS digital_employee_guidance_entries_set_updated_at
  ON wandora.digital_employee_guidance_entries;
CREATE TRIGGER digital_employee_guidance_entries_set_updated_at
  BEFORE UPDATE ON wandora.digital_employee_guidance_entries
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

ALTER TABLE wandora.digital_employee_guidance_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON wandora.digital_employee_guidance_entries
  FROM PUBLIC, anon, authenticated, service_role, wandora_core_runtime;

GRANT SELECT ON wandora.digital_employee_guidance_entries
  TO wandora_core_runtime;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'wandora'
       AND tablename = 'digital_employee_guidance_entries'
       AND policyname = 'digital_employee_guidance_entries_core_runtime_read'
  ) THEN
    CREATE POLICY digital_employee_guidance_entries_core_runtime_read
      ON wandora.digital_employee_guidance_entries
      FOR SELECT TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id());
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION wandora.create_digital_employee_guidance_entry(
  p_organization_id uuid,
  p_employee_id uuid,
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
  existing wandora.digital_employee_guidance_entries%ROWTYPE;
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'employee_guidance_tenant_mismatch';
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
    RAISE EXCEPTION 'employee_guidance_mutation_forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.digital_employees de
     WHERE de.organization_id = p_organization_id
       AND de.id = p_employee_id
  ) THEN
    RAISE EXCEPTION 'employee_guidance_employee_not_found';
  END IF;

  IF p_entry_type NOT IN ('responsibility', 'behavior', 'practice')
     OR p_provenance_type NOT IN ('owner_statement', 'approved_evidence')
  THEN
    RAISE EXCEPTION 'employee_guidance_invalid_create_contract';
  END IF;

  INSERT INTO wandora.digital_employee_guidance_entries (
    id,
    organization_id,
    employee_id,
    entry_type,
    content,
    provenance_type,
    source_ref,
    source_label,
    created_by_user_id
  ) VALUES (
    p_entry_id,
    p_organization_id,
    p_employee_id,
    p_entry_type,
    btrim(p_content),
    p_provenance_type,
    nullif(btrim(p_source_ref), ''),
    nullif(btrim(p_source_label), ''),
    p_actor_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO existing
    FROM wandora.digital_employee_guidance_entries
   WHERE id = p_entry_id;

  IF NOT FOUND
     OR existing.organization_id IS DISTINCT FROM p_organization_id
     OR existing.employee_id IS DISTINCT FROM p_employee_id
     OR existing.entry_type IS DISTINCT FROM p_entry_type
     OR existing.content IS DISTINCT FROM btrim(p_content)
     OR existing.provenance_type IS DISTINCT FROM p_provenance_type
     OR existing.source_ref IS DISTINCT FROM nullif(btrim(p_source_ref), '')
     OR existing.source_label IS DISTINCT FROM nullif(btrim(p_source_label), '')
     OR existing.supersedes_entry_id IS NOT NULL
     OR existing.created_by_user_id IS DISTINCT FROM p_actor_user_id
  THEN
    RAISE EXCEPTION 'employee_guidance_idempotency_conflict';
  END IF;

  PERFORM wandora.append_core_audit(
    p_organization_id,
    'human'::wandora.audit_actor_type,
    p_actor_user_id::text,
    'employee-guidance-created'::wandora.audit_action,
    'digital-employee-guidance',
    p_entry_id::text,
    p_correlation_id,
    p_occurred_at
  );

  RETURN p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION wandora.retire_digital_employee_guidance_entry(
  p_organization_id uuid,
  p_employee_id uuid,
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
    RAISE EXCEPTION 'employee_guidance_tenant_mismatch';
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
    RAISE EXCEPTION 'employee_guidance_mutation_forbidden';
  END IF;

  SELECT status INTO current_status
    FROM wandora.digital_employee_guidance_entries
   WHERE organization_id = p_organization_id
     AND employee_id = p_employee_id
     AND id = p_entry_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee_guidance_not_found';
  END IF;

  IF current_status = 'retired' THEN
    IF EXISTS (
      SELECT 1
        FROM wandora.audit_records ar
       WHERE ar.organization_id = p_organization_id
         AND ar.action = 'employee-guidance-retired'::wandora.audit_action
         AND ar.subject_type = 'digital-employee-guidance'
         AND ar.subject_id = p_entry_id::text
         AND ar.correlation_id = p_correlation_id
    ) THEN
      RETURN p_entry_id;
    END IF;
    RAISE EXCEPTION 'employee_guidance_not_active';
  END IF;

  UPDATE wandora.digital_employee_guidance_entries
     SET status = 'retired'
   WHERE organization_id = p_organization_id
     AND employee_id = p_employee_id
     AND id = p_entry_id;

  PERFORM wandora.append_core_audit(
    p_organization_id,
    'human'::wandora.audit_actor_type,
    p_actor_user_id::text,
    'employee-guidance-retired'::wandora.audit_action,
    'digital-employee-guidance',
    p_entry_id::text,
    p_correlation_id,
    p_occurred_at
  );

  RETURN p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION wandora.correct_digital_employee_guidance_entry(
  p_organization_id uuid,
  p_employee_id uuid,
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
  original wandora.digital_employee_guidance_entries%ROWTYPE;
  replacement wandora.digital_employee_guidance_entries%ROWTYPE;
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'employee_guidance_tenant_mismatch';
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
    RAISE EXCEPTION 'employee_guidance_mutation_forbidden';
  END IF;

  IF nullif(btrim(p_source_ref), '') IS NULL THEN
    RAISE EXCEPTION 'employee_guidance_correction_source_required';
  END IF;

  SELECT * INTO original
    FROM wandora.digital_employee_guidance_entries
   WHERE organization_id = p_organization_id
     AND employee_id = p_employee_id
     AND id = p_entry_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee_guidance_not_found';
  END IF;

  SELECT * INTO replacement
    FROM wandora.digital_employee_guidance_entries
   WHERE id = p_replacement_entry_id;

  IF FOUND THEN
    IF replacement.organization_id IS DISTINCT FROM p_organization_id
       OR replacement.employee_id IS DISTINCT FROM p_employee_id
       OR replacement.entry_type IS DISTINCT FROM original.entry_type
       OR replacement.content IS DISTINCT FROM btrim(p_content)
       OR replacement.provenance_type IS DISTINCT FROM 'approved_correction'
       OR replacement.source_ref IS DISTINCT FROM nullif(btrim(p_source_ref), '')
       OR replacement.source_label IS DISTINCT FROM nullif(btrim(p_source_label), '')
       OR replacement.supersedes_entry_id IS DISTINCT FROM p_entry_id
       OR replacement.created_by_user_id IS DISTINCT FROM p_actor_user_id
    THEN
      RAISE EXCEPTION 'employee_guidance_idempotency_conflict';
    END IF;
  ELSE
    IF original.status <> 'active' THEN
      RAISE EXCEPTION 'employee_guidance_not_active';
    END IF;

    INSERT INTO wandora.digital_employee_guidance_entries (
      id,
      organization_id,
      employee_id,
      entry_type,
      content,
      provenance_type,
      source_ref,
      source_label,
      supersedes_entry_id,
      created_by_user_id
    ) VALUES (
      p_replacement_entry_id,
      p_organization_id,
      p_employee_id,
      original.entry_type,
      btrim(p_content),
      'approved_correction',
      nullif(btrim(p_source_ref), ''),
      nullif(btrim(p_source_label), ''),
      p_entry_id,
      p_actor_user_id
    );

    UPDATE wandora.digital_employee_guidance_entries
       SET status = 'retired'
     WHERE organization_id = p_organization_id
       AND employee_id = p_employee_id
       AND id = p_entry_id;
  END IF;

  PERFORM wandora.append_core_audit(
    p_organization_id,
    'human'::wandora.audit_actor_type,
    p_actor_user_id::text,
    'employee-guidance-corrected'::wandora.audit_action,
    'digital-employee-guidance',
    p_replacement_entry_id::text,
    p_correlation_id,
    p_occurred_at
  );

  RETURN p_replacement_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION wandora.create_digital_employee_guidance_entry(
  uuid, uuid, uuid, uuid, text, text, text, text, text, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION wandora.retire_digital_employee_guidance_entry(
  uuid, uuid, uuid, uuid, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION wandora.correct_digital_employee_guidance_entry(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION wandora.create_digital_employee_guidance_entry(
  uuid, uuid, uuid, uuid, text, text, text, text, text, text, timestamptz
) TO wandora_core_runtime;
GRANT EXECUTE ON FUNCTION wandora.retire_digital_employee_guidance_entry(
  uuid, uuid, uuid, uuid, text, timestamptz
) TO wandora_core_runtime;
GRANT EXECUTE ON FUNCTION wandora.correct_digital_employee_guidance_entry(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, timestamptz
) TO wandora_core_runtime;

COMMENT ON TABLE wandora.digital_employee_guidance_entries IS
  'Minimum Wandora-owned durable employee guidance: approved responsibilities, behaviors and reusable practices with provenance. This is not memory, RAG, a prompt store, a skill catalog, Decision Training or runtime history.';
COMMENT ON COLUMN wandora.digital_employee_guidance_entries.entry_type IS
  'responsibility = owned/prioritized business duty; behavior = approved communication/work behavior; practice = approved reusable way of performing recurring work.';
COMMENT ON COLUMN wandora.digital_employee_guidance_entries.provenance_type IS
  'How the guidance became authoritative: direct owner statement, explicitly approved evidence, or approved correction.';
COMMENT ON COLUMN wandora.digital_employee_guidance_entries.source_ref IS
  'Provider-neutral opaque evidence reference. It never grants tool/effect authority and must not be a public provider object identifier.';
COMMENT ON COLUMN wandora.digital_employee_guidance_entries.status IS
  'Product semantic lifecycle only: active guidance may influence future work; retired guidance remains historical until a later retention policy says otherwise.';

COMMIT;
