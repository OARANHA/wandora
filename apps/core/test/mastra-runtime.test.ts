import assert from 'node:assert/strict';
import test from 'node:test';
import { MastraDeterministicAgentRuntime } from '../src/agent-runtime/mastra-deterministic.js';
import type { PlannerInput } from '../src/ana/contracts.js';

const input = (customerText = 'Olá, gostaria de saber mais.'): PlannerInput => ({
  organizationId: '00000000-0000-0000-0000-0000000000a1',
  employee: {
    id: '30000000-0000-0000-0000-0000000000a1',
    organizationId: '00000000-0000-0000-0000-0000000000a1',
    name: 'Ana',
    role: 'commercial-assistant',
    autonomyMode: 'supervised',
  },
  customerText,
  customerAddress: '+5551999999999',
});

test('MASTRA DETERMINISTIC AGENT RUNTIME V1', async (t) => {
  await t.test('returns only the Wandora proposal contract without model/framework egress', async () => {
    assert.equal(process.env.MASTRA_TELEMETRY_DISABLED, 'true');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('network access is forbidden in deterministic runtime test');
    };
    try {
      const runtime = new MastraDeterministicAgentRuntime();
      const proposal = await runtime.proposeCommercialReply(input());
      assert.deepEqual(proposal, {
        kind: 'send-text',
        text: 'Olá! Obrigado pelo contato. Para eu entender melhor e te orientar, você pode me contar o que precisa?',
        commitment: 'none',
        rationale: 'Proposta determinística de qualificação inicial, sem compromisso comercial.',
      });
      assert.deepEqual(Object.keys(proposal).sort(), ['commitment', 'kind', 'rationale', 'text']);
      assert.equal(JSON.stringify(proposal).includes('00000000-0000'), false);
      assert.equal(JSON.stringify(proposal).includes('+5551'), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('executes a provider-neutral assigned task without provider identifiers', async () => {
    const runtime = new MastraDeterministicAgentRuntime();
    const result = await runtime.executeAssignedTask({
      organizationId: '00000000-0000-0000-0000-0000000000a1',
      employee: input().employee,
      task: {
        title: 'Qualificar contato',
        description: 'Entender a necessidade do contato.',
      },
    });
    assert.deepEqual(result, {
      model: 'mastra-deterministic',
      summary: 'Olá! Obrigado pelo contato. Para eu entender melhor e te orientar, você pode me contar o que precisa?',
    });
    assert.equal(JSON.stringify(result).includes('paperclip'), false);
  });

  await t.test('rejects blank customer input before successful workflow output', async () => {
    const runtime = new MastraDeterministicAgentRuntime();
    await assert.rejects(
      runtime.proposeCommercialReply(input('   ')),
      /Too small|expected string to have/i,
    );
  });
});
