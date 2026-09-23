BEGIN;

DO $$
DECLARE
  v_org uuid;
  v_user uuid;
  v_retry_org uuid;
  v_retry_user uuid;
BEGIN
  IF to_regclass('wandora.organization_profiles') IS NULL THEN
    RAISE EXCEPTION 'organization_profiles_missing';
  END IF;

  SELECT organization_id, user_id
    INTO v_org, v_user
    FROM wandora_private.complete_customer_company_onboarding_v1(
      '00000000-0000-4000-8000-000000000019',
      'Empresa Perfil Teste',
      'pj',
      'Empresa Perfil Teste Ltda',
      '12ABC34501DE35',
      'Responsável Teste',
      'owner-profile-test@example.invalid',
      '+5551999999999',
      '90000000',
      'Rua Teste',
      '123',
      NULL,
      'Centro',
      'Porto Alegre',
      'RS',
      'https://example.invalid',
      'Saúde',
      'America/Sao_Paulo',
      'verify-company-profile-onboarding-v1',
      now()
    );

  IF NOT EXISTS (
    SELECT 1 FROM wandora.memberships
     WHERE organization_id = v_org
       AND user_id = v_user
       AND role = 'owner'
       AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'owner_membership_missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM wandora.digital_employees WHERE organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'onboarding_created_employee';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM wandora.organization_profiles
     WHERE organization_id = v_org
       AND entity_type = 'pj'
       AND tax_id = '12ABC34501DE35'
       AND responsible_name = 'Responsável Teste'
       AND city = 'Porto Alegre'
       AND state_code = 'RS'
  ) THEN
    RAISE EXCEPTION 'profile_not_persisted';
  END IF;

  SELECT organization_id, user_id
    INTO v_retry_org, v_retry_user
    FROM wandora_private.complete_customer_company_onboarding_v1(
      '00000000-0000-4000-8000-000000000019',
      'Empresa Perfil Teste',
      'pj',
      'Empresa Perfil Teste Ltda',
      '12ABC34501DE35',
      'Responsável Teste',
      'owner-profile-test@example.invalid',
      '+5551999999999',
      '90000000',
      'Rua Teste',
      '123',
      NULL,
      'Centro',
      'Porto Alegre',
      'RS',
      'https://example.invalid',
      'Saúde',
      'America/Sao_Paulo',
      'verify-company-profile-onboarding-v1-retry',
      now()
    );

  IF v_retry_org IS DISTINCT FROM v_org OR v_retry_user IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'onboarding_retry_not_idempotent';
  END IF;

  PERFORM set_config('wandora.organization_id', v_org::text, true);
  PERFORM wandora.update_organization_profile_v1(
    v_org,
    v_user,
    'Empresa Perfil Atualizada',
    'pj',
    'Empresa Perfil Teste Ltda',
    '12ABC34501DE35',
    'Responsável Teste',
    'owner-profile-test@example.invalid',
    '+5551999999999',
    '90000000',
    'Avenida Teste',
    '456',
    'Sala 2',
    'Centro',
    'Porto Alegre',
    'RS',
    'https://example.invalid',
    'Saúde',
    'America/Sao_Paulo',
    'verify-company-profile-update-v1',
    now()
  );

  IF NOT EXISTS (
    SELECT 1
      FROM wandora.organization_profiles p
      JOIN wandora.organizations o ON o.id = p.organization_id
     WHERE p.organization_id = v_org
       AND o.display_name = 'Empresa Perfil Atualizada'
       AND p.address_line1 = 'Avenida Teste'
       AND p.address_number = '456'
       AND p.address_complement = 'Sala 2'
  ) THEN
    RAISE EXCEPTION 'profile_update_failed';
  END IF;

  BEGIN
    PERFORM wandora_private.complete_customer_company_onboarding_v1(
      '00000000-0000-4000-8000-000000000019',
      'Outra Empresa',
      'pj',
      'Outra Empresa Ltda',
      '12ABC34501DE35',
      'Responsável Teste',
      'owner-profile-test@example.invalid',
      '+5551999999999',
      '90000000',
      'Rua Teste',
      '123',
      NULL,
      'Centro',
      'Porto Alegre',
      'RS',
      NULL,
      NULL,
      'America/Sao_Paulo',
      'verify-company-profile-conflict-v1',
      now()
    );
    RAISE EXCEPTION 'changed_retry_should_fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%customer_company_onboarding_identity_already_linked%' THEN
      RAISE;
    END IF;
  END;
END
$$;

SELECT 'CUSTOMER_COMPANY_PROFILE_ONBOARDING_V1_OK';

ROLLBACK;
