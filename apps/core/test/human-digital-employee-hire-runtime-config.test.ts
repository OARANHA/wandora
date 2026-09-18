import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';

const webhookUrl = 'http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile';

test('Customer Digital-Employee Hire is disabled by default and closed in standby', async () => {
  const standby = await loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby' });
  assert.equal(standby.humanDigitalEmployeeHire, undefined);

  await assert.rejects(
    loadRuntimeConfig({
      WANDORA_CORE_MODE: 'standby',
      WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: 'true',
    }),
    /cannot be enabled while Wandora Core is in standby/,
  );
});

test('Customer Digital-Employee Hire requires both Human API and Organization Adapter', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wandora-human-hire-config-'));
  const dbSecret = join(root, 'db-password');
  const secretDirectory = join(root, 'organization-adapter');
  try {
    await writeFile(dbSecret, 'synthetic-db-password\n', { mode: 0o600 });
    await mkdir(secretDirectory, { mode: 0o700 });

    await assert.rejects(
      loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
        WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: 'true',
      }),
      /requires the Human API/,
    );

    await assert.rejects(
      loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
        WANDORA_HUMAN_API_ENABLED: 'true',
        WANDORA_AUTH_JWKS_URL: 'https://supabase.wandora.com.br/auth/v1/.well-known/jwks.json',
        WANDORA_AUTH_ISSUER: 'https://supabase.wandora.com.br/auth/v1',
        WANDORA_AUTH_AUDIENCE: 'authenticated',
        WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: 'true',
      }),
      /requires the Organization Adapter/,
    );

    const config = await loadRuntimeConfig({
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
      WANDORA_HUMAN_API_ENABLED: 'true',
      WANDORA_AUTH_JWKS_URL: 'https://supabase.wandora.com.br/auth/v1/.well-known/jwks.json',
      WANDORA_AUTH_ISSUER: 'https://supabase.wandora.com.br/auth/v1',
      WANDORA_AUTH_AUDIENCE: 'authenticated',
      WANDORA_ORGANIZATION_ADAPTER_ENABLED: 'true',
      WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL: webhookUrl,
      WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY: secretDirectory,
      WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: 'true',
    });

    assert.deepEqual(config.humanDigitalEmployeeHire, { enabled: true });
    assert.ok(config.humanApi);
    assert.ok(config.organizationAdapter);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
