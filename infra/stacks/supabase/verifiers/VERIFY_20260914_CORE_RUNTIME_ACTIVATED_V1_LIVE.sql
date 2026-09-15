\set ON_ERROR_STOP on
BEGIN;
SET TRANSACTION READ ONLY;

DO $$
DECLARE
  runtime_oid oid;
  bad text;
  role_name text;
BEGIN
  SELECT oid INTO runtime_oid FROM pg_roles WHERE rolname = 'wandora_core_runtime';
  IF runtime_oid IS NULL THEN
    RAISE EXCEPTION 'wandora_core_runtime role missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.oid = runtime_oid
      AND r.rolcanlogin
      AND NOT r.rolsuper
      AND NOT r.rolcreatedb
      AND NOT r.rolcreaterole
      AND NOT r.rolinherit
      AND NOT r.rolreplication
      AND NOT r.rolbypassrls
      AND r.rolconnlimit = 4
  ) THEN
    RAISE EXCEPTION 'wandora_core_runtime attributes drifted';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_authid WHERE oid = runtime_oid AND rolpassword IS NULL) THEN
    RAISE EXCEPTION 'wandora_core_runtime activated state is missing a password';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_auth_members
    WHERE member = runtime_oid OR roleid = runtime_oid
  ) THEN
    RAISE EXCEPTION 'wandora_core_runtime unexpectedly participates in role membership';
  END IF;

  IF NOT has_schema_privilege('wandora_core_runtime', 'wandora', 'USAGE')
     OR NOT has_schema_privilege('wandora_core_runtime', 'wandora_private', 'USAGE') THEN
    RAISE EXCEPTION 'runtime missing Wandora schema usage';
  END IF;
  IF has_schema_privilege('wandora_core_runtime', 'wandora', 'CREATE')
     OR has_schema_privilege('wandora_core_runtime', 'wandora_private', 'CREATE')
     OR has_schema_privilege('wandora_core_runtime', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'runtime unexpectedly has schema CREATE';
  END IF;

  IF to_regnamespace('net') IS NOT NULL THEN
    IF has_schema_privilege('wandora_core_runtime', 'net', 'USAGE') THEN
      RAISE EXCEPTION 'runtime unexpectedly has pg_net schema usage';
    END IF;
    FOREACH role_name IN ARRAY ARRAY[
      'postgres', 'anon', 'authenticated', 'service_role', 'supabase_functions_admin'
    ] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
         AND NOT has_schema_privilege(role_name, 'net', 'USAGE') THEN
        RAISE EXCEPTION 'expected Supabase role % lost pg_net usage', role_name;
      END IF;
    END LOOP;
  END IF;

  SELECT string_agg(t, ', ' ORDER BY t) INTO bad
  FROM unnest(ARRAY[
    'wandora.organizations','wandora.memberships',
    'wandora.messaging_connections','wandora.digital_employees'
  ]) AS x(t)
  WHERE NOT has_table_privilege('wandora_core_runtime', t, 'SELECT')
     OR has_table_privilege('wandora_core_runtime', t, 'INSERT')
     OR has_table_privilege('wandora_core_runtime', t, 'UPDATE')
     OR has_table_privilege('wandora_core_runtime', t, 'DELETE')
     OR has_table_privilege('wandora_core_runtime', t, 'TRUNCATE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'foundation privilege drift: %', bad;
  END IF;

  SELECT string_agg(t, ', ' ORDER BY t) INTO bad
  FROM unnest(ARRAY[
    'wandora.contacts','wandora.conversations',
    'wandora.work_items','wandora.approvals'
  ]) AS x(t)
  WHERE NOT has_table_privilege('wandora_core_runtime', t, 'SELECT')
     OR NOT has_table_privilege('wandora_core_runtime', t, 'INSERT')
     OR has_table_privilege('wandora_core_runtime', t, 'UPDATE')
     OR has_table_privilege('wandora_core_runtime', t, 'DELETE')
     OR has_table_privilege('wandora_core_runtime', t, 'TRUNCATE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'mutable table-level privilege drift: %', bad;
  END IF;

  IF NOT has_table_privilege('wandora_core_runtime', 'wandora.messages', 'SELECT')
     OR NOT has_table_privilege('wandora_core_runtime', 'wandora.messages', 'INSERT')
     OR has_table_privilege('wandora_core_runtime', 'wandora.messages', 'UPDATE')
     OR has_table_privilege('wandora_core_runtime', 'wandora.messages', 'DELETE')
     OR has_table_privilege('wandora_core_runtime', 'wandora.messages', 'TRUNCATE') THEN
    RAISE EXCEPTION 'messages privilege drift';
  END IF;

  IF has_table_privilege('wandora_core_runtime', 'wandora.audit_records', 'SELECT')
     OR has_table_privilege('wandora_core_runtime', 'wandora.audit_records', 'INSERT')
     OR has_table_privilege('wandora_core_runtime', 'wandora.audit_records', 'UPDATE')
     OR has_table_privilege('wandora_core_runtime', 'wandora.audit_records', 'DELETE')
     OR has_table_privilege('wandora_core_runtime', 'wandora.audit_records', 'TRUNCATE') THEN
    RAISE EXCEPTION 'runtime unexpectedly has direct audit_records privilege';
  END IF;

  IF has_table_privilege('wandora_core_runtime', 'wandora.users', 'SELECT')
     OR has_table_privilege('wandora_core_runtime', 'wandora.user_identities', 'SELECT')
     OR has_table_privilege('wandora_core_runtime', 'wandora_private.messaging_provider_bindings', 'SELECT') THEN
    RAISE EXCEPTION 'runtime unexpectedly reads identity/provider-private state';
  END IF;

  IF NOT has_column_privilege('wandora_core_runtime', 'wandora.contacts', 'updated_at', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora.contacts', 'channel_address', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora.conversations', 'updated_at', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora.conversations', 'contact_id', 'UPDATE') THEN
    RAISE EXCEPTION 'contact/conversation UPDATE column drift';
  END IF;

  IF NOT has_column_privilege('wandora_core_runtime', 'wandora.work_items', 'status', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora.work_items', 'updated_at', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora.work_items', 'employee_id', 'UPDATE') THEN
    RAISE EXCEPTION 'work_items UPDATE column drift';
  END IF;

  IF NOT has_column_privilege('wandora_core_runtime', 'wandora.approvals', 'status', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora.approvals', 'proposed_text', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora.approvals', 'rationale', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora.approvals', 'decided_by_user_id', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora.approvals', 'decided_at', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora.approvals', 'source_event_id', 'UPDATE') THEN
    RAISE EXCEPTION 'approvals UPDATE column drift';
  END IF;

  SELECT string_agg(t, ', ' ORDER BY t) INTO bad
  FROM unnest(ARRAY[
    'wandora_private.inbound_event_receipts',
    'wandora_private.outbound_attempts'
  ]) AS x(t)
  WHERE NOT has_table_privilege('wandora_core_runtime', t, 'SELECT')
     OR NOT has_table_privilege('wandora_core_runtime', t, 'INSERT')
     OR has_table_privilege('wandora_core_runtime', t, 'UPDATE')
     OR has_table_privilege('wandora_core_runtime', t, 'DELETE')
     OR has_table_privilege('wandora_core_runtime', t, 'TRUNCATE');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'private runtime table privilege drift: %', bad;
  END IF;
  IF NOT has_column_privilege('wandora_core_runtime', 'wandora_private.inbound_event_receipts', 'status', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora_private.inbound_event_receipts', 'result', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora_private.inbound_event_receipts', 'received_at', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora_private.inbound_event_receipts', 'completed_at', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora_private.inbound_event_receipts', 'event_id', 'UPDATE') THEN
    RAISE EXCEPTION 'inbound receipt UPDATE column drift';
  END IF;

  IF NOT has_column_privilege('wandora_core_runtime', 'wandora_private.outbound_attempts', 'status', 'UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime', 'wandora_private.outbound_attempts', 'gateway_request_id', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora_private.outbound_attempts', 'body', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora_private.outbound_attempts', 'idempotency_key', 'UPDATE') THEN
    RAISE EXCEPTION 'outbound attempt UPDATE column drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'wandora_private'
      AND c.relname = 'inbound_event_receipts' AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'wandora_private'
      AND c.relname = 'outbound_attempts' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'private runtime RLS is not enabled';
  END IF;
  SELECT string_agg(v.policyname, ', ' ORDER BY v.policyname) INTO bad
  FROM (VALUES
    ('organizations_member_read'),
    ('memberships_member_read'),
    ('messaging_connections_member_read'),
    ('digital_employees_member_read'),
    ('contacts_member_read'),
    ('conversations_member_read'),
    ('messages_member_read'),
    ('work_items_member_read'),
    ('approvals_member_read')
  ) AS v(policyname)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'wandora'
      AND p.policyname = v.policyname
      AND p.roles = ARRAY['authenticated']::name[]
  );
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'member policy role drift: %', bad;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'wandora' AND p.tablename = 'audit_records'
      AND 'wandora_core_runtime'::name = ANY(p.roles)
  ) THEN
    RAISE EXCEPTION 'runtime unexpectedly has audit_records RLS policy';
  END IF;
  SELECT string_agg(v.policyname, ', ' ORDER BY v.policyname) INTO bad
  FROM (VALUES
    ('wandora','organizations','organizations_core_runtime_read','SELECT'),
    ('wandora','memberships','memberships_core_runtime_read','SELECT'),
    ('wandora','messaging_connections','messaging_connections_core_runtime_read','SELECT'),
    ('wandora','digital_employees','digital_employees_core_runtime_read','SELECT'),
    ('wandora','contacts','contacts_core_runtime_read','SELECT'),
    ('wandora','contacts','contacts_core_runtime_insert','INSERT'),
    ('wandora','contacts','contacts_core_runtime_update','UPDATE'),
    ('wandora','conversations','conversations_core_runtime_read','SELECT'),
    ('wandora','conversations','conversations_core_runtime_insert','INSERT'),
    ('wandora','conversations','conversations_core_runtime_update','UPDATE'),
    ('wandora','messages','messages_core_runtime_read','SELECT'),
    ('wandora','messages','messages_core_runtime_insert','INSERT'),
    ('wandora','work_items','work_items_core_runtime_read','SELECT'),
    ('wandora','work_items','work_items_core_runtime_insert','INSERT'),
    ('wandora','work_items','work_items_core_runtime_update','UPDATE'),
    ('wandora','approvals','approvals_core_runtime_read','SELECT'),
    ('wandora','approvals','approvals_core_runtime_insert','INSERT'),
    ('wandora','approvals','approvals_core_runtime_update','UPDATE'),
    ('wandora_private','inbound_event_receipts','inbound_event_receipts_core_runtime_read','SELECT'),
    ('wandora_private','inbound_event_receipts','inbound_event_receipts_core_runtime_insert','INSERT'),
    ('wandora_private','inbound_event_receipts','inbound_event_receipts_core_runtime_update','UPDATE'),
    ('wandora_private','outbound_attempts','outbound_attempts_core_runtime_read','SELECT'),
    ('wandora_private','outbound_attempts','outbound_attempts_core_runtime_insert','INSERT'),
    ('wandora_private','outbound_attempts','outbound_attempts_core_runtime_update','UPDATE')
  ) AS v(schemaname, tablename, policyname, cmd)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = v.schemaname
      AND p.tablename = v.tablename
      AND p.policyname = v.policyname
      AND p.cmd = v.cmd
      AND p.roles = ARRAY['wandora_core_runtime']::name[]
  );
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'runtime policy missing/drifted: %', bad;
  END IF;

  IF NOT has_function_privilege(
    'wandora_core_runtime', 'wandora.current_core_organization_id()', 'EXECUTE'
  ) OR NOT has_function_privilege(
    'wandora_core_runtime',
    'wandora.append_core_audit(uuid,wandora.audit_actor_type,text,wandora.audit_action,text,text,text,timestamptz)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'runtime missing required helper EXECUTE';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'wandora'
      AND p.proname = 'current_core_organization_id'
      AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'tenant helper unexpectedly SECURITY DEFINER';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'wandora'
      AND p.proname = 'append_core_audit'
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=pg_catalog, wandora, pg_temp']::text[]
  ) THEN
    RAISE EXCEPTION 'append_core_audit security/search_path drift';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
       AND has_function_privilege(
         role_name,
         'wandora.append_core_audit(uuid,wandora.audit_actor_type,text,wandora.audit_action,text,text,text,timestamptz)',
         'EXECUTE'
       ) THEN
      RAISE EXCEPTION 'role % unexpectedly executes append_core_audit', role_name;
    END IF;
  END LOOP;
END
$$;

SELECT 'CORE_RUNTIME_ACTIVATED_V1_LIVE_OK' AS verifier;
ROLLBACK;
