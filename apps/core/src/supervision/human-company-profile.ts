import type { Pool, PoolClient } from 'pg';
import type { HumanTokenVerifier } from '../human-auth/es256-jwks.js';
import type { HumanSupervisionReadService } from './human-read.js';

export type CompanyEntityType = 'pj' | 'pf';

export type CompanyProfileInput = {
  organizationDisplayName: string;
  entityType: CompanyEntityType;
  legalName: string;
  taxId: string;
  responsibleName: string;
  contactEmail: string;
  phone: string;
  postalCode: string;
  addressLine1: string;
  addressNumber: string;
  addressComplement: string | null;
  district: string;
  city: string;
  stateCode: string;
  website: string | null;
  businessSegment: string | null;
  timezone: string;
};

export type CompanyProfileView = CompanyProfileInput & {
  organizationId: string;
  completedAt: string;
  updatedAt: string;
};

export class HumanCompanyProfileError extends Error {
  constructor(
    readonly code: 'invalid-profile' | 'forbidden' | 'already-linked' | 'profile-unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'HumanCompanyProfileError';
  }
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeCnpj(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function repeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

export function validCpf(value: string): boolean {
  if (!/^[0-9.\-\s]+$/.test(value)) return false;
  const digits = onlyDigits(value);
  if (digits.length !== 11 || repeatedDigits(digits)) return false;
  const calculate = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(digits[i]) * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10]);
}

export function validCnpj(value: string): boolean {
  if (!/^[0-9A-Za-z.\/\-\s]+$/.test(value)) return false;
  const normalized = normalizeCnpj(value);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(normalized)) return false;
  if (/^(\d)\1{13}$/.test(normalized)) return false;

  const valueForDv = (character: string): number => character.charCodeAt(0) - 48;
  const calculate = (base: string, weights: readonly number[]): number => {
    const sum = [...base].reduce(
      (total, character, index) => total + valueForDv(character) * (weights[index] ?? 0),
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = calculate(normalized.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (first !== Number(normalized[12])) return false;
  const second = calculate(
    normalized.slice(0, 12) + String(first),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return second === Number(normalized[13]);
}

function optional(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  if (trimmed.length > max) throw new HumanCompanyProfileError('invalid-profile', 'Company profile field is too long.');
  return trimmed;
}

function required(value: string, min: number, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HumanCompanyProfileError('invalid-profile', 'Company profile field is invalid.');
  }
  return trimmed;
}

export function normalizeCompanyProfileInput(input: CompanyProfileInput): CompanyProfileInput {
  const entityType = input.entityType;
  if (entityType !== 'pj' && entityType !== 'pf') {
    throw new HumanCompanyProfileError('invalid-profile', 'Company entity type is invalid.');
  }

  if ((entityType === 'pf' && !validCpf(input.taxId)) || (entityType === 'pj' && !validCnpj(input.taxId))) {
    throw new HumanCompanyProfileError('invalid-profile', 'CPF/CNPJ is invalid.');
  }
  const taxId = entityType === 'pf' ? onlyDigits(input.taxId) : normalizeCnpj(input.taxId);

  const email = required(input.contactEmail, 3, 254).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HumanCompanyProfileError('invalid-profile', 'Contact e-mail is invalid.');
  }

  if (!/^[0-9\-\s]+$/.test(input.postalCode)) {
    throw new HumanCompanyProfileError('invalid-profile', 'Postal code is invalid.');
  }
  const postalCode = onlyDigits(input.postalCode);
  if (!/^\d{8}$/.test(postalCode)) {
    throw new HumanCompanyProfileError('invalid-profile', 'Postal code is invalid.');
  }

  const stateCode = required(input.stateCode, 2, 2).toUpperCase();
  const brazilStates = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);
  if (!brazilStates.has(stateCode)) {
    throw new HumanCompanyProfileError('invalid-profile', 'State code is invalid.');
  }

  const timezone = required(input.timezone, 1, 64);
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+$/.test(timezone)) {
    throw new HumanCompanyProfileError('invalid-profile', 'Timezone is invalid.');
  }

  return {
    organizationDisplayName: required(input.organizationDisplayName, 1, 120),
    entityType,
    legalName: required(input.legalName, 1, 160),
    taxId,
    responsibleName: required(input.responsibleName, 1, 120),
    contactEmail: email,
    phone: required(input.phone, 8, 32),
    postalCode,
    addressLine1: required(input.addressLine1, 1, 180),
    addressNumber: required(input.addressNumber, 1, 32),
    addressComplement: optional(input.addressComplement, 120),
    district: required(input.district, 1, 120),
    city: required(input.city, 1, 120),
    stateCode,
    website: optional(input.website, 512),
    businessSegment: optional(input.businessSegment, 120),
    timezone,
  };
}

