import type { HumanTokenVerifier } from '../human-auth/es256-jwks.js';
import { normalizeCnpj, validCnpj } from './human-company-profile.js';

type FetchLike = typeof fetch;

export class CompanyRegistryLookupError extends Error {
  constructor(readonly code: 'invalid-input' | 'provider-unavailable', message: string) {
    super(message);
    this.name = 'CompanyRegistryLookupError';
  }
}

export type PostalCodeLookup = {
  found: boolean;
  postalCode: string;
  stateCode?: string;
  city?: string;
  district?: string;
  street?: string;
};

export type CompanyRegistryLookup = {
  found: boolean;
  taxId: string;
  legalName?: string;
  displayName?: string;
  registrationStatus?: string;
  postalCode?: string;
  stateCode?: string;
  city?: string;
  district?: string;
  street?: string;
  addressNumber?: string;
  addressComplement?: string;
  phone?: string;
  email?: string;
  businessSegment?: string;
};

export interface CompanyRegistryLookupService {
  lookupPostalCode(authorization: string | undefined, input: string): Promise<PostalCodeLookup>;
  lookupCnpj(authorization: string | undefined, input: string): Promise<CompanyRegistryLookup>;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export class BrasilApiCompanyRegistryLookup implements CompanyRegistryLookupService {
  constructor(
    private readonly verifier: HumanTokenVerifier,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly baseUrl = 'https://brasilapi.com.br/api',
    private readonly requestTimeoutMs = 3_000,
  ) {}

  private async getJson(path: string): Promise<Record<string, unknown> | null> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.baseUrl + path, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Wandora-Company-Registry-Lookup/1.0',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new CompanyRegistryLookupError('provider-unavailable', 'Company registry lookup is temporarily unavailable.');
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new CompanyRegistryLookupError('provider-unavailable', 'Company registry lookup is temporarily unavailable.');
    }
    try {
      const body = record(await response.json());
      if (!body) throw new Error('invalid-json');
      return body;
    } catch {
      throw new CompanyRegistryLookupError('provider-unavailable', 'Company registry lookup returned invalid data.');
    }
  }

  async lookupPostalCode(authorization: string | undefined, input: string): Promise<PostalCodeLookup> {
    await this.verifier.verifyAuthorization(authorization);
    if (!/^[0-9\-\s]+$/.test(input)) {
      throw new CompanyRegistryLookupError('invalid-input', 'CEP has invalid characters.');
    }
    const postalCode = input.replace(/\D/g, '');
    if (!/^\d{8}$/.test(postalCode)) {
      throw new CompanyRegistryLookupError('invalid-input', 'CEP must contain exactly 8 digits.');
    }
    const body = await this.getJson('/cep/v2/' + encodeURIComponent(postalCode));
    if (!body) return { found: false, postalCode };
    const stateCode = text(body.state)?.toUpperCase();
    const city = text(body.city);
    const district = text(body.neighborhood);
    const street = text(body.street);
    return {
      found: true,
      postalCode,
      ...(stateCode ? { stateCode } : {}),
      ...(city ? { city } : {}),
      ...(district ? { district } : {}),
      ...(street ? { street } : {}),
    };
  }

  async lookupCnpj(authorization: string | undefined, input: string): Promise<CompanyRegistryLookup> {
    await this.verifier.verifyAuthorization(authorization);
    if (!validCnpj(input)) {
      throw new CompanyRegistryLookupError('invalid-input', 'CNPJ is syntactically invalid.');
    }
    const taxId = normalizeCnpj(input);
    const body = await this.getJson('/cnpj/v1/' + encodeURIComponent(taxId));
    if (!body) return { found: false, taxId };
    const legalName = text(body.razao_social);
    const displayName = text(body.nome_fantasia);
    const registrationStatus = text(body.descricao_situacao_cadastral);
    const postalCode = text(body.cep)?.replace(/\D/g, '');
    const stateCode = text(body.uf)?.toUpperCase();
    const city = text(body.municipio);
    const district = text(body.bairro);
    const street = text(body.logradouro);
    const addressNumber = text(body.numero);
    const addressComplement = text(body.complemento);
    const phone = text(body.ddd_telefone_1);
    const email = text(body.email)?.toLowerCase();
    const businessSegment = text(body.cnae_fiscal_descricao);
    return {
      found: true,
      taxId,
      ...(legalName ? { legalName } : {}),
      ...(displayName ? { displayName } : {}),
      ...(registrationStatus ? { registrationStatus } : {}),
      ...(postalCode ? { postalCode } : {}),
      ...(stateCode ? { stateCode } : {}),
      ...(city ? { city } : {}),
      ...(district ? { district } : {}),
      ...(street ? { street } : {}),
      ...(addressNumber ? { addressNumber } : {}),
      ...(addressComplement ? { addressComplement } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(businessSegment ? { businessSegment } : {}),
    };
  }
}
