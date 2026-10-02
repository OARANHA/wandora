export const CATALOG_EMPLOYEE_TEMPLATE = {
  key: 'ana-commercial-v1',
  displayName: 'Ana',
  role: 'commercial-assistant',
  title: 'Assistente Comercial Digital',
  capabilities: 'Atendimento comercial supervisionado pela Wandora.',
  adapterType: 'wandora_mastra',
  initialStatus: 'paused',
  budgetMonthlyCents: 0,
} as const;

export const CATALOG_KEY = CATALOG_EMPLOYEE_TEMPLATE.key;
export const EXECUTION_ADAPTER_TYPE = CATALOG_EMPLOYEE_TEMPLATE.adapterType;
