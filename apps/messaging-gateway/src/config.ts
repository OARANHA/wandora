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

  return {
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
}
