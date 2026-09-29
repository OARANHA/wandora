import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';

test('Vigia customer config loads only from a complete mounted-secret configuration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wandora-vigia-config-'));
  try {
    const db = join(root, 'db');
    const vigiaKey = join(root, 'vigia-api-key');
    await Promise.all([
      writeFile(db, 'synthetic-db-password\n', { mode: 0o600 }),
      writeFile(vigiaKey, 'synthetic-vigia-api-key-123456789\n', { mode: 0o600 }),
    ]);

    const config = await loadRuntimeConfig({
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: db,
      WANDORA_VIGIA_BASE_URL: 'https://vigia.example',
      WANDORA_VIGIA_PROJECT_SLUG: 'wandora-production-a1b2c3',
      WANDORA_VIGIA_API_KEY_FILE: vigiaKey,
    });

    assert.deepEqual(config.vigia, {
      baseUrl: 'https://vigia.example',
      projectSlug: 'wandora-production-a1b2c3',
      apiKey: 'synthetic-vigia-api-key-123456789',
      requestTimeoutMs: 3_000,
    });

    await assert.rejects(
      loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: db,
        WANDORA_VIGIA_BASE_URL: 'https://vigia.example',
        WANDORA_VIGIA_PROJECT_SLUG: 'wandora-production-a1b2c3',
      }),
      /WANDORA_VIGIA_API_KEY_FILE is required/,
    );

    await assert.rejects(
      loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: db,
        WANDORA_VIGIA_BASE_URL: 'http://vigia.example',
        WANDORA_VIGIA_PROJECT_SLUG: 'wandora-production-a1b2c3',
        WANDORA_VIGIA_API_KEY_FILE: vigiaKey,
      }),
      /WANDORA_VIGIA_BASE_URL must be an HTTPS origin/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
