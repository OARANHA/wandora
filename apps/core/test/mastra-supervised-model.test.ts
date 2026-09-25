import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { MastraSupervisedModelAgentRuntime } from '../src/agent-runtime/mastra-supervised-model.js';
import type { PlannerInput } from '../src/ana/contracts.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
const EMP = '30000000-0000-0000-0000-0000000000a1';

const plannerInput = (): PlannerInput => ({
  organizationId: ORG,
  employee: {
    id: EMP,
    organizationId: ORG,
    name: 'Ana',
    role: 'commercial-assistant',
    autonomyMode: 'supervised',
  },
  customerText: 'Quero saber mais.',
  customerAddress: '+5551999999999',
});

async function listen(handler: http.RequestListener): Promise<{
  server: http.Server;
  baseUrl: string;
}> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing server address');
  return { server, baseUrl: `http://127.0.0.1:${address.port}/v1` };
}

const config = (baseUrl: string, timeout = 1_000) => ({
  providerId: 'mistral',
  modelId: 'mistral-small-2603',
  baseUrl,
  apiKey: 'synthetic-model-key-never-real',
  maxOutputTokens: 128,
  requestTimeoutMs: timeout,
  logicalModel: 'wandora-supervised-v1',
});

test('mastra supervised model runtime keeps inbound deterministic and model work narrow', async () => {
  const requests: Array<{
    path: string | undefined;
    authorization: string | undefined;
    body: Record<string, unknown>;
  }> = [];
  const { server, baseUrl } = await listen(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    requests.push({
      path: req.url,
      authorization: req.headers.authorization,
      body: JSON.parse(raw) as Record<string, unknown>,
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1,
      model: 'mistral-small-2603',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: '{"summary":"Resumo interno supervisionado."}' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 13, completion_tokens: 7, total_tokens: 20 },
    }));
  });

  try {
    const runtime = new MastraSupervisedModelAgentRuntime(config(baseUrl));

    const proposal = await runtime.proposeCommercialReply(plannerInput());
    assert.equal(requests.length, 0, 'inbound proposal must not call the external model');
    assert.equal(proposal.commitment, 'none');
    assert.match(proposal.text, /Obrigado pelo contato/);

    const result = await runtime.executeAssignedTask({
      organizationId: ORG,
      employee: plannerInput().employee,
      task: {
        title: 'Preparar resumo comercial',
        description: 'Organize os próximos passos para revisão do owner.',
      },
      grounding: {
        officialFacts: [{
          content: 'A empresa atende somente com informações confirmadas.',
          provenance: { type: 'approved_source', sourceLabel: 'Perfil oficial' },
        }],
        houseRules: [{
          content: 'Quando não souber, declarar desconhecido.',
          provenance: { type: 'owner_statement', sourceLabel: null },
        }],
        employeeGuidance: [],
        workContext: {
          title: 'Preparar resumo comercial',
          description: 'Organize os próximos passos para revisão do owner.',
        },
      },
    });

    assert.deepEqual(result, {
      model: 'wandora-supervised-v1',
      summary: 'Resumo interno supervisionado.',
      usage: { inputTokens: 13, outputTokens: 7, cachedInputTokens: 0, totalTokens: 20 },
    });
    assert.equal(requests.length, 1);

    const request = requests[0]!;
    assert.equal(request.path, '/v1/chat/completions');
    assert.equal(request.authorization, 'Bearer synthetic-model-key-never-real');
    assert.equal(request.body.model, 'mistral-small-2603');
    assert.equal(request.body.max_tokens, 128);
    assert.equal(request.body.temperature, 0.2);

    const responseFormat = request.body.response_format as Record<string, unknown>;
    assert.equal(responseFormat.type, 'json_schema');

    const serialized = JSON.stringify(request.body);
    assert.equal(serialized.includes(ORG), false);
    assert.equal(serialized.includes(EMP), false);
    assert.equal(serialized.includes('+5551'), false);
    assert.equal(serialized.includes('paperclip'), false);
    assert.equal(serialized.includes('synthetic-model-key-never-real'), false);

    const messages = request.body.messages as Array<Record<string, unknown>>;
    const userMessage = String(messages.find((message) => message.role === 'user')?.content ?? '');
    assert.deepEqual(JSON.parse(userMessage), {
      officialFacts: [{
        content: 'A empresa atende somente com informações confirmadas.',
        provenance: { type: 'approved_source', sourceLabel: 'Perfil oficial' },
      }],
      houseRules: [{
        content: 'Quando não souber, declarar desconhecido.',
        provenance: { type: 'owner_statement', sourceLabel: null },
      }],
      employeeGuidance: [],
      workContext: {
        title: 'Preparar resumo comercial',
        description: 'Organize os próximos passos para revisão do owner.',
      },
    });
  } finally {
    server.close();
  }
});

