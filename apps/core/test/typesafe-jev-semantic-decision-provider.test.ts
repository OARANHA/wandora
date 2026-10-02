import assert from 'node:assert/strict';
import test from 'node:test';
import { TypeSafeJevSemanticDecisionProvider } from '../src/semantic-routing/typesafe-jev-provider.js';

const API_KEY = 'jv_live_synthetic_qualification_key_123456789';

function validResponse(overrides: Record<string, unknown> = {}): Response {
  const payload = {
    model: 'jev-1.13.0',
    answers: {
      mode: {
        type: 'choice',
        choice: 'deterministic_read',
        confidence: 0.98,
        probabilities: {
          deterministic_read: 0.98,
          generative_reasoning: 0.01,
          human_review: 0,
          unknown: 0.01,
        },
      },
      capability: {
        type: 'choice',
        choice: 'business.products.search',
        confidence: 0.96,
        probabilities: {
          none: 0.01,
          'business.products.search': 0.96,
        },
      },
      presentation: {
        type: 'choice',
        choice: 'facts',
        confidence: 0.99,
        probabilities: {
          facts: 0.99,
          safe_contact_preview: 0.01,
        },
      },
      needsDataOrToolLookup: { type: 'noul', noul: 0.99 },
      needsMoreContext: { type: 'noul', noul: 0.01 },
      needsHumanReview: { type: 'noul', noul: 0.01 },
      ambiguity: {
        type: 'choice',
        choice: 'none',
        confidence: 0.99,
        probabilities: {
          none: 0.99,
          missing_entity: 0,
          multiple_matches: 0,
          vague_reference: 0,
          unknown: 0.01,
        },
      },
    },
    usage: { input_tokens: 200, output_tokens: 30 },
    ...overrides,
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

test('TypeSafe Jev adapter performs one bounded HTTPS decision without tenant/provider leakage', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    calls += 1;
    assert.equal(String(input), 'https://api.typesafe.ai/v1/systemone');
    assert.equal(init?.method, 'POST');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), `Bearer ${API_KEY}`);
    assert.equal(headers.get('content-type'), 'application/json');

    const body = JSON.parse(String(init?.body)) as {
      model: string;
      state: Record<string, unknown>;
      questions: Record<string, unknown>;
    };
    assert.equal(body.model, 'jev-1.13.0');
    assert.deepEqual(body.state, {
      request: 'Liste os primeiros produtos.',
      availableCapabilities: ['business.products.search'],
    });
    assert.equal('organizationId' in body.state, false);
    assert.equal('employeeId' in body.state, false);
    assert.deepEqual(Object.keys(body.questions).sort(), [
      'ambiguity',
      'capability',
      'mode',
      'needsDataOrToolLookup',
      'needsHumanReview',
      'needsMoreContext',
      'presentation',
    ]);
    return validResponse();
  };

  const provider = new TypeSafeJevSemanticDecisionProvider({
    apiKey: API_KEY,
    fetchImpl,
  });

  const decision = await provider.decide({
    organizationId: '11111111-1111-4111-8111-111111111111',
    employeeId: '22222222-2222-4222-8222-222222222222',
    request: ' Liste os primeiros produtos. ',
    availableCapabilities: ['business.products.search'],
  });

  assert.equal(calls, 1);
  assert.deepEqual(decision, {
    mode: 'deterministic_read',
    capability: 'business.products.search',
    presentation: 'facts',
    confidence: 0.96,
    needsDataOrToolLookup: 0.99,
    needsMoreContext: 0.01,
    needsHumanReview: 0.01,
    ambiguity: 'none',
    providerEvidence: {
      provider: 'typesafe-jev',
      model: 'jev-1.13.0',
    },
  });
});

