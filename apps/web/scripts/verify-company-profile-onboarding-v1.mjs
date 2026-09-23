import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [gate, page, validation, nginx, company] = await Promise.all([
  readFile(new URL('../src/components/SessionGate.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/CompanyOnboardingPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/companyProfileValidation.ts', import.meta.url), 'utf8'),
  readFile(new URL('../nginx.conf', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/CompanyPage.tsx', import.meta.url), 'utf8'),
]);

assert(gate.includes("return <CompanyOnboardingPage />"), 'unlinked_onboarding_surface_missing');
assert(page.includes('/api/v1/onboarding/company'), 'onboarding_create_bridge_missing');
assert(page.includes('/api/v1/onboarding/lookup/cep/'), 'cep_lookup_missing');
assert(page.includes('/api/v1/onboarding/lookup/cnpj/'), 'cnpj_lookup_missing');
assert(page.includes('O cadastro pode continuar manualmente'), 'lookup_fail_soft_copy_missing');
assert(page.includes('Nenhum funcionário, integração ou envio é criado aqui.'), 'no_side_effect_copy_missing');
assert(validation.includes('charCodeAt(0) - 48'), 'alphanumeric_cnpj_ascii_rule_missing');
assert(validation.includes('[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]'), 'cnpj_first_weights_missing');
assert(validation.includes('[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]'), 'cnpj_second_weights_missing');
assert(nginx.includes('location = /api/v1/onboarding/company {'), 'onboarding_nginx_bridge_missing');
assert(nginx.includes('onboarding/lookup/(cep|cnpj)'), 'lookup_nginx_bridge_missing');
assert(nginx.includes('/profile$') || nginx.includes('profile$'), 'profile_nginx_bridge_missing');
assert(company.includes("queryKey: ['organization-profile'"), 'company_profile_read_missing');
assert(company.includes('maskedTaxId'), 'tax_id_mask_missing');

console.log('WANDORA_WEB_COMPANY_PROFILE_ONBOARDING_V1_OK');
