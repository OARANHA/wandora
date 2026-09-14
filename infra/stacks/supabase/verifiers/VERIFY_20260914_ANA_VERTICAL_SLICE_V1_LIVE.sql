\set ON_ERROR_STOP on
BEGIN;
SET TRANSACTION READ ONLY;

DO $verify$
DECLARE
  missing text;
BEGIN
  IF current_setting('transaction_read_only') <> 'on' THEN
    RAISE EXCEPTION 'live verifier is not running read-only';
  END IF;

  IF to_regnamespace('wandora') IS NULL OR to_regnamespace('wandora_private') IS NULL THEN
    RAISE EXCEPTION 'required Wandora schemas are missing';
  END IF;

  SELECT string_agg(name, ', ' ORDER BY name) INTO missing
  FROM unnest(ARRAY[
    'organizations','users','user_identities','memberships','messaging_connections',
    'digital_employees','contacts','conversations','messages','work_items','approvals','audit_records'
  ]) AS t(name)
  WHERE to_regclass(format('wandora.%I', name)) IS NULL;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'missing wandora tables: %', missing; END IF;

  SELECT string_agg(name, ', ' ORDER BY name) INTO missing
  FROM unnest(ARRAY['messaging_provider_bindings','inbound_event_receipts','outbound_attempts']) AS t(name)
  WHERE to_regclass(format('wandora_private.%I', name)) IS NULL;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'missing private tables: %', missing; END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO missing
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'wandora'
    AND c.relname = ANY (ARRAY[
      'organizations','memberships','messaging_connections','digital_employees','contacts',
      'conversations','messages','work_items','approvals','audit_records'
    ])
    AND NOT c.relrowsecurity;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'RLS disabled on: %', missing; END IF;

  IF NOT has_table_privilege('authenticated','wandora.organizations','SELECT')
     OR NOT has_table_privilege('authenticated','wandora.memberships','SELECT')
     OR NOT has_table_privilege('authenticated','wandora.messaging_connections','SELECT') THEN
    RAISE EXCEPTION 'authenticated is missing an expected foundation read grant';
  END IF;

  SELECT string_agg(name, ', ' ORDER BY name) INTO missing
  FROM unnest(ARRAY[
    'users','user_identities','digital_employees','contacts','conversations','messages',
    'work_items','approvals','audit_records'
  ]) AS t(name)
  WHERE has_table_privilege('authenticated', format('wandora.%I', name), 'SELECT');
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'authenticated unexpectedly reads internal tables: %', missing; END IF;

  IF has_schema_privilege('authenticated','wandora_private','USAGE') THEN
    RAISE EXCEPTION 'authenticated unexpectedly has wandora_private schema usage';
  END IF;

  IF to_regprocedure('wandora.current_user_id()') IS NULL
     OR to_regprocedure('wandora.is_active_member(uuid)') IS NULL
     OR to_regprocedure('wandora.has_org_role(uuid,wandora.membership_role[])') IS NULL
     OR to_regprocedure('wandora.can_access_messaging_connection(uuid)') IS NULL
     OR to_regprocedure('wandora.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'one or more required Wandora functions are missing';
  END IF;

  IF NOT has_function_privilege('authenticated','wandora.current_user_id()','EXECUTE')
     OR NOT has_function_privilege('authenticated','wandora.is_active_member(uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','wandora.has_org_role(uuid,wandora.membership_role[])','EXECUTE')
     OR NOT has_function_privilege('authenticated','wandora.can_access_messaging_connection(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated is missing an expected helper EXECUTE grant';
  END IF;

  IF has_function_privilege('authenticated','wandora.current_auth_subject()','EXECUTE')
     OR has_function_privilege('authenticated','wandora.set_updated_at()','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated unexpectedly executes an internal helper';
  END IF;

  SELECT string_agg(v.tablename || '.' || v.policyname, ', ' ORDER BY v.tablename, v.policyname) INTO missing
  FROM (VALUES
    ('organizations','organizations_member_read'),
    ('memberships','memberships_member_read'),
    ('messaging_connections','messaging_connections_member_read'),
    ('digital_employees','digital_employees_member_read'),
    ('contacts','contacts_member_read'),
    ('conversations','conversations_member_read'),
    ('messages','messages_member_read'),
    ('work_items','work_items_member_read'),
    ('approvals','approvals_member_read')
  ) AS v(tablename, policyname)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='wandora' AND p.tablename=v.tablename AND p.policyname=v.policyname
  );
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'missing policies: %', missing; END IF;

  SELECT string_agg(name, ', ' ORDER BY name) INTO missing
  FROM unnest(ARRAY[
    'work_items_one_active_qualification_idx','messages_inbound_event_once_idx',
    'messages_outbound_event_once_idx','audit_records_action_once_idx'
  ]) AS t(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes i WHERE i.schemaname='wandora' AND i.indexname=name
  );
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'missing critical indexes: %', missing; END IF;

  SELECT string_agg(v.conname, ', ' ORDER BY v.conname) INTO missing
  FROM (VALUES
    ('messaging_connections','messaging_connections_org_id_unique'),
    ('approvals','approvals_decision_consistency')
  ) AS v(tablename, conname)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON r.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE n.nspname='wandora' AND r.relname=v.tablename AND c.conname=v.conname
  );
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'missing critical constraints: %', missing; END IF;

  SELECT string_agg(v.trigger_name, ', ' ORDER BY v.trigger_name) INTO missing
  FROM (VALUES
    ('digital_employees','digital_employees_set_updated_at'),
    ('contacts','contacts_set_updated_at'),
    ('conversations','conversations_set_updated_at'),
    ('work_items','work_items_set_updated_at'),
    ('outbound_attempts','outbound_attempts_set_updated_at')
  ) AS v(table_name, trigger_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class r ON r.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = CASE WHEN v.table_name='outbound_attempts' THEN 'wandora_private' ELSE 'wandora' END
      AND r.relname=v.table_name AND t.tgname=v.trigger_name
  );
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'missing updated_at triggers: %', missing; END IF;
END
$verify$;

SELECT 'ANA_LIVE_POSTVERIFY_V1_OK' AS result;
COMMIT;