type ProfileRow = {
  organization_id: string;
  organization_display_name: string;
  entity_type: CompanyEntityType;
  legal_name: string;
  tax_id: string;
  responsible_name: string;
  contact_email: string;
  phone: string;
  postal_code: string;
  address_line1: string;
  address_number: string;
  address_complement: string | null;
  district: string;
  city: string;
  state_code: string;
  website: string | null;
  business_segment: string | null;
  timezone: string;
  completed_at: Date;
  updated_at: Date;
};

function mapProfile(row: ProfileRow): CompanyProfileView {
  return {
    organizationId: row.organization_id,
    organizationDisplayName: row.organization_display_name,
    entityType: row.entity_type,
    legalName: row.legal_name,
    taxId: row.tax_id,
    responsibleName: row.responsible_name,
    contactEmail: row.contact_email,
    phone: row.phone,
    postalCode: row.postal_code,
    addressLine1: row.address_line1,
    addressNumber: row.address_number,
    addressComplement: row.address_complement,
    district: row.district,
    city: row.city,
    stateCode: row.state_code,
    website: row.website,
    businessSegment: row.business_segment,
    timezone: row.timezone,
    completedAt: row.completed_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class HumanCompanyProfileService {
  constructor(
    private readonly pool: Pool,
    private readonly verifier: HumanTokenVerifier,
    private readonly humanRead: HumanSupervisionReadService,
  ) {}

  private dbError(error: unknown): HumanCompanyProfileError {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('customer_company_onboarding_identity_already_linked')) {
      return new HumanCompanyProfileError(
        'already-linked',
        'Authenticated identity is already linked to a different Wandora state.',
      );
    }
    if (
      message.includes('customer_company_onboarding_invalid_input')
      || message.includes('organization_profile_invalid_input')
    ) {
      return new HumanCompanyProfileError('invalid-profile', 'Company profile is invalid.');
    }
    if (message.includes('organization_profile_mutation_forbidden')) {
      return new HumanCompanyProfileError('forbidden', 'Only owner/admin may update the company profile.');
    }
    return new HumanCompanyProfileError('profile-unavailable', 'Company profile operation is unavailable.');
  }

  private async scoped<T>(organizationId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      await client.query(`SELECT set_config('wandora.organization_id', $1, true)`, [organizationId]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private requireManager(
    session: Awaited<ReturnType<HumanSupervisionReadService['getSessionContext']>>,
    organizationId: string,
  ): { userId: string } {
    const membership = session.organizations.find((organization) => organization.id === organizationId);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new HumanCompanyProfileError('forbidden', 'Only owner/admin may manage the company profile.');
    }
    return { userId: session.user.id };
  }

  async completeOnboarding(input: {
    authorization: string | undefined;
    correlationId: string;
    profile: CompanyProfileInput;
  }): Promise<{ organizationId: string; userId: string }> {
    const identity = await this.verifier.verifyAuthorization(input.authorization);
    const profile = normalizeCompanyProfileInput(input.profile);
    if (!identity.email || profile.contactEmail !== identity.email) {
      throw new HumanCompanyProfileError(
        'invalid-profile',
        'The first company contact e-mail must match the authenticated account.',
      );
    }
    try {
      const result = await this.pool.query<{ organization_id: string; user_id: string }>(
        `SELECT organization_id::text AS organization_id, user_id::text AS user_id
           FROM wandora_private.complete_customer_company_onboarding_v1(
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now()
           )`,
        [
          identity.subject,
          profile.organizationDisplayName,
          profile.entityType,
          profile.legalName,
          profile.taxId,
          profile.responsibleName,
          profile.contactEmail,
          profile.phone,
          profile.postalCode,
          profile.addressLine1,
          profile.addressNumber,
          profile.addressComplement,
          profile.district,
          profile.city,
          profile.stateCode,
          profile.website,
          profile.businessSegment,
          profile.timezone,
          input.correlationId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new HumanCompanyProfileError('profile-unavailable', 'Company onboarding returned no result.');
      return { organizationId: row.organization_id, userId: row.user_id };
    } catch (error) {
      if (error instanceof HumanCompanyProfileError) throw error;
      throw this.dbError(error);
    }
  }

  async getProfile(
    authorization: string | undefined,
    organizationId: string,
  ): Promise<CompanyProfileView | null> {
    const session = await this.humanRead.getSessionContext(authorization);
    this.requireManager(session, organizationId);

    return this.scoped(organizationId, async (client) => {
      const result = await client.query<ProfileRow>(
        `SELECT p.organization_id::text AS organization_id,
                o.display_name AS organization_display_name,
                p.entity_type::text AS entity_type,
                p.legal_name, p.tax_id, p.responsible_name, p.contact_email, p.phone,
                p.postal_code, p.address_line1, p.address_number, p.address_complement,
                p.district, p.city, p.state_code, p.website, p.business_segment,
                p.timezone, p.completed_at, p.updated_at
           FROM wandora.organization_profiles p
           JOIN wandora.organizations o ON o.id = p.organization_id
          WHERE p.organization_id = $1`,
        [organizationId],
      );
      return result.rows[0] ? mapProfile(result.rows[0]) : null;
    });
  }

  async updateProfile(input: {
    authorization: string | undefined;
    organizationId: string;
    correlationId: string;
    profile: CompanyProfileInput;
  }): Promise<CompanyProfileView> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const { userId } = this.requireManager(session, input.organizationId);
    const profile = normalizeCompanyProfileInput(input.profile);

    try {
      return await this.scoped(input.organizationId, async (client) => {
        await client.query(
          `SELECT wandora.update_organization_profile_v1(
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now()
           )`,
          [
            input.organizationId,
            userId,
            profile.organizationDisplayName,
            profile.entityType,
            profile.legalName,
            profile.taxId,
            profile.responsibleName,
            profile.contactEmail,
            profile.phone,
            profile.postalCode,
            profile.addressLine1,
            profile.addressNumber,
            profile.addressComplement,
            profile.district,
            profile.city,
            profile.stateCode,
            profile.website,
            profile.businessSegment,
            profile.timezone,
            input.correlationId,
          ],
        );
        const result = await client.query<ProfileRow>(
          `SELECT p.organization_id::text AS organization_id,
                  o.display_name AS organization_display_name,
                  p.entity_type::text AS entity_type,
                  p.legal_name, p.tax_id, p.responsible_name, p.contact_email, p.phone,
                  p.postal_code, p.address_line1, p.address_number, p.address_complement,
                  p.district, p.city, p.state_code, p.website, p.business_segment,
                  p.timezone, p.completed_at, p.updated_at
             FROM wandora.organization_profiles p
             JOIN wandora.organizations o ON o.id = p.organization_id
            WHERE p.organization_id = $1`,
          [input.organizationId],
        );
        const row = result.rows[0];
        if (!row) throw new HumanCompanyProfileError('profile-unavailable', 'Company profile disappeared after update.');
        return mapProfile(row);
      });
    } catch (error) {
      if (error instanceof HumanCompanyProfileError) throw error;
      throw this.dbError(error);
    }
  }
}
