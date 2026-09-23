import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';

test('Customer Company Onboarding is off by default and fail-closed', async () => {
  assert.equal((await loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby' })).customerCompanyOnboarding, undefined);
  await assert.rejects(
    loadRuntimeConfig({
      WANDORA_CORE_MODE: 'standby',
      WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED: 'true',
    }),
    /cannot be enabled while Wandora Core is in standby/,
  );
});

test('Customer Company Onboarding requires the Human API and can be explicitly enabled', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wandora-company-onboarding-'));
  const dbSecret = join(dir, 'db-password');
  try {
    await writeFile(dbSecret, 'synthetic-test-password\n', { mode: 0o600 });
    const base = {
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
      WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED: 'true',
    };
    await assert.rejects(loadRuntimeConfig(base), /requires the Human API/);

    const config = await loadRuntimeConfig({
      ...base,
      WANDORA_HUMAN_API_ENABLED: 'true',
      WANDORA_AUTH_JWKS_URL: 'https://supabase.wandora.com.br/auth/v1/.well-known/jwks.json',
      WANDORA_AUTH_ISSUER: 'https://supabase.wandora.com.br/auth/v1',
      WANDORA_AUTH_AUDIENCE: 'authenticated',
    });
    assert.deepEqual(config.customerCompanyOnboarding, { enabled: true });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
