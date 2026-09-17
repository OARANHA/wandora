\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='wandora_private'
      AND table_name='digital_employee_hire_operations'
      AND column_name='catalog_key' AND is_nullable='NO'
  ) THEN RAISE EXCEPTION 'adapter_catalog_key_missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='wandora_private'
      AND table_name='digital_employee_hire_operations'
      AND column_name='provider_company_ref' AND is_nullable='NO'
  ) THEN RAISE EXCEPTION 'adapter_company_snapshot_missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='wandora_private'
      AND indexname='digital_employee_hire_operations_org_provider_catalog_uidx'
  ) THEN RAISE EXCEPTION 'adapter_catalog_uniqueness_missing'; END IF;

  IF NOT has_table_privilege('wandora_core_runtime','wandora_private.control_plane_provider_bindings','SELECT')
     OR has_table_privilege('wandora_core_runtime','wandora_private.control_plane_provider_bindings','INSERT')
     OR NOT has_table_privilege('wandora_core_runtime','wandora_private.digital_employee_provider_bindings','SELECT')
     OR NOT has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_provider_bindings','provider_agent_ref','INSERT')
     OR NOT has_table_privilege('wandora_core_runtime','wandora_private.digital_employee_hire_operations','SELECT')
     OR NOT has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_hire_operations','catalog_key','INSERT')
     OR NOT has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_hire_operations','provider_company_ref','INSERT')
     OR NOT has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_hire_operations','status','UPDATE')
     OR has_column_privilege('wandora_core_runtime','wandora_private.digital_employee_hire_operations','request_hash','UPDATE')
     OR NOT has_column_privilege('wandora_core_runtime','wandora.digital_employees','id','INSERT')
     OR has_table_privilege('wandora_core_runtime','wandora.digital_employees','DELETE')
  THEN RAISE EXCEPTION 'adapter_core_privileges_invalid'; END IF;

  IF has_table_privilege('authenticated','wandora_private.digital_employee_hire_operations','SELECT')
     OR has_table_privilege('authenticated','wandora_private.digital_employee_provider_bindings','SELECT')
     OR has_table_privilege('anon','wandora_private.digital_employee_hire_operations','SELECT')
  THEN RAISE EXCEPTION 'adapter_private_state_browser_leak'; END IF;
END
$$;

BEGIN;
INSERT INTO wandora.organizations(id,slug,display_name) VALUES
 ('41111111-1111-4111-8111-111111111101','adapter-service-a','Adapter Service A'),
 ('41111111-1111-4111-8111-111111111102','adapter-service-b','Adapter Service B');
INSERT INTO wandora_private.control_plane_provider_bindings(organization_id,provider,provider_company_ref) VALUES
 ('41111111-1111-4111-8111-111111111101','paperclip','paperclip-company-service-a'),
 ('41111111-1111-4111-8111-111111111102','paperclip','paperclip-company-service-b');

SET LOCAL ROLE wandora_core_runtime;
SELECT set_config('wandora.organization_id','41111111-1111-4111-8111-111111111101',true);

DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM wandora_private.control_plane_provider_bindings;
  IF n<>1 THEN RAISE EXCEPTION 'adapter_provider_scope_failed:%',n; END IF;
END $$;

INSERT INTO wandora_private.digital_employee_hire_operations
 (organization_id,idempotency_key,request_hash,employee_id,provider,catalog_key,provider_company_ref,status)
VALUES
 ('41111111-1111-4111-8111-111111111101','hire-service-a',repeat('a',64),
  '42222222-2222-4222-8222-222222222201','paperclip','ana-commercial-v1','paperclip-company-service-a','creating');
INSERT INTO wandora.digital_employees(id,organization_id,display_name,role,status,autonomy_mode) VALUES
 ('42222222-2222-4222-8222-222222222201','41111111-1111-4111-8111-111111111101','Ana','commercial-assistant','active','supervised');
INSERT INTO wandora_private.digital_employee_provider_bindings(organization_id,employee_id,provider,provider_agent_ref) VALUES
 ('41111111-1111-4111-8111-111111111101','42222222-2222-4222-8222-222222222201','paperclip','paperclip-agent-service-a');
UPDATE wandora_private.digital_employee_hire_operations
 SET status='completed',provider_agent_ref='paperclip-agent-service-a',completed_at=now()
 WHERE organization_id='41111111-1111-4111-8111-111111111101' AND idempotency_key='hire-service-a';

DO $$ BEGIN
  BEGIN
    INSERT INTO wandora_private.digital_employee_hire_operations
     (organization_id,idempotency_key,request_hash,employee_id,provider,catalog_key,provider_company_ref,status)
    VALUES
     ('41111111-1111-4111-8111-111111111102','cross-tenant',repeat('b',64),
      '42222222-2222-4222-8222-222222222202','paperclip','ana-commercial-v1','paperclip-company-service-b','planned');
    RAISE EXCEPTION 'expected_cross_tenant_denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

RESET ROLE;
DO $$ BEGIN
  BEGIN
    INSERT INTO wandora_private.digital_employee_hire_operations
     (organization_id,idempotency_key,request_hash,employee_id,provider,catalog_key,provider_company_ref,status)
    VALUES
     ('41111111-1111-4111-8111-111111111101','duplicate-catalog',repeat('c',64),
      '42222222-2222-4222-8222-222222222204','paperclip','ana-commercial-v1','paperclip-company-service-a','planned');
    RAISE EXCEPTION 'expected_catalog_uniqueness_failure';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
ROLLBACK;

SELECT 'ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1_OK' AS result;
