import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';

const webhookUrl = 'http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile';

test('Organization Adapter is disabled by default and cannot be enabled in standby', async () => {
  const standby = await loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby' });
  assert.equal(standby.organizationAdapter, undefined);

  await assert.rejects(
    loadRuntimeConfig({
      WANDORA_CORE_MODE: 'standby',
      WANDORA_ORGANIZATION_ADAPTER_ENABLED: 'true',
    }),
    /cannot be enabled while Wandora Core is in standby/,
  );
});

test('Organization Adapter requires database mode, pinned private Paperclip route and mounted secret directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wandora-org-adapter-config-'));
  const dbSecret = join(root, 'db-password');
  const secretDirectory = join(root, 'organization-adapter');
  try {
    await writeFile(dbSecret, 'synthetic-db-password\n', { mode: 0o600 });
    await mkdir(secretDirectory, { mode: 0o700 });

    const baseEnv: NodeJS.ProcessEnv = {
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
      WANDORA_ORGANIZATION_ADAPTER_ENABLED: 'true',
      WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL: webhookUrl,
      WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY: secretDirectory,
    };

    const config = await loadRuntimeConfig(baseEnv);
    assert.deepEqual(config.organizationAdapter, { webhookUrl, secretDirectory });

    await assert.rejects(
      loadRuntimeConfig({
        ...baseEnv,
        WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL: 'https://paperclip.example.test/webhook',
      }),
      /private canonical Paperclip plugin route/,
    );

    await assert.rejects(
      loadRuntimeConfig({
        ...baseEnv,
        WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY: join(root, 'missing'),
      }),
      /must be a mounted directory/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
