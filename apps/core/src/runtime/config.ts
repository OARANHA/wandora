import { readFile, stat } from 'node:fs/promises';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RuntimeMode = 'standby' | 'database';
export type RuntimeAgentMode = 'disabled' | 'mastra-deterministic';

export type RuntimeDatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: 'wandora_core_runtime';
  password: string;
};

export type RuntimeGatewayIngressConfig = {
  secret: string;
};

export type RuntimeAgentConfig = {
  mode: 'mastra-deterministic';
};

export type RuntimeHumanApiConfig = {
  jwksUrl: string;
  issuer: string;
  audience: string;
};

export type RuntimeHumanSendProposalConfig = {
  connectionId: string;
  gatewayUrl: string;
  gatewaySecret: string;
};

export type RuntimeOrganizationAdapterConfig = {
  webhookUrl: string;
  secretDirectory: string;
};

export type RuntimeConfig = {
  port: number;
  mode: RuntimeMode;
  database?: RuntimeDatabaseConfig;
  gatewayIngress?: RuntimeGatewayIngressConfig;
  agentRuntime?: RuntimeAgentConfig;
  humanApi?: RuntimeHumanApiConfig;
  humanSendProposal?: RuntimeHumanSendProposalConfig;
  organizationAdapter?: RuntimeOrganizationAdapterConfig;
};

const parsePort = (value: string | undefined, fallback: number, name: string): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }
  return parsed;
};

