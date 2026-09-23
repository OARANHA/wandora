BEGIN;

ALTER TYPE wandora.audit_action ADD VALUE IF NOT EXISTS 'organization-profile-created';
ALTER TYPE wandora.audit_action ADD VALUE IF NOT EXISTS 'organization-profile-updated';

CREATE TYPE wandora.organization_entity_type AS ENUM ('pj', 'pf');

CREATE TABLE wandora.organization_profiles (
  organization_id uuid PRIMARY KEY REFERENCES wandora.organizations(id) ON DELETE CASCADE,
  entity_type wandora.organization_entity_type NOT NULL,
  legal_name text NOT NULL CHECK (length(trim(legal_name)) BETWEEN 1 AND 160),
  tax_id text NOT NULL CHECK (tax_id ~ '^[0-9]{11}$|^[0-9A-Z]{12}[0-9]{2}$'),
  responsible_name text NOT NULL CHECK (length(trim(responsible_name)) BETWEEN 1 AND 120),
  contact_email text NOT NULL CHECK (
    length(trim(contact_email)) BETWEEN 3 AND 254
    AND position('@' in contact_email) > 1
  ),
  phone text NOT NULL CHECK (length(trim(phone)) BETWEEN 8 AND 32),
  postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{8}$'),
  address_line1 text NOT NULL CHECK (length(trim(address_line1)) BETWEEN 1 AND 180),
  address_number text NOT NULL CHECK (length(trim(address_number)) BETWEEN 1 AND 32),
  address_complement text CHECK (
    address_complement IS NULL OR length(trim(address_complement)) BETWEEN 1 AND 120
  ),
  district text NOT NULL CHECK (length(trim(district)) BETWEEN 1 AND 120),
  city text NOT NULL CHECK (length(trim(city)) BETWEEN 1 AND 120),
  state_code text NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  country_code text NOT NULL DEFAULT 'BR' CHECK (country_code = 'BR'),
  website text CHECK (website IS NULL OR length(trim(website)) BETWEEN 1 AND 512),
  business_segment text CHECK (
    business_segment IS NULL OR length(trim(business_segment)) BETWEEN 1 AND 120
  ),
  timezone text NOT NULL CHECK (length(trim(timezone)) BETWEEN 1 AND 64),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (entity_type = 'pf' AND tax_id ~ '^[0-9]{11}$')
    OR (entity_type = 'pj' AND tax_id ~ '^[0-9A-Z]{12}[0-9]{2}$')
  )
);

DROP TRIGGER IF EXISTS organization_profiles_set_updated_at
  ON wandora.organization_profiles;
CREATE TRIGGER organization_profiles_set_updated_at
  BEFORE UPDATE ON wandora.organization_profiles
  FOR EACH ROW EXECUTE FUNCTION wandora.set_updated_at();

ALTER TABLE wandora.organization_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON wandora.organization_profiles
  FROM PUBLIC, anon, authenticated, service_role, wandora_core_runtime;

GRANT SELECT ON wandora.organization_profiles TO wandora_core_runtime;

CREATE POLICY organization_profiles_core_runtime_read
  ON wandora.organization_profiles
  FOR SELECT TO wandora_core_runtime
  USING (organization_id = wandora.current_core_organization_id());

