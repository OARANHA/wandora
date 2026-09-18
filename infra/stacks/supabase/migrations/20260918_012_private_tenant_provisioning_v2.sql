BEGIN;

ALTER TABLE wandora_private.tenant_provisioning_requests
  ADD COLUMN IF NOT EXISTS provisioning_version smallint NOT NULL DEFAULT 1;

ALTER TABLE wandora_private.tenant_provisioning_requests
  ALTER COLUMN employee_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'wandora_private.tenant_provisioning_requests'::regclass
      AND conname = 'tenant_provisioning_requests_version_shape'
  ) THEN
    ALTER TABLE wandora_private.tenant_provisioning_requests
      ADD CONSTRAINT tenant_provisioning_requests_version_shape
      CHECK (
        (provisioning_version = 1 AND employee_id IS NOT NULL)
        OR
        (provisioning_version = 2 AND employee_id IS NULL)
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION wandora_private.provision_beta_organization_v2(
  p_request_key text,
  p_organization_slug text,
  p_organization_display_name text,
  p_owner_supabase_subject text,
  p_owner_display_name text
)
RETURNS TABLE (
  organization_id uuid,
  user_id uuid
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
  v_fingerprint text;
  v_existing wandora_private.tenant_provisioning_requests%ROWTYPE;
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  IF v_request_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION 'wandora_provisioning_invalid_request_key' USING ERRCODE = 'P0001';
  END IF;
  IF v_slug !~ '^[a-z0-9][a-z0-9-]{1,62}$' THEN
    RAISE EXCEPTION 'wandora_provisioning_invalid_slug' USING ERRCODE = 'P0001';
  END IF;
  IF length(v_org_name) NOT BETWEEN 1 AND 120
     OR length(v_owner_name) NOT BETWEEN 1 AND 120
     OR length(v_subject) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'wandora_provisioning_invalid_input' USING ERRCODE = 'P0001';
  END IF;

  v_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'provisioning_version', 2,
          'organization_slug', v_slug,
          'organization_display_name', v_org_name,
          'owner_provider', 'supabase',
          'owner_subject', v_subject,
          'owner_display_name', v_owner_name
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
    IF v_existing.provisioning_version <> 2
       OR v_existing.request_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION 'wandora_provisioning_idempotency_conflict' USING ERRCODE = 'P0001';
    END IF;
    RETURN QUERY SELECT v_existing.organization_id, v_existing.user_id;
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

  INSERT INTO wandora_private.tenant_provisioning_requests (
    request_key,
    request_fingerprint,
    organization_id,
    user_id,
    employee_id,
    provisioning_version
  ) VALUES (
    v_request_key,
    v_fingerprint,
    v_org_id,
    v_user_id,
    NULL,
    2
  );

  RETURN QUERY SELECT v_org_id, v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION wandora_private.provision_beta_organization_v2(
  text, text, text, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION wandora_private.provision_beta_organization_v2(
  text, text, text, text, text
) FROM authenticated;
REVOKE ALL ON FUNCTION wandora_private.provision_beta_organization_v2(
  text, text, text, text, text
) FROM wandora_core_runtime;

GRANT EXECUTE ON FUNCTION wandora_private.provision_beta_organization_v2(
  text, text, text, text, text
) TO wandora_platform_provisioner;

REVOKE ALL ON wandora_private.tenant_provisioning_requests
  FROM wandora_platform_provisioner;

COMMENT ON COLUMN wandora_private.tenant_provisioning_requests.provisioning_version IS
  'Provisioning contract version. V1 requires employee_id; V2 is employee-free and requires employee_id NULL.';

COMMENT ON FUNCTION wandora_private.provision_beta_organization_v2(
  text, text, text, text, text
) IS
  'Operator-only idempotent provisioning of canonical organization, canonical user/identity and first active owner membership with zero digital employees. Does not create auth users, provider state, messaging state or outbound effects.';

COMMIT;
