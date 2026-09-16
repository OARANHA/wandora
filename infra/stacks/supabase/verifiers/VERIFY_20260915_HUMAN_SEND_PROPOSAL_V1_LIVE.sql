\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'wandora'
       AND t.typname = 'audit_action'
       AND e.enumlabel = 'proposal-send-requested'
  ) THEN
    RAISE EXCEPTION 'proposal-send-requested audit action missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'wandora_private'
       AND table_name = 'outbound_attempts'
       AND column_name = 'proposal_id'
       AND data_type = 'uuid'
       AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'outbound_attempts.proposal_id missing/invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'wandora_private'
       AND table_name = 'outbound_attempts'
       AND column_name = 'requested_by_user_id'
       AND data_type = 'uuid'
       AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'outbound_attempts.requested_by_user_id missing/invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'wandora_private.outbound_attempts'::regclass
       AND conname = 'outbound_attempts_human_linkage_consistency'
       AND contype = 'c'
  ) THEN
    RAISE EXCEPTION 'human linkage consistency constraint missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'wandora_private.outbound_attempts'::regclass
       AND conname = 'outbound_attempts_proposal_fk'
       AND contype = 'f'
  ) THEN
    RAISE EXCEPTION 'proposal foreign key missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'wandora_private.outbound_attempts'::regclass
       AND conname = 'outbound_attempts_requested_by_membership_fk'
       AND contype = 'f'
  ) THEN
    RAISE EXCEPTION 'human membership foreign key missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'wandora_private'
       AND tablename = 'outbound_attempts'
       AND indexname = 'outbound_attempts_one_per_proposal_idx'
       AND indexdef ILIKE '%UNIQUE%'
       AND indexdef ILIKE '%proposal_id IS NOT NULL%'
  ) THEN
    RAISE EXCEPTION 'one-attempt-per-proposal unique index missing';
  END IF;

  IF NOT has_table_privilege('wandora_core_runtime', 'wandora_private.outbound_attempts', 'SELECT')
     OR NOT has_table_privilege('wandora_core_runtime', 'wandora_private.outbound_attempts', 'INSERT') THEN
    RAISE EXCEPTION 'Core outbound attempt read/insert privileges missing';
  END IF;

  IF has_column_privilege('wandora_core_runtime', 'wandora_private.outbound_attempts', 'proposal_id', 'UPDATE')
     OR has_column_privilege('wandora_core_runtime', 'wandora_private.outbound_attempts', 'requested_by_user_id', 'UPDATE') THEN
    RAISE EXCEPTION 'human linkage columns must be immutable to Core after insert';
  END IF;

  IF has_table_privilege('authenticated', 'wandora_private.outbound_attempts', 'SELECT')
     OR has_table_privilege('authenticated', 'wandora_private.outbound_attempts', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated gained private outbound attempt access';
  END IF;

  IF has_table_privilege('wandora_core_runtime', 'wandora_private.messaging_provider_bindings', 'SELECT') THEN
    RAISE EXCEPTION 'Core must not gain provider-binding access';
  END IF;

  IF has_table_privilege('authenticated', 'wandora.work_proposals', 'SELECT')
     OR has_table_privilege('authenticated', 'wandora.work_proposals', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated gained direct proposal access';
  END IF;
END
$$;

SELECT 'HUMAN_SEND_PROPOSAL_V1_LIVE_OK' AS result;
