BEGIN;

ALTER TABLE wandora_private.digital_employee_hire_operations
  ADD COLUMN IF NOT EXISTS catalog_key text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_hire_operations
     WHERE catalog_key IS NULL
  ) THEN
    RAISE EXCEPTION 'organization_adapter_catalog_key_backfill_required';
  END IF;
END
$$;

ALTER TABLE wandora_private.digital_employee_hire_operations
  ALTER COLUMN catalog_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'wandora_private.digital_employee_hire_operations'::regclass
       AND conname = 'digital_employee_hire_operations_catalog_key_check'
  ) THEN
    ALTER TABLE wandora_private.digital_employee_hire_operations
      ADD CONSTRAINT digital_employee_hire_operations_catalog_key_check
      CHECK (catalog_key ~ '^[a-z0-9][a-z0-9._-]{2,63}$');
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS digital_employee_hire_operations_org_provider_catalog_uidx
  ON wandora_private.digital_employee_hire_operations (organization_id, provider, catalog_key);

GRANT SELECT ON
  wandora_private.control_plane_provider_bindings,
  wandora_private.digital_employee_provider_bindings,
  wandora_private.digital_employee_hire_operations
TO wandora_core_runtime;

GRANT INSERT (organization_id, employee_id, provider, provider_agent_ref)
  ON wandora_private.digital_employee_provider_bindings
  TO wandora_core_runtime;

GRANT INSERT (
  organization_id, idempotency_key, request_hash, employee_id,
  provider, catalog_key, status
) ON wandora_private.digital_employee_hire_operations TO wandora_core_runtime;

GRANT UPDATE (status, provider_agent_ref, completed_at)
  ON wandora_private.digital_employee_hire_operations
  TO wandora_core_runtime;

GRANT INSERT (id, organization_id, display_name, role, status, autonomy_mode)
  ON wandora.digital_employees
  TO wandora_core_runtime;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora'
       AND tablename = 'digital_employees'
       AND policyname = 'digital_employees_core_runtime_insert'
  ) THEN
    CREATE POLICY digital_employees_core_runtime_insert
      ON wandora.digital_employees
      FOR INSERT TO wandora_core_runtime
      WITH CHECK (organization_id = wandora.current_core_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'control_plane_provider_bindings'
       AND policyname = 'control_plane_provider_bindings_core_runtime_read'
  ) THEN
    CREATE POLICY control_plane_provider_bindings_core_runtime_read
      ON wandora_private.control_plane_provider_bindings
      FOR SELECT TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_provider_bindings'
       AND policyname = 'digital_employee_provider_bindings_core_runtime_read'
  ) THEN
    CREATE POLICY digital_employee_provider_bindings_core_runtime_read
      ON wandora_private.digital_employee_provider_bindings
      FOR SELECT TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_provider_bindings'
       AND policyname = 'digital_employee_provider_bindings_core_runtime_insert'
  ) THEN
    CREATE POLICY digital_employee_provider_bindings_core_runtime_insert
      ON wandora_private.digital_employee_provider_bindings
      FOR INSERT TO wandora_core_runtime
      WITH CHECK (organization_id = wandora.current_core_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_hire_operations'
       AND policyname = 'digital_employee_hire_operations_core_runtime_read'
  ) THEN
    CREATE POLICY digital_employee_hire_operations_core_runtime_read
      ON wandora_private.digital_employee_hire_operations
      FOR SELECT TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_hire_operations'
       AND policyname = 'digital_employee_hire_operations_core_runtime_insert'
  ) THEN
    CREATE POLICY digital_employee_hire_operations_core_runtime_insert
      ON wandora_private.digital_employee_hire_operations
      FOR INSERT TO wandora_core_runtime
      WITH CHECK (organization_id = wandora.current_core_organization_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'wandora_private'
       AND tablename = 'digital_employee_hire_operations'
       AND policyname = 'digital_employee_hire_operations_core_runtime_update'
  ) THEN
    CREATE POLICY digital_employee_hire_operations_core_runtime_update
      ON wandora_private.digital_employee_hire_operations
      FOR UPDATE TO wandora_core_runtime
      USING (organization_id = wandora.current_core_organization_id())
      WITH CHECK (organization_id = wandora.current_core_organization_id());
  END IF;
END
$$;

COMMENT ON COLUMN wandora_private.digital_employee_hire_operations.catalog_key IS
  'Stable Wandora-owned catalog employee key. One managed catalog resource is reserved per organization/provider/key.';

COMMIT;