test('provider-selected capability outside the advertised Wandora set fails closed', async () => {
  let calls = 0;
  const provider = new TypeSafeJevSemanticDecisionProvider({
    apiKey: API_KEY,
    fetchImpl: async () => {
      calls += 1;
      const response = validResponse();
      const payload = JSON.parse(await response.text()) as any;
      payload.answers.capability.choice = 'business.stock.read';
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });

  await assert.rejects(provider.decide({
    organizationId: 'org',
    employeeId: 'employee',
    request: 'Liste produtos.',
    availableCapabilities: ['business.products.search'],
  }), /typesafe_jev_invalid_response/);
  assert.equal(calls, 1);
});

test('timeout aborts the single provider request and performs zero retries', async () => {
  let calls = 0;
  const provider = new TypeSafeJevSemanticDecisionProvider({
    apiKey: API_KEY,
    timeoutMs: 250,
    fetchImpl: async (_input, init) => {
      calls += 1;
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    },
  });

  await assert.rejects(provider.decide({
    organizationId: 'org',
    employeeId: 'employee',
    request: 'Liste produtos.',
    availableCapabilities: ['business.products.search'],
  }), /typesafe_jev_unavailable/);
  assert.equal(calls, 1);
});

test('non-200 and oversized responses fail closed without retry', async () => {
  let unavailableCalls = 0;
  const unavailable = new TypeSafeJevSemanticDecisionProvider({
    apiKey: API_KEY,
    fetchImpl: async () => {
      unavailableCalls += 1;
      return new Response('busy', { status: 429 });
    },
  });

  await assert.rejects(unavailable.decide({
    organizationId: 'org',
    employeeId: 'employee',
    request: 'Liste produtos.',
    availableCapabilities: ['business.products.search'],
  }), /typesafe_jev_unavailable/);
  assert.equal(unavailableCalls, 1);

  let oversizedCalls = 0;
  const oversized = new TypeSafeJevSemanticDecisionProvider({
    apiKey: API_KEY,
    fetchImpl: async () => {
      oversizedCalls += 1;
      return new Response('x'.repeat(65 * 1024), { status: 200 });
    },
  });

  await assert.rejects(oversized.decide({
    organizationId: 'org',
    employeeId: 'employee',
    request: 'Liste produtos.',
    availableCapabilities: ['business.products.search'],
  }), /typesafe_jev_response_too_large/);
  assert.equal(oversizedCalls, 1);
});

test('malformed answer probabilities fail closed', async () => {
  const provider = new TypeSafeJevSemanticDecisionProvider({
    apiKey: API_KEY,
    fetchImpl: async () => {
      const response = validResponse();
      const payload = JSON.parse(await response.text()) as any;
      delete payload.answers.mode.probabilities.unknown;
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });

  await assert.rejects(provider.decide({
    organizationId: 'org',
    employeeId: 'employee',
    request: 'Liste produtos.',
    availableCapabilities: ['business.products.search'],
  }), /typesafe_jev_invalid_response/);
});

test('explicit named product is context-complete for later bounded selector extraction', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as {
      state: Record<string, unknown>;
      questions: Record<string, {
        instructions?: string;
        criteria?: Record<string, string>;
      }>;
    };

    assert.deepEqual(body.state, {
      request: 'Qual é o preço do produto PREMIUM PLUS?',
      availableCapabilities: ['business.products.search', 'business.products.price'],
    });
    assert.match(
      body.questions.needsMoreContext?.instructions ?? '',
      /structured selector object as missing context/,
    );
    assert.match(
      body.questions.needsMoreContext?.criteria?.false ?? '',
      /explicitly stated product name, code, or barcode counts as present/,
    );
    assert.match(
      body.questions.ambiguity?.instructions ?? '',
      /external catalog may contain duplicate rows/,
    );
    assert.match(
      body.questions.ambiguity?.criteria?.none ?? '',
      /Possible duplicate records in the external catalog do not make the request itself ambiguous/,
    );
    assert.match(
      body.questions.ambiguity?.criteria?.multiple_matches ?? '',
      /request itself explicitly names or asks between multiple products/,
    );

    const response = validResponse();
    const payload = JSON.parse(await response.text()) as any;
    payload.answers.capability.choice = 'business.products.price';
    payload.answers.capability.confidence = 1;
    payload.answers.capability.probabilities = {
      none: 0,
      'business.products.search': 0,
      'business.products.price': 1,
    };
    payload.answers.needsDataOrToolLookup.noul = 0.94;
    payload.answers.needsMoreContext.noul = 0.08;
    payload.answers.needsHumanReview.noul = 0.04;
    return new Response(JSON.stringify(payload), { status: 200 });
  };

  const provider = new TypeSafeJevSemanticDecisionProvider({
    apiKey: API_KEY,
    fetchImpl,
  });

  const decision = await provider.decide({
    organizationId: '11111111-1111-4111-8111-111111111111',
    employeeId: '22222222-2222-4222-8222-222222222222',
    request: 'Qual é o preço do produto PREMIUM PLUS?',
    availableCapabilities: ['business.products.search', 'business.products.price'],
  });

  assert.equal(calls, 1);
  assert.equal(decision.mode, 'deterministic_read');
  assert.equal(decision.capability, 'business.products.price');
  assert.equal(decision.confidence, 0.98);
  assert.equal(decision.needsDataOrToolLookup, 0.94);
  assert.equal(decision.needsMoreContext, 0.08);
  assert.equal(decision.needsHumanReview, 0.04);
  assert.equal(decision.ambiguity, 'none');
});



test('safe contact preview is a bounded presentation choice over the existing contact-read capability', async () => {
  const request = 'Faça uma prévia segura de mensagem para o cliente do pedido 1542, sem enviar.';
  const provider = new TypeSafeJevSemanticDecisionProvider({
    apiKey: API_KEY,
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        state: Record<string, unknown>;
        questions: Record<string, { instructions?: string; criteria?: Record<string, string> }>;
      };
      assert.deepEqual(body.state, {
        request,
        availableCapabilities: ['business.orders.customer_contact.read'],
      });
      assert.match(body.questions.presentation?.instructions ?? '', /safe_contact_preview/);
      assert.match(body.questions.presentation?.criteria?.safe_contact_preview ?? '', /NOT SENT/);

      const response = validResponse();
      const payload = JSON.parse(await response.text()) as any;
      payload.answers.capability = {
        type: 'choice',
        choice: 'business.orders.customer_contact.read',
        confidence: 0.99,
        probabilities: {
          none: 0.01,
          'business.orders.customer_contact.read': 0.99,
        },
      };
      payload.answers.presentation = {
        type: 'choice',
        choice: 'safe_contact_preview',
        confidence: 1,
        probabilities: {
          facts: 0,
          safe_contact_preview: 1,
        },
      };
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });

  const decision = await provider.decide({
    organizationId: '11111111-1111-4111-8111-111111111111',
    employeeId: '22222222-2222-4222-8222-222222222222',
    request,
    availableCapabilities: ['business.orders.customer_contact.read'],
  });

  assert.equal(decision.capability, 'business.orders.customer_contact.read');
  assert.equal(decision.presentation, 'safe_contact_preview');
  assert.equal(decision.ambiguity, 'none');
});
