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

export type CatalogEmployeeWorkProviderInput = {
  providerCompanyRef: string;
  catalogKey: string;
  workId: string;
  title: string;
  description: string;
};

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
  ensureCatalogEmployeeWork?(input: CatalogEmployeeWorkProviderInput): Promise<{
    providerAgentRef: string;
  }>;
};

export type CatalogEmployeeResult = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
};

export type DigitalEmployeeWorkState =
  | 'submitting'
  | 'submitted'
  | 'uncertain'
  | 'executing'
  | 'review-ready'
  | 'execution-uncertain';

export type DigitalEmployeeWorkResult = {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  state: DigitalEmployeeWorkState;
  result: {
    summary: string;
    model: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type PreparedDigitalEmployeeWorkExecution =
  | { kind: 'execute' }
  | {
      kind: 'cached';
      executionId: string;
      model: string;
      summary: string;
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

export type DigitalEmployeeWorkErrorCode =
  | 'employee-work-unavailable'
  | 'provider-work-unavailable'
  | 'provider-work-uncertain'
  | 'work-execution-unavailable'
  | 'work-execution-uncertain'
  | 'runtime-not-ready';

export class DigitalEmployeeWorkError extends Error {
  constructor(readonly code: DigitalEmployeeWorkErrorCode, message: string) {
    super(message);
    this.name = 'DigitalEmployeeWorkError';
  }
}
