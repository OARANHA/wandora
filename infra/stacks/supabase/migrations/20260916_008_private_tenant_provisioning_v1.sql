BEGIN;

CREATE TABLE IF NOT EXISTS wandora_private.tenant_provisioning_requests (
  request_key text PRIMARY KEY CHECK (request_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  organization_id uuid NOT NULL REFERENCES wandora.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES wandora.users(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES wandora.digital_employees(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON wandora_private.tenant_provisioning_requests FROM PUBLIC;
REVOKE ALL ON wandora_private.tenant_provisioning_requests FROM authenticated;
REVOKE ALL ON wandora_private.tenant_provisioning_requests FROM wandora_core_runtime;

CREATE OR REPLACE FUNCTION wandora_private.provision_beta_organization_v1(
  p_request_key text,
  p_organization_slug text,
  p_organization_display_name text,
  p_owner_supabase_subject text,
  p_owner_display_name text,
  p_employee_display_name text DEFAULT 'Ana'
)
RETURNS TABLE (
  organization_id uuid,
  user_id uuid,
  employee_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, wandora, wandora_private, pg_temp
AS $$
DECLARE
  v_request_key text := trim(p_request_key);
  v_slug text := lower(trim(p_organization_slug));
  v_org_name text := trim(p_organization_display_name);
  v_subject text := trim(p_owner_supabase_subject);
  v_owner_name text := trim(p_owner_display_name);
  v_employee_name text := trim(COALESCE(p_employee_display_name, 'Ana'));
  v_fingerprint text;
  v_existing wandora_private.tenant_provisioning_requests%ROWTYPE;
  v_org_id uuid;
  v_user_id uuid;
  v_employee_id uuid;
BEGIN
  IF v_request_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION 'wandora_provisioning_invalid_request_key' USING ERRCODE = 'P0001';
  END IF;
  IF v_slug !~ '^[a-z0-9][a-z0-9-]{1,62}$' THEN
    RAISE EXCEPTION 'wandora_provisioning_invalid_slug' USING ERRCODE = 'P0001';
  END IF;
  IF length(v_org_name) NOT BETWEEN 1 AND 120
     OR length(v_owner_name) NOT BETWEEN 1 AND 120
     OR length(v_employee_name) NOT BETWEEN 1 AND 120
     OR length(v_subject) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'wandora_provisioning_invalid_input' USING ERRCODE = 'P0001';
  END IF;

  v_fingerprint := encode(
    digest(
      convert_to(
        jsonb_build_object(
          'organization_slug', v_slug,
          'organization_display_name', v_org_name,
          'owner_provider', 'supabase',
          'owner_subject', v_subject,
          'owner_display_name', v_owner_name,
          'employee_display_name', v_employee_name
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  PERFORM pg_advisory_xact_lock(hashtextextended(v_request_key, 0));

  SELECT *
    INTO v_existing
    FROM wandora_private.tenant_provisioning_requests
   WHERE request_key = v_request_key;

  IF FOUND THEN
    IF v_existing.request_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION 'wandora_provisioning_idempotency_conflict' USING ERRCODE = 'P0001';
    END IF;
    RETURN QUERY SELECT v_existing.organization_id, v_existing.user_id, v_existing.employee_id;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM wandora.organizations WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'wandora_provisioning_slug_conflict' USING ERRCODE = 'P0001';
  END IF;

  SELECT ui.user_id
    INTO v_user_id
    FROM wandora.user_identities ui
   WHERE ui.provider = 'supabase'
     AND ui.provider_subject = v_subject
   LIMIT 1;

  IF v_user_id IS NULL THEN
    INSERT INTO wandora.users (display_name)
    VALUES (v_owner_name)
    RETURNING id INTO v_user_id;

    INSERT INTO wandora.user_identities (user_id, provider, provider_subject)
    VALUES (v_user_id, 'supabase', v_subject);
  END IF;

  INSERT INTO wandora.organizations (slug, display_name, status)
  VALUES (v_slug, v_org_name, 'active')
  RETURNING id INTO v_org_id;

  INSERT INTO wandora.memberships (organization_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, 'owner', 'active');

  INSERT INTO wandora.digital_employees (
    organization_id, display_name, role, status, autonomy_mode
  ) VALUES (
    v_org_id, v_employee_name, 'commercial-assistant', 'active', 'supervised'
  )
  RETURNING id INTO v_employee_id;

  INSERT INTO wandora_private.tenant_provisioning_requests (
    request_key,
    request_fingerprint,
    organization_id,
    user_id,
    employee_id
  ) VALUES (
    v_request_key,
    v_fingerprint,
    v_org_id,
    v_user_id,
    v_employee_id
  );

  RETURN QUERY SELECT v_org_id, v_user_id, v_employee_id;
END;
$$;

REVOKE ALL ON FUNCTION wandora_private.provision_beta_organization_v1(text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION wandora_private.provision_beta_organization_v1(text, text, text, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION wandora_private.provision_beta_organization_v1(text, text, text, text, text, text) FROM wandora_core_runtime;

COMMENT ON TABLE wandora_private.tenant_provisioning_requests IS
  'Private idempotency evidence for operator-controlled Wandora tenant provisioning.';
COMMENT ON FUNCTION wandora_private.provision_beta_organization_v1(text, text, text, text, text, text) IS
  'Operator-only idempotent provisioning of canonical organization, first owner membership and initial supervised digital employee. Does not create auth users or messaging/provider bindings.';

COMMIT;
