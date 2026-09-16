BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'wandora_platform_provisioner'
  ) THEN
    CREATE ROLE wandora_platform_provisioner
      LOGIN
      CONNECTION LIMIT 0
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
      WHERE rolname = 'wandora_platform_provisioner'
        AND (
          rolsuper
          OR rolcreatedb
          OR rolcreaterole
          OR rolinherit
          OR rolreplication
          OR rolbypassrls
        )
    ) THEN
      RAISE EXCEPTION 'wandora_platform_provisioner_role_drift';
    END IF;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA wandora_private TO wandora_platform_provisioner;
GRANT EXECUTE ON FUNCTION wandora_private.provision_beta_organization_v1(
  text, text, text, text, text, text
) TO wandora_platform_provisioner;

REVOKE ALL ON wandora_private.tenant_provisioning_requests FROM wandora_platform_provisioner;

COMMENT ON ROLE wandora_platform_provisioner IS
  'Disabled-by-default least-privilege Wandora Platform provisioning login; no password and connection limit 0 until separately activated.';

COMMIT;
