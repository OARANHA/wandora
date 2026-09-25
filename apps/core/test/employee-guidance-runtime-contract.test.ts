import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('employee guidance projection is bounded semantic state, not a memory or skill engine', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { dependencies: Record<string, string> };
  const projectionSource = await readFile(
    new URL('../src/agent-runtime/employee-guidance.ts', import.meta.url),
    'utf8',
  );
  const serviceSource = await readFile(
    new URL('../src/supervision/human-digital-employee-guidance.ts', import.meta.url),
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
    'semantic recall',
    'decision training',
    'company_skills',
    'provider_agent_ref',
  ]) {
    assert.equal(projectionSource.toLowerCase().includes(forbidden.toLowerCase()), false);
  }

  assert.equal(/\b(insert|update|delete)\b/i.test(projectionSource), false);
  assert.equal(projectionSource.includes("status = 'active'"), true);
  assert.equal(projectionSource.includes('MAX_RUNTIME_EMPLOYEE_GUIDANCE_ENTRIES = 100'), true);

  for (const providerLeak of ['paperclip', 'mastra', 'providerAgentId', 'skillId', 'memoryId']) {
    assert.equal(serviceSource.includes(providerLeak), false);
  }
});

test('employee guidance runtime vocabulary remains narrower than company truth and operational capabilities', async () => {
  const taskRuntime = await readFile(
    new URL('../src/agent-runtime/task-runtime.ts', import.meta.url),
    'utf8',
  );
  assert.equal(taskRuntime.includes("'responsibility' | 'behavior' | 'practice'"), true);
  assert.equal(taskRuntime.includes('employeeGuidance'), true);
  assert.equal(taskRuntime.includes('officialFacts'), true);
  assert.equal(taskRuntime.includes('houseRules'), true);
  assert.equal(taskRuntime.includes('workContext'), true);
  assert.equal(taskRuntime.includes("'knowledge'"), false);
  assert.equal(taskRuntime.includes("'skill'"), false);
});
