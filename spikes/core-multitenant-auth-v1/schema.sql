CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS wandora;
CREATE SCHEMA IF NOT EXISTS wandora_private;

CREATE TYPE wandora.organization_status AS ENUM ('active', 'suspended');
CREATE TYPE wandora.membership_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE wandora.membership_status AS ENUM ('active', 'suspended');
CREATE TYPE wandora.messaging_channel AS ENUM ('whatsapp');
CREATE TYPE wandora.messaging_connection_status AS ENUM ('active', 'disabled');

CREATE TABLE wandora.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  status wandora.organization_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wandora.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wandora.user_identities (
  user_id uuid NOT NULL REFERENCES wandora.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_-]{2,32}$'),
  provider_subject text NOT NULL CHECK (length(provider_subject) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (user_id, provider)
);

CREATE TABLE wandora.memberships (
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES wandora.users(id) ON DELETE CASCADE,
  role wandora.membership_role NOT NULL,
  status wandora.membership_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE wandora.messaging_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  channel wandora.messaging_channel NOT NULL,
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  status wandora.messaging_connection_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wandora_private.messaging_provider_bindings (
  connection_id uuid PRIMARY KEY REFERENCES wandora.messaging_connections(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_-]{2,32}$'),
  provider_connection_ref text NOT NULL CHECK (length(provider_connection_ref) BETWEEN 1 AND 255),
  credential_ref text NOT NULL CHECK (length(credential_ref) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_connection_ref)
);

CREATE INDEX memberships_user_active_idx
  ON wandora.memberships (user_id, organization_id)
  WHERE status = 'active';

CREATE INDEX messaging_connections_org_idx
  ON wandora.messaging_connections (organization_id, status);

CREATE FUNCTION wandora.current_auth_subject()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '');
$$;

CREATE FUNCTION wandora.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = wandora, pg_temp
AS $$
  SELECT ui.user_id
  FROM user_identities ui
  WHERE ui.provider = 'supabase'
    AND ui.provider_subject = wandora.current_auth_subject()
  LIMIT 1;
$$;

CREATE FUNCTION wandora.is_active_member(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = wandora, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = target_organization_id
      AND m.user_id = wandora.current_user_id()
      AND m.status = 'active'
      AND o.status = 'active'
  );
$$;

CREATE FUNCTION wandora.has_org_role(
  target_organization_id uuid,
  allowed_roles wandora.membership_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = wandora, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.organization_id = target_organization_id
      AND m.user_id = wandora.current_user_id()
      AND m.status = 'active'
      AND m.role = ANY(allowed_roles)
  );
$$;

CREATE FUNCTION wandora.can_access_messaging_connection(target_connection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = wandora, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM messaging_connections c
    WHERE c.id = target_connection_id
      AND c.status = 'active'
      AND wandora.is_active_member(c.organization_id)
  );
$$;

ALTER TABLE wandora.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora.messaging_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_member_read
  ON wandora.organizations
  FOR SELECT
  USING (wandora.is_active_member(id));

CREATE POLICY memberships_member_read
  ON wandora.memberships
  FOR SELECT
  USING (wandora.is_active_member(organization_id));

CREATE POLICY messaging_connections_member_read
  ON wandora.messaging_connections
  FOR SELECT
  USING (wandora.is_active_member(organization_id));

REVOKE ALL ON SCHEMA wandora_private FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA wandora_private FROM PUBLIC;

GRANT USAGE ON SCHEMA wandora TO authenticated;
GRANT SELECT ON wandora.organizations TO authenticated;
GRANT SELECT ON wandora.memberships TO authenticated;
GRANT SELECT ON wandora.messaging_connections TO authenticated;

REVOKE ALL ON FUNCTION wandora.current_auth_subject() FROM PUBLIC;
REVOKE ALL ON FUNCTION wandora.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION wandora.is_active_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION wandora.has_org_role(uuid, wandora.membership_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION wandora.can_access_messaging_connection(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION wandora.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION wandora.is_active_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION wandora.has_org_role(uuid, wandora.membership_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION wandora.can_access_messaging_connection(uuid) TO authenticated;

COMMENT ON TABLE wandora.organizations IS 'Canonical Wandora company/tenant identity; independent from provider IDs.';
COMMENT ON TABLE wandora.user_identities IS 'Maps external identity subjects such as Supabase Auth sub values to canonical Wandora users.';
COMMENT ON TABLE wandora.messaging_connections IS 'Provider-neutral messaging connection owned by exactly one Wandora organization.';
COMMENT ON TABLE wandora_private.messaging_provider_bindings IS 'Internal provider binding; never a customer-facing contract.';
