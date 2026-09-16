import { readFile } from 'node:fs/promises';

const enabled = (value, name) => {
  const normalized = (value ?? 'false').trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`${name} must be true or false.`);
};

const required = (env, name) => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required when Platform Admin auth is enabled.`);
  return value;
};

const port = (value) => {
  const parsed = Number(value ?? 8790);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error('PORT is invalid.');
  return parsed;
};

export async function loadConfig(env = process.env) {
  for (const forbidden of [
    'WANDORA_PLATFORM_ADMIN_DB_PASSWORD',
    'WANDORA_PLATFORM_ADMIN_DB_PASSWORD_FILE',
    'WANDORA_PLATFORM_ADMIN_DATABASE_URL',
  ]) {
    if (env[forbidden]?.trim()) throw new Error(`${forbidden} is forbidden in Platform Admin Runtime V1.`);
  }

  const authEnabled = enabled(env.WANDORA_PLATFORM_ADMIN_AUTH_ENABLED, 'WANDORA_PLATFORM_ADMIN_AUTH_ENABLED');
  if (!authEnabled) return { port: port(env.PORT), auth: undefined };

  const jwksUrl = required(env, 'WANDORA_AUTH_JWKS_URL');
  const url = new URL(jwksUrl);
  if (url.protocol !== 'https:') throw new Error('WANDORA_AUTH_JWKS_URL must use HTTPS.');

  const subjectsFile = required(env, 'WANDORA_PLATFORM_OPERATOR_SUBJECTS_FILE');
  const subjects = (await readFile(subjectsFile, 'utf8'))
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (subjects.length < 1 || subjects.length > 32 || new Set(subjects).size !== subjects.length) {
    throw new Error('Platform operator subject allow-list is invalid.');
  }
  if (subjects.some((subject) => subject.length > 255)) throw new Error('Platform operator subject is invalid.');

  return {
    port: port(env.PORT),
    auth: {
      jwksUrl,
      issuer: required(env, 'WANDORA_AUTH_ISSUER'),
      audience: required(env, 'WANDORA_AUTH_AUDIENCE'),
      subjects: new Set(subjects),
    },
  };
}
