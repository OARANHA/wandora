BEGIN;

CREATE ROLE wandora_core_runtime
  LOGIN
  CONNECTION LIMIT 0
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS;

-- pg_net grants its schema to PUBLIC upstream. Keep Supabase's explicit
-- service grants, but prevent unrelated roles (including Wandora Core)
-- from inheriting database-originated network egress through PUBLIC.
DO $$
DECLARE
  role_name text;
BEGIN
  IF to_regnamespace('net') IS NOT NULL THEN
    EXECUTE 'REVOKE USAGE ON SCHEMA net FROM PUBLIC';
    FOREACH role_name IN ARRAY ARRAY[
      'postgres', 'anon', 'authenticated', 'service_role', 'supabase_functions_admin'
    ]
    LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('GRANT USAGE ON SCHEMA net TO %I', role_name);
      END IF;
    END LOOP;
  END IF;
END
$$;

CREATE FUNCTION wandora.current_core_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT nullif(current_setting('wandora.organization_id', true), '')::uuid;
$$;

REVOKE ALL ON FUNCTION wandora.current_core_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wandora.current_core_organization_id() TO wandora_core_runtime;

CREATE FUNCTION wandora.append_core_audit(
  p_organization_id uuid,
  p_actor_type wandora.audit_actor_type,
  p_actor_id text,
  p_action wandora.audit_action,
  p_subject_type text,
  p_subject_id text,
  p_correlation_id text,
  p_occurred_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, wandora, pg_temp
AS $$
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'wandora_core_tenant_mismatch';
  END IF;

  INSERT INTO wandora.audit_records
    (organization_id, actor_type, actor_id, action, subject_type, subject_id,
     correlation_id, occurred_at)
  VALUES
    (p_organization_id, p_actor_type, p_actor_id, p_action, p_subject_type, p_subject_id,
     p_correlation_id, p_occurred_at)
  ON CONFLICT (organization_id, action, subject_type, subject_id, correlation_id)
  DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION wandora.append_core_audit(
  uuid, wandora.audit_actor_type, text, wandora.audit_action, text, text, text, timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wandora.append_core_audit(
  uuid, wandora.audit_actor_type, text, wandora.audit_action, text, text, text, timestamptz
) TO wandora_core_runtime;

GRANT USAGE ON SCHEMA wandora, wandora_private TO wandora_core_runtime;

-- Foundation state is read-only to Core. Mutable workflow tables below receive
-- only the exact write columns required by the current Ana service.
GRANT SELECT ON
  wandora.organizations,
  wandora.memberships,
  wandora.messaging_connections,
  wandora.digital_employees
TO wandora_core_runtime;

GRANT SELECT, INSERT ON
  wandora.contacts,
  wandora.conversations,
  wandora.work_items,
  wandora.approvals
TO wandora_core_runtime;
GRANT UPDATE (updated_at) ON wandora.contacts, wandora.conversations TO wandora_core_runtime;
GRANT UPDATE (status, updated_at) ON wandora.work_items TO wandora_core_runtime;
GRANT UPDATE (status, proposed_text, rationale, decided_by_user_id, decided_at)
  ON wandora.approvals TO wandora_core_runtime;
GRANT SELECT, INSERT ON wandora.messages TO wandora_core_runtime;
-- audit_records stays inaccessible directly; append_core_audit() is the only Core write path.
GRANT SELECT, INSERT ON
  wandora_private.inbound_event_receipts,
  wandora_private.outbound_attempts
TO wandora_core_runtime;
GRANT UPDATE (status, result, received_at, completed_at)
  ON wandora_private.inbound_event_receipts TO wandora_core_runtime;
GRANT UPDATE (status, gateway_request_id)
  ON wandora_private.outbound_attempts TO wandora_core_runtime;

-- Existing member-read policies were created without an explicit TO clause,
-- which makes them apply to PUBLIC. Restrict them to the browser role they
-- were designed for before adding the independent Core service policies.
ALTER POLICY organizations_member_read ON wandora.organizations TO authenticated;
ALTER POLICY memberships_member_read ON wandora.memberships TO authenticated;
ALTER POLICY messaging_connections_member_read ON wandora.messaging_connections TO authenticated;
ALTER POLICY digital_employees_member_read ON wandora.digital_employees TO authenticated;
ALTER POLICY contacts_member_read ON wandora.contacts TO authenticated;
ALTER POLICY conversations_member_read ON wandora.conversations TO authenticated;
ALTER POLICY messages_member_read ON wandora.messages TO authenticated;
ALTER POLICY work_items_member_read ON wandora.work_items TO authenticated;
ALTER POLICY approvals_member_read ON wandora.approvals TO authenticated;

CREATE POLICY organizations_core_runtime_read
  ON wandora.organizations
  FOR SELECT TO wandora_core_runtime
  USING (id = wandora.current_core_organization_id());

CREATE POLICY memberships_core_runtime_read
  ON wandora.memberships
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());

CREATE POLICY messaging_connections_core_runtime_read
  ON wandora.messaging_connections
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());

