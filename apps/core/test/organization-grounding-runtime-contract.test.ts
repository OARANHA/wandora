import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('grounding projection adds no RAG/memory/vector subsystem dependency', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { dependencies: Record<string, string> };
  const projectionSource = await readFile(
    new URL('../src/agent-runtime/organization-grounding.ts', import.meta.url),
    'utf8',
  );
  const supervisedModelSource = await readFile(
    new URL('../src/agent-runtime/mastra-supervised-model.ts', import.meta.url),
    'utf8',
  );
  const executionBridgeSource = await readFile(
    new URL('../src/paperclip-execution/service.ts', import.meta.url),
    'utf8',
  );

  assert.deepEqual(
    Object.keys(packageJson.dependencies).sort(),
    ['@mastra/core', 'pg', 'zod'],
  );
  for (const forbidden of [
    '@mastra/memory',
    'embedding',
    'vector',
    'chunking',
    'knowledge-base',
  ]) {
    assert.equal(projectionSource.toLowerCase().includes(forbidden), false);
  }

  const runtimeSources = [
    projectionSource,
    supervisedModelSource,
    executionBridgeSource,
  ].join('\n');
  for (const forbiddenMutation of [
    'create_organization_grounding_entry',
    'correct_organization_grounding_entry',
    'retire_organization_grounding_entry',
    'HumanGroundingService',
  ]) {
    assert.equal(runtimeSources.includes(forbiddenMutation), false);
  }
  assert.equal(/\b(insert|update|delete)\b/i.test(projectionSource), false);
});
