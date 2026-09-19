\set ON_ERROR_STOP on

DO $$
BEGIN
  IF to_regprocedure('wandora_private.resolve_paperclip_execution_organization(text)') IS NULL
  THEN RAISE EXCEPTION 'paperclip_execution_resolver_missing'; END IF;

  IF has_function_privilege('authenticated','wandora_private.resolve_paperclip_execution_organization(text)','EXECUTE')
     OR has_function_privilege('anon','wandora_private.resolve_paperclip_execution_organization(text)','EXECUTE')
     OR NOT has_function_privilege('wandora_core_runtime','wandora_private.resolve_paperclip_execution_organization(text)','EXECUTE')
  THEN RAISE EXCEPTION 'paperclip_execution_resolver_privileges_invalid'; END IF;
END
$$;

BEGIN;
INSERT INTO wandora.organizations(id,slug,display_name,status) VALUES
 ('61111111-1111-4111-8111-111111111101','bridge-a','Bridge A','active'),
 ('61111111-1111-4111-8111-111111111102','bridge-b','Bridge B','suspended');
INSERT INTO wandora_private.control_plane_provider_bindings(organization_id,provider,provider_company_ref) VALUES
 ('61111111-1111-4111-8111-111111111101','paperclip','paperclip-bridge-a'),
 ('61111111-1111-4111-8111-111111111102','paperclip','paperclip-bridge-b');

SET LOCAL ROLE wandora_core_runtime;
DO $$
DECLARE a uuid; b uuid;
BEGIN
  SELECT wandora_private.resolve_paperclip_execution_organization('paperclip-bridge-a') INTO a;
  SELECT wandora_private.resolve_paperclip_execution_organization('paperclip-bridge-b') INTO b;
  IF a <> '61111111-1111-4111-8111-111111111101'::uuid THEN
    RAISE EXCEPTION 'paperclip_execution_resolver_active_mapping_failed:%',a;
  END IF;
  IF b IS NOT NULL THEN
    RAISE EXCEPTION 'paperclip_execution_resolver_suspended_org_leak:%',b;
  END IF;
END
$$;
RESET ROLE;
ROLLBACK;

SELECT 'PAPERCLIP_EXECUTION_BINDING_RESOLVER_V1_OK' AS result;
