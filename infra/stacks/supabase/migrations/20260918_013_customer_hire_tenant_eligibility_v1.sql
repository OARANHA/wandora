BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'wandora_customer_hire_operator'
  ) THEN
    CREATE ROLE wandora_customer_hire_operator
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOREPLICATION
      NOBYPASSRLS;
  ELSE
    IF EXISTS (
      SELECT 1
        FROM pg_roles
       WHERE rolname = 'wandora_customer_hire_operator'
         AND (
           rolcanlogin
           OR rolsuper
           OR rolcreatedb
           OR rolcreaterole
           OR rolinherit
           OR rolreplication
           OR rolbypassrls
         )
    ) THEN
      RAISE EXCEPTION 'wandora_customer_hire_operator_role_drift';
    END IF;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA wandora_private TO wandora_customer_hire_operator;

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
  FROM PUBLIC, anon, authenticated, service_role, supabase_functions_admin,
       wandora_core_runtime, wandora_platform_provisioner, wandora_customer_hire_operator;

GRANT SELECT ON wandora_private.digital_employee_catalog_hire_eligibility
  TO wandora_core_runtime;

CREATE OR REPLACE FUNCTION wandora_private.set_digital_employee_catalog_hire_eligibility(
  p_organization_id uuid,
  p_catalog_key text,
  p_enabled boolean
)
RETURNS TABLE (
  organization_id uuid,
  catalog_key text,
  enabled boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, wandora, wandora_private, pg_temp
AS $$
DECLARE
  v_catalog_key text := lower(trim(p_catalog_key));
BEGIN
  IF v_catalog_key IS NULL OR v_catalog_key !~ '^[a-z0-9][a-z0-9._-]{2,63}$' THEN
    RAISE EXCEPTION 'customer_hire_eligibility_invalid_catalog_key' USING ERRCODE = 'P0001';
  END IF;

  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'customer_hire_eligibility_enabled_required' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.organizations
     WHERE id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'customer_hire_eligibility_organization_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF p_enabled AND NOT EXISTS (
    SELECT 1
      FROM wandora.organizations
     WHERE id = p_organization_id
       AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'customer_hire_eligibility_organization_not_active' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO wandora_private.digital_employee_catalog_hire_eligibility (
    organization_id,
    catalog_key,
    enabled
  )
  VALUES (
    p_organization_id,
    v_catalog_key,
    p_enabled
  )
  ON CONFLICT (organization_id, catalog_key)
  DO UPDATE SET enabled = EXCLUDED.enabled;

  RETURN QUERY
  SELECT e.organization_id, e.catalog_key, e.enabled, e.updated_at
    FROM wandora_private.digital_employee_catalog_hire_eligibility e
   WHERE e.organization_id = p_organization_id
     AND e.catalog_key = v_catalog_key;
END;
$$;

REVOKE ALL ON FUNCTION wandora_private.set_digital_employee_catalog_hire_eligibility(
  uuid, text, boolean
) FROM PUBLIC, anon, authenticated, service_role, supabase_functions_admin,
       wandora_core_runtime, wandora_platform_provisioner, wandora_customer_hire_operator;

GRANT EXECUTE ON FUNCTION wandora_private.set_digital_employee_catalog_hire_eligibility(
  uuid, text, boolean
) TO wandora_customer_hire_operator;

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

COMMENT ON ROLE wandora_customer_hire_operator IS
  'NOLOGIN least-privilege Wandora operator capability for customer catalog-hire eligibility; no direct table DML and no tenant-provisioning authority.';
COMMENT ON TABLE wandora_private.digital_employee_catalog_hire_eligibility IS
  'Private Wandora-owned product policy controlling whether a tenant may start a new catalog digital-employee hire. Provider-neutral and operator-owned.';
COMMENT ON FUNCTION wandora_private.set_digital_employee_catalog_hire_eligibility(uuid, text, boolean) IS
  'Operator-only provider-neutral enable/disable boundary for one organization and Wandora catalog key; Core receives read authority only.';
COMMENT ON COLUMN wandora_private.digital_employee_catalog_hire_eligibility.catalog_key IS
  'Stable Wandora-owned catalog key; no provider identifier or provider configuration belongs here.';
COMMENT ON COLUMN wandora_private.digital_employee_catalog_hire_eligibility.enabled IS
  'When true, a new catalog hire may be started subject to runtime gate, authorization and all remaining safety checks. Existing reserved operations remain independently replayable.';

COMMIT;
