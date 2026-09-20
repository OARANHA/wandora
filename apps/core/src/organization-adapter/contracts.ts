export type CatalogEmployeeDefinition = {
  key: string;
  displayName: string;
  role: 'commercial-assistant';
  autonomy: 'supervised';
};

export const WANDORA_CATALOG_V1: ReadonlyMap<string, CatalogEmployeeDefinition> = new Map([
  ['ana-commercial-v1', {
    key: 'ana-commercial-v1',
    displayName: 'Ana',
    role: 'commercial-assistant',
    autonomy: 'supervised',
  }],
]);

export type OrganizationAdapterProvider = {
  readonly provider: 'paperclip';
  reconcileCatalogEmployee(input: {
    providerCompanyRef: string;
    catalogKey: string;
  }): Promise<{ providerAgentRef: string }>;
  activateCatalogEmployee?(input: {
    providerCompanyRef: string;
    catalogKey: string;
  }): Promise<{ providerAgentRef: string }>;
};

export type CatalogEmployeeResult = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
};

export type OrganizationAdapterConflictCode =
  | 'idempotency-conflict'
  | 'catalog-conflict'
  | 'state-inconsistent';

export class OrganizationAdapterConflictError extends Error {
  constructor(readonly code: OrganizationAdapterConflictCode, message: string) {
    super(message);
    this.name = 'OrganizationAdapterConflictError';
  }
}

export type OrganizationAdapterUnavailableCode =
  | 'catalog-employee-unknown'
  | 'catalog-hire-not-eligible'
  | 'provider-not-configured'
  | 'provider-operation-uncertain';

export class OrganizationAdapterUnavailableError extends Error {
  constructor(readonly code: OrganizationAdapterUnavailableCode, message: string) {
    super(message);
    this.name = 'OrganizationAdapterUnavailableError';
  }
}

export type DigitalEmployeeActivationErrorCode =
  | 'employee-not-activatable'
  | 'provider-activation-unavailable'
  | 'provider-activation-uncertain'
  | 'runtime-not-ready';

export class DigitalEmployeeActivationError extends Error {
  constructor(readonly code: DigitalEmployeeActivationErrorCode, message: string) {
    super(message);
    this.name = 'DigitalEmployeeActivationError';
  }
}
