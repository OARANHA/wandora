BEGIN;

CREATE TABLE IF NOT EXISTS wandora_private.digital_employee_work_operations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES wandora.users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) BETWEEN 1 AND 255),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 4000),
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_-]{2,32}$'),
  catalog_key text NOT NULL CHECK (catalog_key ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  provider_company_ref text NOT NULL CHECK (length(trim(provider_company_ref)) BETWEEN 1 AND 255),
  provider_agent_ref text NOT NULL CHECK (length(trim(provider_agent_ref)) BETWEEN 1 AND 255),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN (
      'planned',
      'submitting',
      'submitted',
      'uncertain',
      'executing',
      'result_recorded',
      'execution_uncertain'
    )),
  provider_run_ref text CHECK (
    provider_run_ref IS NULL OR length(trim(provider_run_ref)) BETWEEN 1 AND 255
  ),
  execution_id text CHECK (
    execution_id IS NULL OR length(trim(execution_id)) BETWEEN 1 AND 255
  ),
  result_model text CHECK (
    result_model IS NULL OR length(trim(result_model)) BETWEEN 1 AND 255
  ),
  result_summary text CHECK (
    result_summary IS NULL OR length(result_summary) BETWEEN 1 AND 12000
  ),
  submitted_at timestamptz,
  result_recorded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, idempotency_key),
  FOREIGN KEY (organization_id, employee_id)
    REFERENCES wandora.digital_employees(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, provider)
    REFERENCES wandora_private.control_plane_provider_bindings(organization_id, provider)
    ON DELETE RESTRICT,
  CHECK (
    (status = 'result_recorded'
      AND provider_run_ref IS NOT NULL
      AND execution_id IS NOT NULL
      AND result_model IS NOT NULL
      AND result_summary IS NOT NULL
      AND result_recorded_at IS NOT NULL)
    OR
    (status <> 'result_recorded' AND result_recorded_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS digital_employee_work_operations_org_employee_created_idx
  ON wandora_private.digital_employee_work_operations
  (organization_id, employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS digital_employee_work_operations_org_status_updated_idx
  ON wandora_private.digital_employee_work_operations
  (organization_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS digital_employee_work_operations_set_updated_at
  ON wandora_private.digital_employee_work_operations;
CREATE TRIGGER digital_employee_work_operations_set_updated_at
  BEFORE UPDATE ON wandora_private.digital_employee_work_operations
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

ALTER TABLE wandora_private.digital_employee_work_operations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON wandora_private.digital_employee_work_operations
  FROM PUBLIC, anon, authenticated, service_role, wandora_core_runtime;

GRANT SELECT ON wandora_private.digital_employee_work_operations
  TO wandora_core_runtime;

GRANT INSERT (
  id,
  organization_id,
  employee_id,
  created_by_user_id,
  idempotency_key,
  request_hash,
  title,
  description,
  provider,
  catalog_key,
  provider_company_ref,
  provider_agent_ref,
  status
) ON wandora_private.digital_employee_work_operations
  TO wandora_core_runtime;

GRANT UPDATE (
  status,
  provider_run_ref,
  execution_id,
  result_model,
  result_summary,
  submitted_at,
  result_recorded_at
) ON wandora_private.digital_employee_work_operations
  TO wandora_core_runtime;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_work_operations'
       AND policyname = 'digital_employee_work_operations_core_runtime_read'
  ) THEN
    CREATE POLICY digital_employee_work_operations_core_runtime_read
      ON wandora_private.digital_employee_work_operations
      FOR SELECT TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_work_operations'
       AND policyname = 'digital_employee_work_operations_core_runtime_insert'
  ) THEN
    CREATE POLICY digital_employee_work_operations_core_runtime_insert
      ON wandora_private.digital_employee_work_operations
      FOR INSERT TO wandora_core_runtime
      WITH CHECK (organization_id = wandora.current_core_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_work_operations'
       AND policyname = 'digital_employee_work_operations_core_runtime_update'
  ) THEN
    CREATE POLICY digital_employee_work_operations_core_runtime_update
      ON wandora_private.digital_employee_work_operations
      FOR UPDATE TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id())
      WITH CHECK (organization_id = wandora.current_core_organization_id());
  END IF;
END
$$;

COMMENT ON TABLE wandora_private.digital_employee_work_operations IS
  'Private idempotency, dispatch receipt and supervised-result projection journal for customer work delegated to Paperclip. Paperclip remains the authoritative task/run control plane; this table is not a Wandora task engine.';
COMMENT ON COLUMN wandora_private.digital_employee_work_operations.id IS
  'Stable Wandora-owned customer work request identifier. It may cross the provider adapter as an opaque origin correlation key.';
COMMENT ON COLUMN wandora_private.digital_employee_work_operations.provider_run_ref IS
  'Private provider run correlation used only to prevent duplicate execution and reconcile the exact execution result; never a customer API identifier.';
COMMENT ON COLUMN wandora_private.digital_employee_work_operations.status IS
  'Integration-safety receipt state only. It does not model the Paperclip issue/task lifecycle.';

COMMIT;