CREATE POLICY digital_employees_core_runtime_read
  ON wandora.digital_employees
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());

CREATE POLICY contacts_core_runtime_read
  ON wandora.contacts
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());
CREATE POLICY contacts_core_runtime_insert
  ON wandora.contacts
  FOR INSERT TO wandora_core_runtime
  WITH CHECK (organization_id = wandora.current_core_organization_id());
CREATE POLICY contacts_core_runtime_update
  ON wandora.contacts
  FOR UPDATE TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id())
  WITH CHECK (organization_id = wandora.current_core_organization_id());

CREATE POLICY conversations_core_runtime_read
  ON wandora.conversations
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());
CREATE POLICY conversations_core_runtime_insert
  ON wandora.conversations
  FOR INSERT TO wandora_core_runtime
  WITH CHECK (organization_id = wandora.current_core_organization_id());
CREATE POLICY conversations_core_runtime_update
  ON wandora.conversations
  FOR UPDATE TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id())
  WITH CHECK (organization_id = wandora.current_core_organization_id());

CREATE POLICY messages_core_runtime_read
  ON wandora.messages
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());
CREATE POLICY messages_core_runtime_insert
  ON wandora.messages
  FOR INSERT TO wandora_core_runtime
  WITH CHECK (organization_id = wandora.current_core_organization_id());

CREATE POLICY work_items_core_runtime_read
  ON wandora.work_items
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());
CREATE POLICY work_items_core_runtime_insert
  ON wandora.work_items
  FOR INSERT TO wandora_core_runtime
  WITH CHECK (organization_id = wandora.current_core_organization_id());
CREATE POLICY work_items_core_runtime_update
  ON wandora.work_items
  FOR UPDATE TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id())
  WITH CHECK (organization_id = wandora.current_core_organization_id());

CREATE POLICY approvals_core_runtime_read
  ON wandora.approvals
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());
CREATE POLICY approvals_core_runtime_insert
  ON wandora.approvals
  FOR INSERT TO wandora_core_runtime
  WITH CHECK (organization_id = wandora.current_core_organization_id());
CREATE POLICY approvals_core_runtime_update
  ON wandora.approvals
  FOR UPDATE TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id())
  WITH CHECK (organization_id = wandora.current_core_organization_id());

ALTER TABLE wandora_private.inbound_event_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wandora_private.outbound_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY inbound_event_receipts_core_runtime_read
  ON wandora_private.inbound_event_receipts
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());
CREATE POLICY inbound_event_receipts_core_runtime_insert
  ON wandora_private.inbound_event_receipts
  FOR INSERT TO wandora_core_runtime
  WITH CHECK (organization_id = wandora.current_core_organization_id());
CREATE POLICY inbound_event_receipts_core_runtime_update
  ON wandora_private.inbound_event_receipts
  FOR UPDATE TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id())
  WITH CHECK (organization_id = wandora.current_core_organization_id());

CREATE POLICY outbound_attempts_core_runtime_read
  ON wandora_private.outbound_attempts
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());
CREATE POLICY outbound_attempts_core_runtime_insert
  ON wandora_private.outbound_attempts
  FOR INSERT TO wandora_core_runtime
  WITH CHECK (organization_id = wandora.current_core_organization_id());
CREATE POLICY outbound_attempts_core_runtime_update
  ON wandora_private.outbound_attempts
  FOR UPDATE TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id())
  WITH CHECK (organization_id = wandora.current_core_organization_id());

COMMENT ON ROLE wandora_core_runtime IS
  'Disabled-by-default least-privilege Wandora Core login; no password and connection limit 0 until separately provisioned.';
COMMENT ON FUNCTION wandora.current_core_organization_id() IS
  'Returns the transaction-local organization scope required by Wandora Core RLS policies.';
COMMENT ON FUNCTION wandora.append_core_audit(
  uuid, wandora.audit_actor_type, text, wandora.audit_action, text, text, text, timestamptz
) IS 'Tenant-checked append-only audit writer for Wandora Core; direct audit table access remains denied.';

COMMIT;
