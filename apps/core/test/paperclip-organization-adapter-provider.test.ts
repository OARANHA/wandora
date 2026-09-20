import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PaperclipOrganizationAdapterUncertainError,
  createPaperclipOrganizationAdapterProvider,
  paperclipManagedAgentRef,
  signPaperclipOrganizationAdapterRequest,
} from '../src/organization-adapter/paperclip-provider.js';

const WEBHOOK_URL = 'http://paperclip.internal/api/plugins/plugin-id/webhooks/employee-reconcile';
const NOW_MS = 1_789_612_800_123;

test('Paperclip provider signs the exact company-scoped request and returns a stable opaque managed ref', async () => {
  const seen: Array<{ body: string; timestamp: string; signature: string }> = [];
  const resolvedCompanies: string[] = [];
  const fetchImpl = (async (_input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    seen.push({
      body: String(init?.body ?? ''),
      timestamp: headers.get('x-wandora-timestamp') ?? '',
      signature: headers.get('x-wandora-signature') ?? '',
    });
    return new Response(JSON.stringify({ deliveryId: 'delivery-fixture-1', status: 'success' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  const provider = createPaperclipOrganizationAdapterProvider({
    webhookUrl: WEBHOOK_URL,
    resolveHmacSecret: async (providerCompanyRef) => {
      resolvedCompanies.push(providerCompanyRef);
      return providerCompanyRef === 'paperclip-company-a' ? 'fixture-key-a' : 'fixture-key-b';
    },
    fetchImpl,
    now: () => NOW_MS,
  });

  const first = await provider.reconcileCatalogEmployee({
    providerCompanyRef: 'paperclip-company-a',
    catalogKey: 'ana-commercial-v1',
  });
  const replay = await provider.reconcileCatalogEmployee({
    providerCompanyRef: 'paperclip-company-a',
    catalogKey: 'ana-commercial-v1',
  });
  const otherCompany = await provider.reconcileCatalogEmployee({
    providerCompanyRef: 'paperclip-company-b',
    catalogKey: 'ana-commercial-v1',
  });

  assert.deepEqual(resolvedCompanies, ['paperclip-company-a', 'paperclip-company-a', 'paperclip-company-b']);
  assert.equal(first.providerAgentRef, replay.providerAgentRef);
  assert.equal(first.providerAgentRef, paperclipManagedAgentRef('paperclip-company-a', 'ana-commercial-v1'));
  assert.notEqual(first.providerAgentRef, otherCompany.providerAgentRef);
  assert.match(first.providerAgentRef, /^managed:v1:[0-9a-f]{64}$/);

  const expectedBody = JSON.stringify({ companyId: 'paperclip-company-a', catalogKey: 'ana-commercial-v1' });
  const expectedTimestamp = String(Math.floor(NOW_MS / 1_000));
  assert.equal(seen[0]?.body, expectedBody);
  assert.equal(seen[0]?.timestamp, expectedTimestamp);
  assert.equal(
    seen[0]?.signature,
    signPaperclipOrganizationAdapterRequest('fixture-key-a', expectedTimestamp, expectedBody),
  );
  assert.notEqual(seen[0]?.signature, seen[2]?.signature);
});

test('Paperclip provider treats transport, non-200 and malformed success as uncertain', async () => {
  const makeProvider = (fetchImpl: typeof fetch) => createPaperclipOrganizationAdapterProvider({
    webhookUrl: WEBHOOK_URL,
    resolveHmacSecret: async () => 'fixture-key',
    fetchImpl,
    now: () => NOW_MS,
  });
  const input = { providerCompanyRef: 'paperclip-company-a', catalogKey: 'ana-commercial-v1' };

  await assert.rejects(
    makeProvider((async () => { throw new Error('network'); }) as typeof fetch).reconcileCatalogEmployee(input),
    PaperclipOrganizationAdapterUncertainError,
  );
  await assert.rejects(
    makeProvider((async () => new Response('failed', { status: 502 })) as typeof fetch)
      .reconcileCatalogEmployee(input),
    PaperclipOrganizationAdapterUncertainError,
  );
  await assert.rejects(
    makeProvider((async () => new Response('{', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch).reconcileCatalogEmployee(input),
    PaperclipOrganizationAdapterUncertainError,
  );
  await assert.rejects(
    makeProvider((async () => new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch).reconcileCatalogEmployee(input),
    PaperclipOrganizationAdapterUncertainError,
  );
});

test('Paperclip provider fails closed before network on invalid local configuration or request shape', async () => {
  assert.throws(
    () => createPaperclipOrganizationAdapterProvider({
      webhookUrl: 'file:///tmp/not-http',
      resolveHmacSecret: async () => 'fixture-key',
    }),
    /invalid_webhook_url/,
  );

  let networkCalls = 0;
  const provider = createPaperclipOrganizationAdapterProvider({
    webhookUrl: WEBHOOK_URL,
    resolveHmacSecret: async () => 'fixture-key',
    fetchImpl: (async () => {
      networkCalls += 1;
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  });

  await assert.rejects(
    provider.reconcileCatalogEmployee({ providerCompanyRef: ' ', catalogKey: 'ana-commercial-v1' }),
    /invalid_company_ref/,
  );
  await assert.rejects(
    provider.reconcileCatalogEmployee({ providerCompanyRef: 'paperclip-company-a', catalogKey: 'CUSTOM' }),
    /invalid_catalog_key/,
  );
  assert.equal(networkCalls, 0);
});

test('activation provider sends only company + catalog to the separate signed activation action', async () => {
  const activationUrl = 'http://paperclip.internal/api/plugins/plugin-id/webhooks/employee-activate';
  const seen: Array<{ url: string; body: string }> = [];
  const provider = createPaperclipOrganizationAdapterProvider({
    webhookUrl: WEBHOOK_URL,
    activationWebhookUrl: activationUrl,
    resolveHmacSecret: async () => 'fixture-activation-key',
    fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
      seen.push({ url: String(input), body: String(init?.body ?? '') });
      return new Response(JSON.stringify({ status: 'success', deliveryId: 'activation-proof' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch,
    now: () => NOW_MS,
  });
  assert.ok(provider.activateCatalogEmployee);
  const result = await provider.activateCatalogEmployee({
    providerCompanyRef: 'paperclip-company-a',
    catalogKey: 'ana-commercial-v1',
  });
  assert.equal(seen[0]?.url, activationUrl);
  assert.deepEqual(JSON.parse(seen[0]!.body), {
    companyId: 'paperclip-company-a',
    catalogKey: 'ana-commercial-v1',
  });
  assert.equal(JSON.stringify(seen[0]).includes('agentId'), false);
  assert.equal(result.providerAgentRef, paperclipManagedAgentRef('paperclip-company-a', 'ana-commercial-v1'));
});


test('work provider sends only company, catalog, Wandora work id and bounded content', async () => {
  const workUrl = 'http://paperclip.internal/api/plugins/plugin-id/webhooks/employee-work';
  const seen: Array<{ url: string; body: string }> = [];
  const provider = createPaperclipOrganizationAdapterProvider({
    webhookUrl: WEBHOOK_URL,
    workWebhookUrl: workUrl,
    resolveHmacSecret: async () => 'fixture-work-key',
    fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
      seen.push({ url: String(input), body: String(init?.body ?? '') });
      return new Response(JSON.stringify({ status: 'success', deliveryId: 'work-proof' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch,
    now: () => NOW_MS,
  });
  assert.ok(provider.ensureCatalogEmployeeWork);
  const result = await provider.ensureCatalogEmployeeWork({
    providerCompanyRef: 'paperclip-company-a',
    catalogKey: 'ana-commercial-v1',
    workId: '11111111-1111-4111-8111-111111111111',
    title: 'Preparar resumo',
    description: 'Preparar resultado interno supervisionado.',
  });
  assert.equal(seen[0]?.url, workUrl);
  assert.deepEqual(JSON.parse(seen[0]!.body), {
    companyId: 'paperclip-company-a',
    catalogKey: 'ana-commercial-v1',
    workId: '11111111-1111-4111-8111-111111111111',
    title: 'Preparar resumo',
    description: 'Preparar resultado interno supervisionado.',
  });
  assert.equal(JSON.stringify(seen[0]).includes('agentId'), false);
  assert.equal(result.providerAgentRef, paperclipManagedAgentRef('paperclip-company-a', 'ana-commercial-v1'));
});

test('work provider rejects invalid work correlation before network', async () => {
  let networkCalls = 0;
  const provider = createPaperclipOrganizationAdapterProvider({
    webhookUrl: WEBHOOK_URL,
    workWebhookUrl: 'http://paperclip.internal/api/plugins/plugin-id/webhooks/employee-work',
    resolveHmacSecret: async () => 'fixture-work-key',
    fetchImpl: (async () => {
      networkCalls += 1;
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  });
  assert.ok(provider.ensureCatalogEmployeeWork);
  for (const input of [
    {
      providerCompanyRef: 'paperclip-company-a',
      catalogKey: 'ana-commercial-v1',
      workId: 'not-a-uuid',
      title: 'Resumo',
      description: 'Descrição.',
    },
    {
      providerCompanyRef: 'paperclip-company-a',
      catalogKey: 'ana-commercial-v1',
      workId: '11111111-1111-4111-8111-111111111111',
      title: '',
      description: 'Descrição.',
    },
    {
      providerCompanyRef: 'paperclip-company-a',
      catalogKey: 'ana-commercial-v1',
      workId: '11111111-1111-4111-8111-111111111111',
      title: 'Resumo',
      description: '',
    },
  ]) {
    assert.throws(() => provider.ensureCatalogEmployeeWork!(input), /invalid_work_/);
  }
  assert.equal(networkCalls, 0);
});
