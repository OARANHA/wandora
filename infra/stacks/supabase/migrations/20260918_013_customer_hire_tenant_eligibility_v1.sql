BEGIN;

CREATE TABLE IF NOT EXISTS wandora_private.digital_employee_catalog_hire_eligibility (
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  catalog_key text NOT NULL CHECK (catalog_key ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, catalog_key)
);

DROP TRIGGER IF EXISTS digital_employee_catalog_hire_eligibility_set_updated_at
  ON wandora_private.digital_employee_catalog_hire_eligibility;
CREATE TRIGGER digital_employee_catalog_hire_eligibility_set_updated_at
  BEFORE UPDATE ON wandora_private.digital_employee_catalog_hire_eligibility
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

ALTER TABLE wandora_private.digital_employee_catalog_hire_eligibility ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON wandora_private.digital_employee_catalog_hire_eligibility
  FROM PUBLIC, anon, authenticated, wandora_core_runtime, wandora_platform_provisioner;

GRANT SELECT ON wandora_private.digital_employee_catalog_hire_eligibility
  TO wandora_core_runtime;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_catalog_hire_eligibility'
       AND policyname = 'digital_employee_catalog_hire_eligibility_core_runtime_read'
  ) THEN
    CREATE POLICY digital_employee_catalog_hire_eligibility_core_runtime_read
      ON wandora_private.digital_employee_catalog_hire_eligibility
      FOR SELECT TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id());
  END IF;
END
$$;

COMMENT ON TABLE wandora_private.digital_employee_catalog_hire_eligibility IS
  'Private Wandora-owned product policy controlling whether a tenant may start a new catalog digital-employee hire. Provider-neutral and operator-owned.';
COMMENT ON COLUMN wandora_private.digital_employee_catalog_hire_eligibility.catalog_key IS
  'Stable Wandora-owned catalog key; no provider identifier or provider configuration belongs here.';
COMMENT ON COLUMN wandora_private.digital_employee_catalog_hire_eligibility.enabled IS
  'When true, a new catalog hire may be started subject to runtime gate, authorization and all remaining safety checks. Existing reserved operations remain independently replayable.';

COMMIT;
