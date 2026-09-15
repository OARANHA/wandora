import { readFile } from 'node:fs/promises';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MessagingGatewayConfig = {
  port: number;
  evolutionInstance: string;
  organizationId: string;
  connectionId: string;
  evolutionWebhookJwtKey: string;
  coreIngressSecret: string;
  coreIngressUrl: string;
  outbound?: {
    coreOutboundSecret: string;
    evolutionApiKey: string;
    evolutionBaseUrl: string;
  };
};

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? '8787');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function canonicalUuid(value: string, name: string): string {
  if (!UUID_RE.test(value)) throw new Error(`${name} must be a canonical UUID.`);
  return value.toLowerCase();
}

function validateCoreIngressUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'http:'
    || url.hostname !== 'wandora-core'
    || url.port !== '8788'
    || url.pathname !== '/internal/v1/gateway/inbound'
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error('WANDORA_CORE_INGRESS_URL must target the private canonical Core ingress route.');
  }
  return url.toString();
}

function validateEvolutionBaseUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'http:'
    || url.hostname !== 'wandora-evolution'
    || url.port !== '8080'
    || (url.pathname !== '/' && url.pathname !== '')
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error('WANDORA_EVOLUTION_BASE_URL must target the private canonical Evolution service.');
  }
  return url.toString();
}

function parseEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'false') return false;
  if (normalized === 'true') return true;
  throw new Error('WANDORA_GATEWAY_OUTBOUND_ENABLED must be true or false.');
}

async function readSecret(env: NodeJS.ProcessEnv, name: string): Promise<string> {
  const file = required(env, name);
  const value = (await readFile(file, 'utf8')).trim();
  if (value.length < 32) throw new Error(`${name} must contain at least 32 characters.`);
  return value;
}

export async function loadMessagingGatewayConfig(
  env: NodeJS.ProcessEnv = process.env,
): Promise<MessagingGatewayConfig> {
  const evolutionInstance = required(env, 'WANDORA_EVOLUTION_INSTANCE');
  if (evolutionInstance.length > 128) throw new Error('WANDORA_EVOLUTION_INSTANCE is too long.');

  const config: MessagingGatewayConfig = {
    port: parsePort(env.PORT),
    evolutionInstance,
    organizationId: canonicalUuid(required(env, 'WANDORA_ORGANIZATION_ID'), 'WANDORA_ORGANIZATION_ID'),
    connectionId: canonicalUuid(required(env, 'WANDORA_CONNECTION_ID'), 'WANDORA_CONNECTION_ID'),
    evolutionWebhookJwtKey: await readSecret(env, 'WANDORA_EVOLUTION_WEBHOOK_JWT_KEY_FILE'),
    coreIngressSecret: await readSecret(env, 'WANDORA_CORE_INGRESS_SECRET_FILE'),
    coreIngressUrl: validateCoreIngressUrl(
      env.WANDORA_CORE_INGRESS_URL?.trim()
        || 'http://wandora-core:8788/internal/v1/gateway/inbound',
    ),
  };

  if (parseEnabled(env.WANDORA_GATEWAY_OUTBOUND_ENABLED)) {
    config.outbound = {
      coreOutboundSecret: await readSecret(env, 'WANDORA_CORE_OUTBOUND_SECRET_FILE'),
      evolutionApiKey: await readSecret(env, 'WANDORA_EVOLUTION_API_KEY_FILE'),
      evolutionBaseUrl: validateEvolutionBaseUrl(
        env.WANDORA_EVOLUTION_BASE_URL?.trim() || 'http://wandora-evolution:8080',
      ),
    };
  }

  return config;
}
