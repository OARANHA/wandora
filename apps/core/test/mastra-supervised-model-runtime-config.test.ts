import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';

test('mastra supervised model runtime is file-backed, pinned and fail-closed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wandora-model-runtime-config-'));
  try {
    const db = join(root, 'db');
    const ingress = join(root, 'ingress');
    const modelKey = join(root, 'model-key');
    await Promise.all([
      writeFile(db, 'synthetic-db-password\n', { mode: 0o600 }),
      writeFile(ingress, 'i'.repeat(40), { mode: 0o600 }),
      writeFile(modelKey, 'synthetic-mistral-api-key-0123456789abcdef', { mode: 0o600 }),
    ]);

    const base: NodeJS.ProcessEnv = {
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: db,
      WANDORA_GATEWAY_INGRESS_ENABLED: 'true',
      WANDORA_GATEWAY_INGRESS_SECRET_FILE: ingress,
      WANDORA_AGENT_RUNTIME_MODE: 'mastra-supervised-model',
      WANDORA_MODEL_PROVIDER: 'mistral',
      WANDORA_MODEL_ID: 'mistral-small-2603',
      WANDORA_MODEL_API_KEY_FILE: modelKey,
    };

    const config = await loadRuntimeConfig(base);
    assert.equal(config.agentRuntime?.mode, 'mastra-supervised-model');
    if (config.agentRuntime?.mode !== 'mastra-supervised-model') throw new Error('unexpected mode');
    assert.equal(config.agentRuntime.model.providerId, 'mistral');
    assert.equal(config.agentRuntime.model.modelId, 'mistral-small-2603');
    assert.equal(config.agentRuntime.model.baseUrl, 'https://api.mistral.ai/v1');
    assert.equal(config.agentRuntime.model.maxOutputTokens, 768);
    assert.equal(config.agentRuntime.model.requestTimeoutMs, 45_000);
    assert.equal(config.agentRuntime.model.logicalModel, 'wandora-supervised-v1');
    assert.equal(config.agentRuntime.model.apiKey, 'synthetic-mistral-api-key-0123456789abcdef');

    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_MODEL_PROVIDER: 'other' }),
      /MODEL_PROVIDER must be mistral/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_MODEL_ID: 'mistral-small-latest' }),
      /MODEL_ID must be mistral-small-2603/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_MODEL_BASE_URL: 'https://example.invalid/v1' }),
      /approved Mistral API base URL/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_MODEL_API_KEY_FILE: 'relative-key' }),
      /MODEL_API_KEY_FILE must be an absolute mounted file/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_MODEL_MAX_OUTPUT_TOKENS: '4096' }),
      /between 64 and 2048/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...base, WANDORA_MODEL_REQUEST_TIMEOUT_MS: '60000' }),
      /between 1000 and 50000/,
    );

    await writeFile(modelKey, 'too-short', { mode: 0o600 });
    await assert.rejects(
      loadRuntimeConfig(base),
      /model API key is invalid/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
