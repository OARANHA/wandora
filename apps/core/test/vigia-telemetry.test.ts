import assert from 'node:assert/strict';
import test from 'node:test';
import { VigiaPublicTelemetryClient } from '../src/vigia/telemetry.js';

test('Vigia client sends OTLP then Business Event with the same traceId', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    const status = init?.method === 'GET'
      ? 200
      : String(input).endsWith('/v1/traces')
        ? 200
        : 201;
    return new Response('{}', { status });
  };

  const client = new VigiaPublicTelemetryClient(
    {
      baseUrl: 'https://vigia.example.com',
      projectSlug: 'wandora-ana',
      apiKey: 'client-secret-token-1234567890',
      requestTimeoutMs: 1_000,
    },
    fakeFetch,
    (size) => Buffer.alloc(size, size === 16 ? 0x11 : 0x22),
  );

  const result = await client.recordCompleted({
    organizationId: '71000000-0000-4000-8000-0000000000a1',
    employeeId: '72000000-0000-4000-8000-0000000000a1',
    workId: '76000000-0000-4000-8000-0000000000a1',
    paperclipRunId: '75000000-0000-4000-8000-0000000000a1',
    executionId: 'exec_abc',
    model: 'wandora-supervised-v1',
    startedAtMs: 1_790_000_000_000,
    completedAtMs: 1_790_000_001_250,
  });

  assert.equal(result.traceId, '11'.repeat(16));
  assert.equal(calls.length, 3);
  assert.equal(calls[0]?.url, 'https://vigia.example.com/v1/traces');
  assert.equal(
    calls[1]?.url,
    `https://vigia.example.com/v1/projects/wandora-ana/traces/${result.traceId}`,
  );
  assert.equal(calls[1]?.init.method, 'GET');
  assert.equal(calls[2]?.url, 'https://vigia.example.com/v1/projects/wandora-ana/events');

  for (const call of calls) {
    assert.equal((call.init.headers as Record<string, string>).Authorization, 'Bearer client-secret-token-1234567890');
    assert.equal((call.init.headers as Record<string, string>)['X-Vigia-Project'], 'wandora-ana');
  }

  const otlp = JSON.parse(String(calls[0]?.init.body));
  const span = otlp.resourceSpans[0].scopeSpans[0].spans[0];
  assert.equal(span.traceId, result.traceId);
  assert.equal(span.name, 'wandora.digital_employee.work');
  assert.equal(span.startTimeUnixNano, '1790000000000000000');
  assert.equal(span.endTimeUnixNano, '1790000001250000000');

  const event = JSON.parse(String(calls[2]?.init.body));
  assert.equal(event.traceId, result.traceId);
  assert.equal(event.event, 'work_completed');
  assert.equal(event.success, true);
  assert.equal(event.label, 'Trabalho concluído');
  assert.equal(event.metadata.source, 'wandora');
  assert.equal(event.metadata.workId, '76000000-0000-4000-8000-0000000000a1');
});

test('Vigia client does not send Business Event when OTLP ingest fails', async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls += 1;
    return new Response('{}', { status: 503 });
  };

  const client = new VigiaPublicTelemetryClient(
    {
      baseUrl: 'https://vigia.example.com',
      projectSlug: 'wandora-ana',
      apiKey: 'client-secret-token-1234567890',
      requestTimeoutMs: 1_000,
    },
    fakeFetch,
  );

  await assert.rejects(
    client.recordCompleted({
      organizationId: 'org',
      employeeId: 'employee',
      workId: 'work',
      paperclipRunId: 'run',
      executionId: 'exec',
      model: 'model',
      startedAtMs: 1,
      completedAtMs: 2,
    }),
    /OTLP ingest failed with HTTP 503/,
  );
  assert.equal(calls, 1);
});
