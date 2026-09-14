import { readFile } from 'node:fs/promises';

export type RuntimeMode = 'standby' | 'database';

export type RuntimeDatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: 'wandora_core_runtime';
  password: string;
};

export type RuntimeConfig = {
  port: number;
  mode: RuntimeMode;
  database?: RuntimeDatabaseConfig;
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
export async function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): Promise<RuntimeConfig> {
  const port = parsePort(env.PORT, 8788, 'PORT');
  const mode = (env.WANDORA_CORE_MODE ?? 'standby').trim();
  if (mode !== 'standby' && mode !== 'database') {
    throw new Error('WANDORA_CORE_MODE must be standby or database.');
  }

  if (mode === 'standby') return { port, mode };

  const user = (env.WANDORA_CORE_DB_USER ?? 'wandora_core_runtime').trim();
  if (user !== 'wandora_core_runtime') {
    throw new Error('WANDORA_CORE_DB_USER must be wandora_core_runtime.');
  }

  const passwordFile = required(env, 'WANDORA_CORE_DB_PASSWORD_FILE');
  const password = (await readFile(passwordFile, 'utf8')).trim();
  if (!password) throw new Error('Wandora Core database password file is empty.');

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
  };
}
