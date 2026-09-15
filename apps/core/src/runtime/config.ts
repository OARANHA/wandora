import { readFile } from 'node:fs/promises';

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

export type RuntimeConfig = {
  port: number;
  mode: RuntimeMode;
  database?: RuntimeDatabaseConfig;
  gatewayIngress?: RuntimeGatewayIngressConfig;
  agentRuntime?: RuntimeAgentConfig;
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
  const agentRuntimeMode = parseAgentRuntimeMode(env.WANDORA_AGENT_RUNTIME_MODE);

  if (mode === 'standby') {
    if (gatewayIngressEnabled) {
      throw new Error('Gateway ingress cannot be enabled while Wandora Core is in standby mode.');
    }
    if (agentRuntimeMode !== 'disabled') {
      throw new Error('Agent Runtime cannot be enabled while Wandora Core is in standby mode.');
    }
    return { port, mode };
  }

  if (agentRuntimeMode !== 'disabled' && !gatewayIngressEnabled) {
    throw new Error('Deterministic Agent Runtime requires supervised Gateway ingress to be enabled.');
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
    ...(agentRuntimeMode === 'mastra-deterministic'
      ? { agentRuntime: { mode: 'mastra-deterministic' as const } }
      : {}),
  };
}
