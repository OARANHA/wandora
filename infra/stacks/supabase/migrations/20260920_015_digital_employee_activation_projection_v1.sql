BEGIN;

CREATE OR REPLACE FUNCTION wandora_private.lock_catalog_digital_employee_activation_v1(
  p_organization_id uuid,
  p_employee_id uuid
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, wandora, wandora_private, pg_temp
AS $$
DECLARE
  v_status text;
  v_binding_matches integer;
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'digital_employee_activation_tenant_mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT de.status::text
    INTO v_status
    FROM wandora.digital_employees de
    JOIN wandora.organizations o
      ON o.id = de.organization_id
   WHERE de.organization_id = p_organization_id
     AND de.id = p_employee_id
     AND o.status = 'active'
     AND de.display_name = 'Ana'
     AND de.role = 'commercial-assistant'
     AND de.autonomy_mode = 'supervised'
   FOR UPDATE OF de;

  IF NOT FOUND OR v_status NOT IN ('paused', 'active') THEN
    RETURN NULL;
  END IF;

  SELECT count(*)::integer
    INTO v_binding_matches
    FROM wandora_private.digital_employee_hire_operations h
    JOIN wandora_private.control_plane_provider_bindings c
      ON c.organization_id = h.organization_id
     AND c.provider = h.provider
     AND c.provider_company_ref = h.provider_company_ref
    JOIN wandora_private.digital_employee_provider_bindings b
      ON b.organization_id = h.organization_id
     AND b.employee_id = h.employee_id
     AND b.provider = h.provider
     AND b.provider_agent_ref = h.provider_agent_ref
   WHERE h.organization_id = p_organization_id
     AND h.employee_id = p_employee_id
     AND h.provider = 'paperclip'
     AND h.catalog_key = 'ana-commercial-v1'
     AND h.status = 'completed'
     AND h.provider_agent_ref IS NOT NULL;

  IF v_binding_matches <> 1 THEN
    RETURN NULL;
  END IF;

  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION wandora_private.activate_catalog_digital_employee_projection_v1(
  p_organization_id uuid,
  p_employee_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, wandora, wandora_private, pg_temp
AS $$
DECLARE
  v_status text;
  v_binding_matches integer;
  v_updated integer;
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'digital_employee_activation_tenant_mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT de.status::text
    INTO v_status
    FROM wandora.digital_employees de
    JOIN wandora.organizations o
      ON o.id = de.organization_id
   WHERE de.organization_id = p_organization_id
     AND de.id = p_employee_id
     AND o.status = 'active'
     AND de.display_name = 'Ana'
     AND de.role = 'commercial-assistant'
     AND de.autonomy_mode = 'supervised'
   FOR UPDATE OF de;

  IF NOT FOUND OR v_status NOT IN ('paused', 'active') THEN
    RETURN false;
  END IF;

  SELECT count(*)::integer
    INTO v_binding_matches
    FROM wandora_private.digital_employee_hire_operations h
    JOIN wandora_private.control_plane_provider_bindings c
      ON c.organization_id = h.organization_id
     AND c.provider = h.provider
     AND c.provider_company_ref = h.provider_company_ref
    JOIN wandora_private.digital_employee_provider_bindings b
      ON b.organization_id = h.organization_id
     AND b.employee_id = h.employee_id
     AND b.provider = h.provider
     AND b.provider_agent_ref = h.provider_agent_ref
   WHERE h.organization_id = p_organization_id
     AND h.employee_id = p_employee_id
     AND h.provider = 'paperclip'
     AND h.catalog_key = 'ana-commercial-v1'
     AND h.status = 'completed'
     AND h.provider_agent_ref IS NOT NULL;

  IF v_binding_matches <> 1 THEN
    RETURN false;
  END IF;

  IF v_status = 'active' THEN
    RETURN true;
  END IF;

  UPDATE wandora.digital_employees
     SET status = 'active',
         updated_at = now()
   WHERE organization_id = p_organization_id
     AND id = p_employee_id
     AND status = 'paused';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION wandora_private.lock_catalog_digital_employee_activation_v1(uuid, uuid)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION wandora_private.activate_catalog_digital_employee_projection_v1(uuid, uuid)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION wandora_private.lock_catalog_digital_employee_activation_v1(uuid, uuid)
  TO wandora_core_runtime;
GRANT EXECUTE ON FUNCTION wandora_private.activate_catalog_digital_employee_projection_v1(uuid, uuid)
  TO wandora_core_runtime;

COMMENT ON FUNCTION wandora_private.lock_catalog_digital_employee_activation_v1(uuid, uuid) IS
  'Tenant-scoped activation lock and exact completed-hire/binding precondition for the fixed Ana catalog employee. It changes no lifecycle state.';
COMMENT ON FUNCTION wandora_private.activate_catalog_digital_employee_projection_v1(uuid, uuid) IS
  'Tenant-scoped least-privilege Wandora paused-to-active projection finalizer after provider lifecycle reconciliation. It exposes no provider identifier and grants no direct table UPDATE.';

COMMIT;
