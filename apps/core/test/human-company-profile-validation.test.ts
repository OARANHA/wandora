import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HumanCompanyProfileError,
  normalizeCnpj,
  normalizeCompanyProfileInput,
  validCnpj,
} from '../src/supervision/human-company-profile.js';

const base = {
  organizationDisplayName: 'Empresa Teste',
  entityType: 'pj' as const,
  legalName: 'Empresa Teste Ltda',
  taxId: '12.ABC.345/01DE-35',
  responsibleName: 'Responsável Teste',
  contactEmail: 'OWNER@EXAMPLE.COM',
  phone: '+55 51 99999-9999',
  postalCode: '90000-000',
  addressLine1: 'Rua Teste',
  addressNumber: '123',
  addressComplement: null,
  district: 'Centro',
  city: 'Porto Alegre',
  stateCode: 'rs',
  website: null,
  businessSegment: null,
  timezone: 'America/Sao_Paulo',
};

test('CNPJ alfanumérico segue os vetores oficiais da Receita', () => {
  assert.equal(normalizeCnpj('12.ABC.345/01DE-35'), '12ABC34501DE35');
  assert.equal(validCnpj('12.ABC.345/01DE-35'), true);
  assert.equal(validCnpj('00.000.000/E08G-12'), true);
  assert.equal(validCnpj('12.ABC.345/01DE-36'), false);
  assert.equal(validCnpj('00.000.000/E08G-13'), false);
  assert.equal(validCnpj('12.ABC.345/01DE-AA'), false);
  assert.equal(validCnpj('12@ABC.345/01DE-35'), false);
});

test('CNPJ numérico legado continua válido', () => {
  assert.equal(validCnpj('11.222.333/0001-81'), true);
  assert.equal(validCnpj('11.222.333/0001-82'), false);
});

test('perfil PJ normaliza CNPJ alfanumérico e CEP localmente', () => {
  const normalized = normalizeCompanyProfileInput(base);
  assert.equal(normalized.taxId, '12ABC34501DE35');
  assert.equal(normalized.postalCode, '90000000');
  assert.equal(normalized.contactEmail, 'owner@example.com');
  assert.equal(normalized.stateCode, 'RS');
});

test('perfil PF valida CPF independentemente de lookup externo', () => {
  const normalized = normalizeCompanyProfileInput({
    ...base,
    entityType: 'pf',
    legalName: 'Maria Silva',
    taxId: '529.982.247-25',
  });
  assert.equal(normalized.taxId, '52998224725');
});

test('caracteres estranhos não são silenciosamente removidos de CPF/CEP', () => {
  assert.throws(
    () => normalizeCompanyProfileInput({ ...base, entityType: 'pf', legalName: 'Pessoa', taxId: '529X98224725' }),
    (error: unknown) => error instanceof HumanCompanyProfileError && error.code === 'invalid-profile',
  );
  assert.throws(
    () => normalizeCompanyProfileInput({ ...base, postalCode: '90X000000' }),
    (error: unknown) => error instanceof HumanCompanyProfileError && error.code === 'invalid-profile',
  );
});

test('CPF/CNPJ sintaticamente inválido falha antes de qualquer lookup', () => {
  assert.throws(
    () => normalizeCompanyProfileInput({ ...base, taxId: '12.ABC.345/01DE-36' }),
    (error: unknown) => error instanceof HumanCompanyProfileError && error.code === 'invalid-profile',
  );
});
