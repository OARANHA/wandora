import assert from 'node:assert/strict';
import test from 'node:test';
import { FetchHttpTransport } from '../src/evolution/fetch-transport.js';

test('adds the allow-listed Wandora Origin to Evolution HTTP calls', async () => {
  const originalFetch = globalThis.fetch;
  let capturedHeaders: HeadersInit | undefined;

  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = init?.headers;
    return new Response('{"ok":true}', {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const transport = new FetchHttpTransport();
    const response = await transport.request({
      url: 'http://wandora-evolution:8080/message/sendText/lab',
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: 'provider-key' },
      body: '{"number":"5551999999999","text":"hello"}',
    });

    assert.equal(response.status, 201);
    const headers = new Headers(capturedHeaders);
    assert.equal(headers.get('origin'), 'https://app.wandora.com.br');
    assert.equal(headers.get('apikey'), 'provider-key');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