const required = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required in database mode.`);
  return value;
};

const parseEnabled = (value: string | undefined, name: string): boolean => {
  const normalized = (value ?? 'false').trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`${name} must be true or false.`);
};

const parseAgentRuntimeMode = (value: string | undefined): RuntimeAgentMode => {
  const normalized = (value ?? 'disabled').trim().toLowerCase();
  if (normalized === 'disabled' || normalized === 'mastra-deterministic') return normalized;
  throw new Error('WANDORA_AGENT_RUNTIME_MODE must be disabled or mastra-deterministic.');
};

const canonicalUuid = (value: string, name: string): string => {
  if (!UUID_RE.test(value)) throw new Error(`${name} must be a canonical UUID.`);
  return value.toLowerCase();
};

const validateMessagingGatewayOutboundUrl = (value: string): string => {
  const url = new URL(value);
  if (
    url.protocol !== 'http:'
    || url.hostname !== 'wandora-messaging-gateway'
    || url.port !== '8787'
    || url.pathname !== '/internal/v1/core/outbound/text'
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error(
      'WANDORA_MESSAGING_GATEWAY_OUTBOUND_URL must target the private canonical Messaging Gateway route.',
    );
  }
  return url.toString();
};

const validateOrganizationAdapterWebhookUrl = (value: string): string => {
  const url = new URL(value);
  if (
    url.protocol !== 'http:'
    || url.hostname !== 'wandora-paperclip'
    || url.port !== '3100'
    || url.pathname !== '/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile'
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error(
      'WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL must target the private canonical Paperclip plugin route.',
    );
  }
  return url.toString();
};

export async function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): Promise<RuntimeConfig> {
  const port = parsePort(env.PORT, 8788, 'PORT');
  const mode = (env.WANDORA_CORE_MODE ?? 'standby').trim();
  if (mode !== 'standby' && mode !== 'database') {
    throw new Error('WANDORA_CORE_MODE must be standby or database.');
  }

  const gatewayIngressEnabled = parseEnabled(
    env.WANDORA_GATEWAY_INGRESS_ENABLED,
    'WANDORA_GATEWAY_INGRESS_ENABLED',
  );
  const humanApiEnabled = parseEnabled(
    env.WANDORA_HUMAN_API_ENABLED,
    'WANDORA_HUMAN_API_ENABLED',
  );
  const humanSendProposalEnabled = parseEnabled(
    env.WANDORA_HUMAN_SEND_PROPOSAL_ENABLED,
    'WANDORA_HUMAN_SEND_PROPOSAL_ENABLED',
  );
  const organizationAdapterEnabled = parseEnabled(
    env.WANDORA_ORGANIZATION_ADAPTER_ENABLED,
    'WANDORA_ORGANIZATION_ADAPTER_ENABLED',
  );
  const agentRuntimeMode = parseAgentRuntimeMode(env.WANDORA_AGENT_RUNTIME_MODE);

  if (mode === 'standby') {
    if (gatewayIngressEnabled) {
      throw new Error('Gateway ingress cannot be enabled while Wandora Core is in standby mode.');
    }
    if (humanApiEnabled) {
      throw new Error('Human API cannot be enabled while Wandora Core is in standby mode.');
    }
    if (humanSendProposalEnabled) {
      throw new Error('Human Send Proposal cannot be enabled while Wandora Core is in standby mode.');
    }
    if (organizationAdapterEnabled) {
      throw new Error('Organization Adapter cannot be enabled while Wandora Core is in standby mode.');
    }
    if (agentRuntimeMode !== 'disabled') {
      throw new Error('Agent Runtime cannot be enabled while Wandora Core is in standby mode.');
    }
    return { port, mode };
  }

  if (agentRuntimeMode !== 'disabled' && !gatewayIngressEnabled) {
    throw new Error('Deterministic Agent Runtime requires supervised Gateway ingress to be enabled.');
  }
  if (humanSendProposalEnabled && !humanApiEnabled) {
    throw new Error('Human Send Proposal requires the Human API to be enabled.');
  }

  const user = (env.WANDORA_CORE_DB_USER ?? 'wandora_core_runtime').trim();
  if (user !== 'wandora_core_runtime') {
    throw new Error('WANDORA_CORE_DB_USER must be wandora_core_runtime.');
  }

  const passwordFile = required(env, 'WANDORA_CORE_DB_PASSWORD_FILE');
  const password = (await readFile(passwordFile, 'utf8')).trim();
  if (!password) throw new Error('Wandora Core database password file is empty.');

  let gatewayIngress: RuntimeGatewayIngressConfig | undefined;
  if (gatewayIngressEnabled) {
    const secretFile = required(env, 'WANDORA_GATEWAY_INGRESS_SECRET_FILE');
    const secret = (await readFile(secretFile, 'utf8')).trim();
    if (secret.length < 32) {
      throw new Error('Wandora Gateway ingress secret must contain at least 32 characters.');
    }
    gatewayIngress = { secret };
  }

  let humanApi: RuntimeHumanApiConfig | undefined;
  if (humanApiEnabled) {
    humanApi = {
      jwksUrl: required(env, 'WANDORA_AUTH_JWKS_URL'),
      issuer: required(env, 'WANDORA_AUTH_ISSUER'),
      audience: required(env, 'WANDORA_AUTH_AUDIENCE'),
    };
  }

  let humanSendProposal: RuntimeHumanSendProposalConfig | undefined;
  if (humanSendProposalEnabled) {
    const secretFile = required(env, 'WANDORA_CORE_OUTBOUND_SECRET_FILE');
    const gatewaySecret = (await readFile(secretFile, 'utf8')).trim();
    if (gatewaySecret.length < 32) {
      throw new Error('Wandora Core outbound secret must contain at least 32 characters.');
    }
    if (gatewayIngress?.secret === gatewaySecret) {
      throw new Error('Core outbound and Gateway ingress must use distinct HMAC secrets.');
    }

    humanSendProposal = {
      connectionId: canonicalUuid(
        required(env, 'WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID'),
        'WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID',
      ),
      gatewayUrl: validateMessagingGatewayOutboundUrl(
        env.WANDORA_MESSAGING_GATEWAY_OUTBOUND_URL?.trim()
          || 'http://wandora-messaging-gateway:8787/internal/v1/core/outbound/text',
      ),
      gatewaySecret,
    };
  }

  let organizationAdapter: RuntimeOrganizationAdapterConfig | undefined;
  if (organizationAdapterEnabled) {
    const secretDirectory = required(env, 'WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY');
    const secretDirectoryStat = await stat(secretDirectory).catch(() => null);
    if (!secretDirectoryStat?.isDirectory()) {
      throw new Error('WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY must be a mounted directory.');
    }
    organizationAdapter = {
      webhookUrl: validateOrganizationAdapterWebhookUrl(
        required(env, 'WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL'),
      ),
      secretDirectory,
    };
  }

  return {
    port,
    mode,
    database: {
      host: (env.WANDORA_CORE_DB_HOST ?? 'wandora-postgres').trim(),
      port: parsePort(env.WANDORA_CORE_DB_PORT, 5432, 'WANDORA_CORE_DB_PORT'),
      database: (env.WANDORA_CORE_DB_NAME ?? 'postgres').trim(),
      user: 'wandora_core_runtime',
      password,
    },
    ...(gatewayIngress ? { gatewayIngress } : {}),
    ...(humanApi ? { humanApi } : {}),
    ...(humanSendProposal ? { humanSendProposal } : {}),
    ...(organizationAdapter ? { organizationAdapter } : {}),
    ...(agentRuntimeMode === 'mastra-deterministic'
      ? { agentRuntime: { mode: 'mastra-deterministic' as const } }
      : {}),
  };
}