test('mastra supervised model runtime aborts before the Paperclip bridge timeout', async () => {
  let requests = 0;
  const { server, baseUrl } = await listen(async (_req, res) => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    if (!res.headersSent) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        id: 'late',
        object: 'chat.completion',
        created: 1,
        model: 'mistral-small-2603',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: '{"summary":"late"}' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }));
    }
  });

  try {
    const runtime = new MastraSupervisedModelAgentRuntime(config(baseUrl, 500));
    await assert.rejects(
      runtime.executeAssignedTask({
        organizationId: ORG,
        employee: plannerInput().employee,
        task: { title: 'Timeout proof', description: 'Do not wait forever.' },
        grounding: {
          officialFacts: [],
          houseRules: [],
      employeeGuidance: [],
          workContext: { title: 'Timeout proof', description: 'Do not wait forever.' },
        },
      }),
    );
    assert.equal(requests, 1);
  } finally {
    server.close();
  }
});


test('mastra supervised runtime exposes only supplied read tools without leaking gateway credentials', async () => {
  const requests: Array<Record<string, unknown>> = [];
  const { server, baseUrl } = await listen(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    requests.push(JSON.parse(raw) as Record<string, unknown>);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      id: 'chatcmpl-tools',
      object: 'chat.completion',
      created: 1,
      model: 'mistral-small-2603',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: '{"summary":"Consulta disponível para uso supervisionado."}' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 17, completion_tokens: 9, total_tokens: 26 },
    }));
  });

  try {
    let toolCalls = 0;
    const runtime = new MastraSupervisedModelAgentRuntime(config(baseUrl));
    const result = await runtime.executeAssignedTask({
      organizationId: ORG,
      employee: plannerInput().employee,
      task: { title: 'Consultar catálogo', description: 'Use leitura se necessário.' },
      grounding: {
        officialFacts: [],
        houseRules: [],
          employeeGuidance: [],
        workContext: { title: 'Consultar catálogo', description: 'Use leitura se necessário.' },
      },
      readTools: [{
        name: 'vendaerp_search_products',
        title: 'VendaERP Search Products',
        description: 'Consulta produtos sem alterar o ERP.',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          additionalProperties: false,
        },
        execute: async () => {
          toolCalls += 1;
          return { items: [] };
        },
      }],
    });

    assert.equal(result.summary, 'Consulta disponível para uso supervisionado.');
    assert.equal(toolCalls, 0);
    assert.equal(requests.length, 1);

    const serialized = JSON.stringify(requests[0]);
    assert.equal(serialized.includes('vendaerp_search_products'), true);
    assert.equal(serialized.includes('Consulta produtos sem alterar o ERP.'), true);
    assert.equal(serialized.includes('opaque-run-token'), false);
    assert.equal(serialized.includes('gateway-token'), false);
    assert.equal(serialized.includes(ORG), false);
    assert.equal(serialized.includes(EMP), false);
  } finally {
    server.close();
  }
});

test('mastra supervised runtime cannot turn a read-tool failure into textual success', async () => {
  let requests = 0;
  let toolCalls = 0;
  const { server, baseUrl } = await listen(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    requests += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    if (requests === 1) {
      res.end(JSON.stringify({
        id: 'chatcmpl-tool-error',
        object: 'chat.completion',
        created: 1,
        model: 'mistral-small-2603',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call-product',
              type: 'function',

              function: {
                name: 'vendaerp_search_products',
                arguments: '{"pageSize":5,"skip":0}',
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }));
      return;
    }
    res.end(JSON.stringify({
      id: 'chatcmpl-after-tool-error',
      object: 'chat.completion',
      created: 2,
      model: 'mistral-small-2603',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: '{"summary":"Não deveria virar sucesso."}' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 12, completion_tokens: 6, total_tokens: 18 },
    }));
  });

  try {
    const runtime = new MastraSupervisedModelAgentRuntime(config(baseUrl));
    await assert.rejects(
      runtime.executeAssignedTask({
        organizationId: ORG,
        employee: plannerInput().employee,
        task: { title: 'Consultar produto', description: 'Faça uma leitura apenas.' },
        grounding: {
          officialFacts: [],
          houseRules: [],
      employeeGuidance: [],
          workContext: { title: 'Consultar produto', description: 'Faça uma leitura apenas.' },
        },
        readTools: [{
          name: 'vendaerp_search_products',
          title: 'VendaERP Search Products',
          description: 'Consulta produtos sem alterar o ERP.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: true },
          execute: async () => {
            toolCalls += 1;
            throw new Error('synthetic-read-tool-failed');
          },
        }],
      }),
      /synthetic-read-tool-failed/,
    );

    assert.equal(toolCalls, 1);
    assert.ok(requests >= 1);
  } finally {
    server.close();
  }
});
