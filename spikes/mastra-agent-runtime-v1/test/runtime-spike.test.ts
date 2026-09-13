import assert from 'node:assert/strict';
import test from 'node:test';
import { MastraAgentRuntime } from '../src/runtime/mastra-agent-runtime.js';
import { mastra } from '../src/mastra/index.js';

test('Mastra workflow executes the deterministic Wandora tool', async () => {
  const workflow = mastra.getWorkflow('normalizeContact');
  const run = await workflow.createRun();
  const result = await run.start({
    inputData: { name: '  Maria   da Silva  ', email: 'MARIA@EXAMPLE.COM' },
  });

  assert.equal(result.status, 'success');
  assert.deepEqual(result.result, {
    normalizedName: 'Maria da Silva',
    normalizedEmail: 'maria@example.com',
  });
});

test('Wandora runtime adapter hides Mastra result internals', async () => {
  const runtime = new MastraAgentRuntime();
  const result = await runtime.execute({
    operation: 'normalize-contact',
    payload: { name: '  Ana   Souza  ', email: 'ANA@EXAMPLE.COM' },
  });

  assert.deepEqual(result, {
    ok: true,
    operation: 'normalize-contact',
    output: {
      normalizedName: 'Ana Souza',
      normalizedEmail: 'ana@example.com',
    },
  });
  assert.deepEqual(Object.keys(result).sort(), ['ok', 'operation', 'output']);
});

test('invalid tool input does not escape as a successful Wandora result', async () => {
  const runtime = new MastraAgentRuntime();

  await assert.rejects(
    runtime.execute({
      operation: 'normalize-contact',
      payload: { name: 'Ana', email: 'not-an-email' },
    }),
  );
});
