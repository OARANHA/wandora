import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createHumanSupervisionHandler,
  isHumanSupervisionPath,
} from '../src/runtime/human-supervision.js';
import {
  CompanyRegistryLookupError,
  type CompanyRegistryLookupService,
} from '../src/supervision/company-registry-lookup.js';
import type { HumanSupervisionReadService } from '../src/supervision/human-read.js';

const readService = {} as HumanSupervisionReadService;

function handler(lookup?: CompanyRegistryLookupService) {
  return createHumanSupervisionHandler(
    readService,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    lookup,
  );
}

test('onboarding lookup paths are Human API paths but remain absent without enabled lookup service', async () => {
  assert.equal(isHumanSupervisionPath('/api/v1/onboarding/lookup/cep/90000000'), true);
  assert.equal(isHumanSupervisionPath('/api/v1/onboarding/lookup/cnpj/00000000E08G12'), true);
  assert.equal(isHumanSupervisionPath('/api/v1/onboarding/lookup/cep/'), false);

  const response = await handler()({
    method: 'GET',
    pathname: '/api/v1/onboarding/lookup/cep/90000000',
    authorization: 'Bearer fixture',
  });
  assert.deepEqual(response, { status: 404, body: { error: 'not-found' } });
});

test('CEP lookup forwards only authorization/input and returns provider-neutral result', async () => {
  const calls: unknown[] = [];
  const lookup = {
    async lookupPostalCode(authorization: string | undefined, input: string) {
      calls.push({ authorization, input });
      return {
        found: true,
        postalCode: '90000000',
        stateCode: 'RS',
        city: 'Porto Alegre',
        district: 'Centro',
        street: 'Rua Teste',
      };
    },
    async lookupCnpj() {
      throw new Error('must not run');
    },
  } satisfies CompanyRegistryLookupService;

  const response = await handler(lookup)({
    method: 'GET',
    pathname: '/api/v1/onboarding/lookup/cep/90000000',
    authorization: 'Bearer fixture',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ authorization: 'Bearer fixture', input: '90000000' }]);
  assert.deepEqual(response.body, {
    found: true,
    postalCode: '90000000',
    stateCode: 'RS',
    city: 'Porto Alegre',
    district: 'Centro',
    street: 'Rua Teste',
  });
});

test('alphanumeric CNPJ lookup reaches the lookup contract unchanged', async () => {
  const calls: unknown[] = [];
  const lookup = {
    async lookupPostalCode() {
      throw new Error('must not run');
    },
    async lookupCnpj(authorization: string | undefined, input: string) {
      calls.push({ authorization, input });
      return { found: false, taxId: '00000000E08G12' };
    },
  } satisfies CompanyRegistryLookupService;

  const response = await handler(lookup)({
    method: 'GET',
    pathname: '/api/v1/onboarding/lookup/cnpj/00000000E08G12',
    authorization: 'Bearer fixture',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ authorization: 'Bearer fixture', input: '00000000E08G12' }]);
  assert.deepEqual(response.body, { found: false, taxId: '00000000E08G12' });
});

test('lookup routes reject non-GET before provider call', async () => {
  let calls = 0;
  const lookup = {
    async lookupPostalCode() {
      calls += 1;
      return { found: false, postalCode: '90000000' };
    },
    async lookupCnpj() {
      calls += 1;
      return { found: false, taxId: '00000000E08G12' };
    },
  } satisfies CompanyRegistryLookupService;

  const response = await handler(lookup)({
    method: 'POST',
    pathname: '/api/v1/onboarding/lookup/cep/90000000',
    authorization: 'Bearer fixture',
  });
  assert.deepEqual(response, { status: 405, body: { error: 'method-not-allowed' } });
  assert.equal(calls, 0);
});

test('lookup input errors remain distinct from provider unavailability', async () => {
  const invalid = {
    async lookupPostalCode() {
      throw new CompanyRegistryLookupError('invalid-input', 'bad cep');
    },
    async lookupCnpj() {
      throw new CompanyRegistryLookupError('invalid-input', 'bad cnpj');
    },
  } satisfies CompanyRegistryLookupService;
  const unavailable = {
    async lookupPostalCode() {
      throw new CompanyRegistryLookupError('provider-unavailable', 'offline');
    },
    async lookupCnpj() {
      throw new CompanyRegistryLookupError('provider-unavailable', 'offline');
    },
  } satisfies CompanyRegistryLookupService;

  assert.deepEqual(
    await handler(invalid)({
      method: 'GET',
      pathname: '/api/v1/onboarding/lookup/cep/90000000',
      authorization: 'Bearer fixture',
    }),
    { status: 400, body: { error: 'invalid-lookup-input' } },
  );

  assert.deepEqual(
    await handler(unavailable)({
      method: 'GET',
      pathname: '/api/v1/onboarding/lookup/cnpj/00000000E08G12',
      authorization: 'Bearer fixture',
    }),
    { status: 503, body: { error: 'company-registry-provider-unavailable' } },
  );
});
