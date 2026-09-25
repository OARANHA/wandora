import {
  BUSINESS_CAPABILITIES,
  type BusinessCapability,
} from '../semantic-routing/contracts.js';

export type IntegrationOperationalHealth =
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unknown';

export type IntegrationOperationalReadiness =
  | 'ready'
  | 'not_ready'
  | 'unknown';

export type IntegrationCapabilityPlaneEvidence = {
  integrationKind: 'business_system';
  displayName: string;
  connection: {
    health: IntegrationOperationalHealth;
    readiness: IntegrationOperationalReadiness;
  };
  supportedCapabilities: readonly unknown[];
  organizationEnabledCapabilities: readonly unknown[];
};

export type OrganizationIntegrationCapabilityProjection = {
  integrationKind: 'business_system';
  displayName: string;
  connection: {
    health: IntegrationOperationalHealth;
    readiness: IntegrationOperationalReadiness;
  };
  supportedCapabilities: BusinessCapability[];
  availableCapabilities: BusinessCapability[];
};

const BUSINESS_CAPABILITY_SET = new Set<string>(BUSINESS_CAPABILITIES);

function boundedDisplayName(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 160) {
    throw new Error('integration_capability_display_name_invalid');
  }
  return normalized;
}

function canonicalCapabilities(values: readonly unknown[]): BusinessCapability[] {
  const selected = new Set<BusinessCapability>();
  for (const value of values) {
    if (typeof value !== 'string' || !BUSINESS_CAPABILITY_SET.has(value)) continue;
    selected.add(value as BusinessCapability);
  }
  return BUSINESS_CAPABILITIES.filter((capability) => selected.has(capability));
}

export function projectOrganizationIntegrationCapabilities(
  evidence: IntegrationCapabilityPlaneEvidence,
): OrganizationIntegrationCapabilityProjection {
  const supportedCapabilities = canonicalCapabilities(evidence.supportedCapabilities);
  const enabled = new Set(canonicalCapabilities(evidence.organizationEnabledCapabilities));
  const organizationEnabled = supportedCapabilities.filter((capability) => enabled.has(capability));

  return {
    integrationKind: 'business_system',
    displayName: boundedDisplayName(evidence.displayName),
    connection: {
      health: evidence.connection.health,
      readiness: evidence.connection.readiness,
    },
    supportedCapabilities,
    availableCapabilities: evidence.connection.readiness === 'ready'
      ? organizationEnabled
      : [],
  };
}

export function projectFastReadCapabilities(
  integration: OrganizationIntegrationCapabilityProjection,
  runtimeAuthorizedCapabilities: readonly unknown[],
): BusinessCapability[] {
  if (integration.connection.readiness !== 'ready') return [];

  const authorized = new Set(canonicalCapabilities(runtimeAuthorizedCapabilities));
  return integration.availableCapabilities.filter((capability) => authorized.has(capability));
}
