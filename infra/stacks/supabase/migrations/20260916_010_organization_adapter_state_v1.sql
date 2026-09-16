BEGIN;

CREATE TABLE IF NOT EXISTS wandora_private.control_plane_provider_bindings (
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_-]{2,32}$'),
  provider_company_ref text NOT NULL CHECK (length(trim(provider_company_ref)) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, provider),
  UNIQUE (provider, provider_company_ref)
);

CREATE TABLE IF NOT EXISTS wandora_private.digital_employee_provider_bindings (
  organization_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_-]{2,32}$'),
  provider_agent_ref text NOT NULL CHECK (length(trim(provider_agent_ref)) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, employee_id, provider),
  UNIQUE (provider, provider_agent_ref),
  FOREIGN KEY (organization_id, employee_id)
    REFERENCES wandora.digital_employees(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, provider)
    REFERENCES wandora_private.control_plane_provider_bindings(organization_id, provider) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wandora_private.digital_employee_hire_operations (
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) BETWEEN 1 AND 255),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  employee_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_-]{2,32}$'),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'creating', 'completed', 'uncertain')),
  provider_agent_ref text CHECK (
    provider_agent_ref IS NULL OR length(trim(provider_agent_ref)) BETWEEN 1 AND 255
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (organization_id, idempotency_key),
  UNIQUE (organization_id, employee_id, provider),
  FOREIGN KEY (organization_id, provider)
    REFERENCES wandora_private.control_plane_provider_bindings(organization_id, provider) ON DELETE RESTRICT,
  CHECK (
    (status = 'completed' AND provider_agent_ref IS NOT NULL AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS digital_employee_hire_operations_org_status_idx
  ON wandora_private.digital_employee_hire_operations (organization_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS control_plane_provider_bindings_set_updated_at
  ON wandora_private.control_plane_provider_bindings;
CREATE TRIGGER control_plane_provider_bindings_set_updated_at
  BEFORE UPDATE ON wandora_private.control_plane_provider_bindings
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

DROP TRIGGER IF EXISTS digital_employee_provider_bindings_set_updated_at
  ON wandora_private.digital_employee_provider_bindings;
CREATE TRIGGER digital_employee_provider_bindings_set_updated_at
  BEFORE UPDATE ON wandora_private.digital_employee_provider_bindings
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

DROP TRIGGER IF EXISTS digital_employee_hire_operations_set_updated_at
  ON wandora_private.digital_employee_hire_operations;
CREATE TRIGGER digital_employee_hire_operations_set_updated_at
  BEFORE UPDATE ON wandora_private.digital_employee_hire_operations
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

ALTER TABLE wandora_private.control_plane_provider_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora_private.digital_employee_provider_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora_private.digital_employee_hire_operations ENABLE ROW LEVEL SECURITY;

-- This migration is deliberately inert. Application access is activated only
-- together with the separately reviewed Organization Adapter runtime/API.
REVOKE ALL ON wandora_private.control_plane_provider_bindings
  FROM PUBLIC, authenticated, wandora_core_runtime;
REVOKE ALL ON wandora_private.digital_employee_provider_bindings
  FROM PUBLIC, authenticated, wandora_core_runtime;
REVOKE ALL ON wandora_private.digital_employee_hire_operations
  FROM PUBLIC, authenticated, wandora_core_runtime;

COMMENT ON TABLE wandora_private.control_plane_provider_bindings IS
  'Private organization-to-control-plane provider mapping. Provider IDs never become customer contracts.';
COMMENT ON TABLE wandora_private.digital_employee_provider_bindings IS
  'Private canonical Wandora employee-to-provider agent mapping; no provider credential material.';
COMMENT ON TABLE wandora_private.digital_employee_hire_operations IS
  'Private idempotency/reconciliation journal for external employee-hire effects; not an agent lifecycle state machine.';
COMMENT ON COLUMN wandora_private.digital_employee_hire_operations.request_hash IS
  'Lowercase SHA-256 of the canonical Wandora hire request used to detect idempotency-key conflicts.';

COMMIT;