CREATE OR REPLACE FUNCTION wandora_private.complete_customer_company_onboarding_v1(
  p_provider_subject text,
  p_organization_display_name text,
  p_entity_type text,
  p_legal_name text,
  p_tax_id text,
  p_responsible_name text,
  p_contact_email text,
  p_phone text,
  p_postal_code text,
  p_address_line1 text,
  p_address_number text,
  p_address_complement text,
  p_district text,
  p_city text,
  p_state_code text,
  p_website text,
  p_business_segment text,
  p_timezone text,
  p_correlation_id text,
  p_occurred_at timestamptz
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
  v_subject text := btrim(p_provider_subject);
  v_org_name text := btrim(p_organization_display_name);
  v_entity_type text := lower(btrim(p_entity_type));
  v_legal_name text := btrim(p_legal_name);
  v_tax_id text := upper(btrim(coalesce(p_tax_id, '')));
  v_responsible_name text := btrim(p_responsible_name);
  v_contact_email text := lower(btrim(p_contact_email));
  v_phone text := btrim(p_phone);
  v_postal_code text := btrim(coalesce(p_postal_code, ''));
  v_address_line1 text := btrim(p_address_line1);
  v_address_number text := btrim(p_address_number);
  v_address_complement text := nullif(btrim(coalesce(p_address_complement, '')), '');
  v_district text := btrim(p_district);
  v_city text := btrim(p_city);
  v_state_code text := upper(btrim(p_state_code));
  v_website text := nullif(btrim(coalesce(p_website, '')), '');
  v_business_segment text := nullif(btrim(coalesce(p_business_segment, '')), '');
  v_timezone text := btrim(p_timezone);
  v_user_id uuid;
  v_org_id uuid;
  v_owner_org_count integer;
  v_profile wandora.organization_profiles%ROWTYPE;
  v_existing_org_name text;
  v_existing_user_name text;
BEGIN
  IF length(v_subject) NOT BETWEEN 1 AND 255
     OR length(v_org_name) NOT BETWEEN 1 AND 120
     OR v_entity_type NOT IN ('pj', 'pf')
     OR length(v_legal_name) NOT BETWEEN 1 AND 160
     OR (v_entity_type = 'pj' AND v_tax_id !~ '^[0-9A-Z]{12}[0-9]{2}$')
     OR (v_entity_type = 'pf' AND v_tax_id !~ '^[0-9]{11}$')
     OR length(v_responsible_name) NOT BETWEEN 1 AND 120
     OR length(v_contact_email) NOT BETWEEN 3 AND 254
     OR position('@' in v_contact_email) <= 1
     OR length(v_phone) NOT BETWEEN 8 AND 32
     OR v_postal_code !~ '^[0-9]{8}$'
     OR length(v_address_line1) NOT BETWEEN 1 AND 180
     OR length(v_address_number) NOT BETWEEN 1 AND 32
     OR length(v_district) NOT BETWEEN 1 AND 120
     OR length(v_city) NOT BETWEEN 1 AND 120
     OR v_state_code !~ '^[A-Z]{2}$'
     OR length(v_timezone) NOT BETWEEN 1 AND 64
     OR length(btrim(p_correlation_id)) NOT BETWEEN 8 AND 255
  THEN
    RAISE EXCEPTION 'customer_company_onboarding_invalid_input' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('customer-company-onboarding:' || v_subject, 0));

  SELECT ui.user_id
    INTO v_user_id
    FROM wandora.user_identities ui
   WHERE ui.provider = 'supabase'
     AND ui.provider_subject = v_subject
   LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    SELECT count(*), (array_agg(m.organization_id ORDER BY m.organization_id))[1]
      INTO v_owner_org_count, v_org_id
      FROM wandora.memberships m
     WHERE m.user_id = v_user_id
       AND m.status = 'active'
       AND m.role = 'owner';

    IF v_owner_org_count = 1 THEN
      SELECT o.display_name, u.display_name
        INTO v_existing_org_name, v_existing_user_name
        FROM wandora.organizations o
        JOIN wandora.users u ON u.id = v_user_id
       WHERE o.id = v_org_id;

      SELECT p.*
        INTO v_profile
        FROM wandora.organization_profiles p
       WHERE p.organization_id = v_org_id;

      IF FOUND
         AND v_existing_org_name = v_org_name
         AND v_existing_user_name = v_responsible_name
         AND v_profile.entity_type::text = v_entity_type
         AND v_profile.legal_name = v_legal_name
         AND v_profile.tax_id = v_tax_id
         AND v_profile.responsible_name = v_responsible_name
         AND v_profile.contact_email = v_contact_email
         AND v_profile.phone = v_phone
         AND v_profile.postal_code = v_postal_code
         AND v_profile.address_line1 = v_address_line1
         AND v_profile.address_number = v_address_number
         AND v_profile.address_complement IS NOT DISTINCT FROM v_address_complement
         AND v_profile.district = v_district
         AND v_profile.city = v_city
         AND v_profile.state_code = v_state_code
         AND v_profile.website IS NOT DISTINCT FROM v_website
         AND v_profile.business_segment IS NOT DISTINCT FROM v_business_segment
         AND v_profile.timezone = v_timezone
      THEN
        RETURN QUERY SELECT v_org_id, v_user_id;
        RETURN;
      END IF;
    END IF;

    RAISE EXCEPTION 'customer_company_onboarding_identity_already_linked' USING ERRCODE = 'P0001';
  END IF;

  v_user_id := gen_random_uuid();
  v_org_id := gen_random_uuid();

  INSERT INTO wandora.users(id, display_name)
  VALUES (v_user_id, v_responsible_name);

  INSERT INTO wandora.user_identities(user_id, provider, provider_subject)
  VALUES (v_user_id, 'supabase', v_subject);

  INSERT INTO wandora.organizations(id, slug, display_name, status)
  VALUES (
    v_org_id,
    'org-' || replace(v_org_id::text, '-', ''),
    v_org_name,
    'active'
  );

  INSERT INTO wandora.memberships(organization_id, user_id, role, status)
  VALUES (v_org_id, v_user_id, 'owner', 'active');

  INSERT INTO wandora.organization_profiles(
    organization_id,
    entity_type,
    legal_name,
    tax_id,
    responsible_name,
    contact_email,
    phone,
    postal_code,
    address_line1,
    address_number,
    address_complement,
    district,
    city,
    state_code,
    website,
    business_segment,
    timezone
  ) VALUES (
    v_org_id,
    v_entity_type::wandora.organization_entity_type,
    v_legal_name,
    v_tax_id,
    v_responsible_name,
    v_contact_email,
    v_phone,
    v_postal_code,
    v_address_line1,
    v_address_number,
    v_address_complement,
    v_district,
    v_city,
    v_state_code,
    v_website,
    v_business_segment,
    v_timezone
  );

  PERFORM set_config('wandora.organization_id', v_org_id::text, true);
  PERFORM wandora.append_core_audit(
    v_org_id,
    'human'::wandora.audit_actor_type,
    v_user_id::text,
    'organization-profile-created'::wandora.audit_action,
    'organization-profile',
    v_org_id::text,
    btrim(p_correlation_id),
    p_occurred_at
  );

  RETURN QUERY SELECT v_org_id, v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION wandora.update_organization_profile_v1(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_organization_display_name text,
  p_entity_type text,
  p_legal_name text,
  p_tax_id text,
  p_responsible_name text,
  p_contact_email text,
  p_phone text,
  p_postal_code text,
  p_address_line1 text,
  p_address_number text,
  p_address_complement text,
  p_district text,
  p_city text,
  p_state_code text,
  p_website text,
  p_business_segment text,
  p_timezone text,
  p_correlation_id text,
  p_occurred_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, wandora, pg_temp
AS $$
DECLARE
  v_entity_type text := lower(btrim(p_entity_type));
  v_tax_id text := upper(btrim(coalesce(p_tax_id, '')));
  v_postal_code text := btrim(coalesce(p_postal_code, ''));
BEGIN
  IF p_organization_id IS DISTINCT FROM wandora.current_core_organization_id() THEN
    RAISE EXCEPTION 'organization_profile_tenant_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.memberships m
      JOIN wandora.organizations o ON o.id = m.organization_id
     WHERE m.organization_id = p_organization_id
       AND m.user_id = p_actor_user_id
       AND m.status = 'active'
       AND m.role IN ('owner', 'admin')
       AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'organization_profile_mutation_forbidden';
  END IF;

  IF length(btrim(p_organization_display_name)) NOT BETWEEN 1 AND 120
     OR v_entity_type NOT IN ('pj', 'pf')
     OR length(btrim(p_legal_name)) NOT BETWEEN 1 AND 160
     OR (v_entity_type = 'pj' AND v_tax_id !~ '^[0-9A-Z]{12}[0-9]{2}$')
     OR (v_entity_type = 'pf' AND v_tax_id !~ '^[0-9]{11}$')
     OR length(btrim(p_responsible_name)) NOT BETWEEN 1 AND 120
     OR length(lower(btrim(p_contact_email))) NOT BETWEEN 3 AND 254
     OR position('@' in lower(btrim(p_contact_email))) <= 1
     OR length(btrim(p_phone)) NOT BETWEEN 8 AND 32
     OR v_postal_code !~ '^[0-9]{8}$'
     OR length(btrim(p_address_line1)) NOT BETWEEN 1 AND 180
     OR length(btrim(p_address_number)) NOT BETWEEN 1 AND 32
     OR length(btrim(p_district)) NOT BETWEEN 1 AND 120
     OR length(btrim(p_city)) NOT BETWEEN 1 AND 120
     OR upper(btrim(p_state_code)) !~ '^[A-Z]{2}$'
     OR length(btrim(p_timezone)) NOT BETWEEN 1 AND 64
     OR length(btrim(p_correlation_id)) NOT BETWEEN 8 AND 255
  THEN
    RAISE EXCEPTION 'organization_profile_invalid_input' USING ERRCODE = 'P0001';
  END IF;

  UPDATE wandora.organizations
     SET display_name = btrim(p_organization_display_name)
   WHERE id = p_organization_id;

  INSERT INTO wandora.organization_profiles(
    organization_id,
    entity_type,
    legal_name,
    tax_id,
    responsible_name,
    contact_email,
    phone,
    postal_code,
    address_line1,
    address_number,
    address_complement,
    district,
    city,
    state_code,
    website,
    business_segment,
    timezone,
    completed_at
  ) VALUES (
    p_organization_id,
    v_entity_type::wandora.organization_entity_type,
    btrim(p_legal_name),
    v_tax_id,
    btrim(p_responsible_name),
    lower(btrim(p_contact_email)),
    btrim(p_phone),
    v_postal_code,
    btrim(p_address_line1),
    btrim(p_address_number),
    nullif(btrim(coalesce(p_address_complement, '')), ''),
    btrim(p_district),
    btrim(p_city),
    upper(btrim(p_state_code)),
    nullif(btrim(coalesce(p_website, '')), ''),
    nullif(btrim(coalesce(p_business_segment, '')), ''),
    btrim(p_timezone),
    now()
  )
  ON CONFLICT (organization_id) DO UPDATE
    SET entity_type = EXCLUDED.entity_type,
        legal_name = EXCLUDED.legal_name,
        tax_id = EXCLUDED.tax_id,
        responsible_name = EXCLUDED.responsible_name,
        contact_email = EXCLUDED.contact_email,
        phone = EXCLUDED.phone,
        postal_code = EXCLUDED.postal_code,
        address_line1 = EXCLUDED.address_line1,
        address_number = EXCLUDED.address_number,
        address_complement = EXCLUDED.address_complement,
        district = EXCLUDED.district,
        city = EXCLUDED.city,
        state_code = EXCLUDED.state_code,
        website = EXCLUDED.website,
        business_segment = EXCLUDED.business_segment,
        timezone = EXCLUDED.timezone,
        completed_at = EXCLUDED.completed_at;

  PERFORM wandora.append_core_audit(
    p_organization_id,
    'human'::wandora.audit_actor_type,
    p_actor_user_id::text,
    'organization-profile-updated'::wandora.audit_action,
    'organization-profile',
    p_organization_id::text,
    btrim(p_correlation_id),
    p_occurred_at
  );

  RETURN p_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION wandora_private.complete_customer_company_onboarding_v1(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz
) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION wandora.update_organization_profile_v1(
  uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION wandora_private.complete_customer_company_onboarding_v1(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz
) TO wandora_core_runtime;

GRANT EXECUTE ON FUNCTION wandora.update_organization_profile_v1(
  uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz
) TO wandora_core_runtime;

COMMENT ON TABLE wandora.organization_profiles IS
  'Wandora-owned canonical customer company profile. Legal/contact/address data is product state, not grounding, CRM, Paperclip state or runtime memory.';
COMMENT ON COLUMN wandora.organization_profiles.tax_id IS
  'Brazilian CPF or CNPJ normalized without punctuation. CNPJ accepts the Receita Federal 12-character alphanumeric base plus 2 numeric check digits. Access remains behind owner/admin Core contracts; browser roles receive no direct table grant.';
COMMENT ON FUNCTION wandora_private.complete_customer_company_onboarding_v1(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz
) IS
  'Invite-only authenticated first-access bootstrap. Creates only Wandora user identity, organization, owner membership and canonical company profile. It does not create employees, Paperclip state, eligibility, messaging/provider state or outbound effects.';
COMMENT ON FUNCTION wandora.update_organization_profile_v1(
  uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz
) IS
  'Owner/admin-only update of the canonical Wandora company profile under Core tenant scope.';

COMMIT;
