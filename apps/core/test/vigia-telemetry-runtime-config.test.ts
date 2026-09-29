import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';

test('Vigia telemetry is explicit client configuration backed by a mounted API-key file', async () => {
  assert.equal((await loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby' })).vigiaTelemetry, undefined);
  await assert.rejects(
    loadRuntimeConfig({
      WANDORA_CORE_MODE: 'standby',
      WANDORA_VIGIA_TELEMETRY_ENABLED: 'true',
    }),
    /cannot be enabled while Wandora Core is in standby/,
  );

  const root = await mkdtemp(join(tmpdir(), 'wandora-vigia-config-'));
  try {
    const db = join(root, 'db');
    const key = join(root, 'vigia-key');
    await Promise.all([
      writeFile(db, 'synthetic-db-password\n', { mode: 0o600 }),
      writeFile(key, 'vigia-client-token-12345678901234567890\n', { mode: 0o600 }),
    ]);

    const base: NodeJS.ProcessEnv = {
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: db,
      WANDORA_VIGIA_TELEMETRY_ENABLED: 'true',
      WANDORA_VIGIA_BASE_URL: 'https://vigia.example.com',
      WANDORA_VIGIA_PROJECT_SLUG: 'wandora-ana',
      WANDORA_VIGIA_API_KEY_FILE: key,
      WANDORA_VIGIA_REQUEST_TIMEOUT_MS: '2500',
    };

    const config = await loadRuntimeConfig(base);
    assert.deepEqual(config.vigiaTelemetry, {
      baseUrl: 'https://vigia.example.com',
      projectSlug: 'wandora-ana',
      apiKey: 'vigia-client-token-12345678901234567890',
      requestTimeoutMs: 2500,
    });

    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_VIGIA_BASE_URL: 'http://vigia.example.com' }),
      /must be an HTTPS origin/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_VIGIA_PROJECT_SLUG: 'Wandora Ana' }),
      /canonical Vigia project slug/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_VIGIA_API_KEY_FILE: 'relative-key' }),
      /must be an absolute mounted file/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
