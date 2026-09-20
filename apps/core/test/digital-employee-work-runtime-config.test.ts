import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';

const reconcileUrl =
  'http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile';
const workUrl =
  'http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-work';

test('customer work is disabled by default and requires Human API + adapter + bridge + runtime', async () => {
  assert.equal((await loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby' })).humanDigitalEmployeeWork, undefined);
  await assert.rejects(
    loadRuntimeConfig({
      WANDORA_CORE_MODE: 'standby',
      WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED: 'true',
    }),
    /cannot be enabled while Wandora Core is in standby/,
  );

  const root = await mkdtemp(join(tmpdir(), 'wandora-work-config-'));
  try {
    const db = join(root, 'db');
    const ingress = join(root, 'ingress');
    const bridge = join(root, 'bridge');
    const orgDir = join(root, 'org');
    await Promise.all([
      writeFile(db, 'synthetic-db-password\n', { mode: 0o600 }),
      writeFile(ingress, 'i'.repeat(40), { mode: 0o600 }),
      writeFile(bridge, 'b'.repeat(40), { mode: 0o600 }),
      mkdir(orgDir, { mode: 0o700 }),
    ]);

    const base: NodeJS.ProcessEnv = {
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: db,
      WANDORA_HUMAN_API_ENABLED: 'true',
      WANDORA_AUTH_JWKS_URL: 'https://supabase.example/.well-known/jwks.json',
      WANDORA_AUTH_ISSUER: 'https://supabase.example/auth/v1',
      WANDORA_AUTH_AUDIENCE: 'authenticated',
      WANDORA_GATEWAY_INGRESS_ENABLED: 'true',
      WANDORA_GATEWAY_INGRESS_SECRET_FILE: ingress,
      WANDORA_AGENT_RUNTIME_MODE: 'mastra-deterministic',
      WANDORA_ORGANIZATION_ADAPTER_ENABLED: 'true',
      WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL: reconcileUrl,
      WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY: orgDir,
      WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED: 'true',
      WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE: bridge,
      WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED: 'true',
      WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL: workUrl,
    };

    const config = await loadRuntimeConfig(base);
    assert.deepEqual(config.humanDigitalEmployeeWork, { enabled: true });
    assert.equal(config.organizationAdapter?.workWebhookUrl, workUrl);

    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL: undefined }),
      /WORK_WEBHOOK_URL is required/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_HUMAN_API_ENABLED: 'false' }),
      /requires the Human API/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_ORGANIZATION_ADAPTER_ENABLED: 'false' }),
      /requires the Organization Adapter/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED: 'false' }),
      /requires the Paperclip Execution Bridge/,
    );
    await assert.rejects(
      loadRuntimeConfig({
        ...base,
        WANDORA_AGENT_RUNTIME_MODE: 'disabled',
        WANDORA_GATEWAY_INGRESS_ENABLED: 'false',
      }),
      /requires an Agent Runtime/,
    );
    await assert.rejects(
      loadRuntimeConfig({
        ...base,
        WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL:
          'http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-activate',
      }),
      /must target the private canonical Paperclip work route/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
