import assert from 'node:assert/strict';
import test from 'node:test';
import { HumanAuthError, type HumanTokenVerifier } from '../src/human-auth/es256-jwks.js';
import {
  BrasilApiCompanyRegistryLookup,
  CompanyRegistryLookupError,
} from '../src/supervision/company-registry-lookup.js';

const verifier = {
  async verifyAuthorization() { return { subject: 'subject-1' }; },
} satisfies HumanTokenVerifier;

test('CEP lookup normaliza e projeta somente contrato provider-neutral', async () => {
  const calls: string[] = [];
  const lookup = new BrasilApiCompanyRegistryLookup(verifier, async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({
      cep: '90000000', state: 'RS', city: 'Porto Alegre',
      neighborhood: 'Centro', street: 'Rua Teste', service: 'provider-detail',
    }), { status: 200 });
  });
  assert.deepEqual(await lookup.lookupPostalCode('Bearer x', '90000-000'), {
    found: true, postalCode: '90000000', stateCode: 'RS',
    city: 'Porto Alegre', district: 'Centro', street: 'Rua Teste',
  });
  assert.equal(calls[0]?.endsWith('/cep/v2/90000000'), true);
});

test('CNPJ lookup aceita o primeiro CNPJ alfanumérico real divulgado pela Receita', async () => {
  let called = '';
  const lookup = new BrasilApiCompanyRegistryLookup(verifier, async (input) => {
    called = String(input);
    return new Response(JSON.stringify({
      razao_social: 'EMPRESA TESTE S.A.', nome_fantasia: 'EMPRESA TESTE',
      descricao_situacao_cadastral: 'ATIVA', cep: '70000000', uf: 'DF',
      municipio: 'BRASILIA', bairro: 'CENTRO', logradouro: 'RUA TESTE',
      numero: '10', cnae_fiscal_descricao: 'Serviços',
    }), { status: 200 });
  });
  const result = await lookup.lookupCnpj('Bearer x', '00.000.000/E08G-12');
  assert.equal(called.endsWith('/cnpj/v1/00000000E08G12'), true);
  assert.equal(result.taxId, '00000000E08G12');
  assert.equal(result.legalName, 'EMPRESA TESTE S.A.');
});

test('autenticação acontece antes da validação local e antes do provider', async () => {
  let providerCalls = 0;
  const rejectingVerifier = {
    async verifyAuthorization() {
      throw new HumanAuthError('missing-token', 'missing');
    },
  } satisfies HumanTokenVerifier;
  const lookup = new BrasilApiCompanyRegistryLookup(rejectingVerifier, async () => {
    providerCalls += 1;
    return new Response('{}', { status: 200 });
  });
  await assert.rejects(
    lookup.lookupCnpj(undefined, 'not-a-cnpj'),
    (error: unknown) => error instanceof HumanAuthError && error.code === 'missing-token',
  );
  assert.equal(providerCalls, 0);
});

test('input inválido falha localmente sem chamar BrasilAPI', async () => {
  let calls = 0;
  const lookup = new BrasilApiCompanyRegistryLookup(verifier, async () => {
    calls += 1;
    return new Response('{}', { status: 200 });
  });
  await assert.rejects(
    lookup.lookupCnpj('Bearer x', '12@ABC.345/01DE-35'),
    (error: unknown) => error instanceof CompanyRegistryLookupError && error.code === 'invalid-input',
  );
  await assert.rejects(
    lookup.lookupPostalCode('Bearer x', '90X000000'),
    (error: unknown) => error instanceof CompanyRegistryLookupError && error.code === 'invalid-input',
  );
  assert.equal(calls, 0);
});

test('falha do provider é distinta da validação local', async () => {
  const lookup = new BrasilApiCompanyRegistryLookup(verifier, async () => new Response('{}', { status: 429 }));
  await assert.rejects(
    lookup.lookupCnpj('Bearer x', '11.222.333/0001-81'),
    (error: unknown) => error instanceof CompanyRegistryLookupError && error.code === 'provider-unavailable',
  );
});
