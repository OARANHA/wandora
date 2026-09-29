import assert from 'node:assert/strict';
import test from 'node:test';
import { VigiaClient } from '../src/vigia/client.js';

test('Vigia client exports OTLP trace and Business Event with the same traceId', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const client = new VigiaClient(
    {
      baseUrl: 'https://vigia.example',
      projectSlug: 'wandora-prod-a1b2c3',
      apiKey: 'synthetic-vigia-api-key-for-test',
      requestTimeoutMs: 2_000,
    },
    async (input, init = {}) => {
      calls.push({ url: String(input), init });
      return new Response(null, { status: calls.length === 1 ? 200 : 201 });
    },
  );

  const result = await client.recordWorkCompleted({
    organizationId: 'org_internal_1',
    employeeId: 'employee_internal_1',
    workId: 'work_internal_1',
    executionId: 'exec_internal_1',
    model: 'wandora-supervised-v1',
    startTimeUnixNano: 1_700_000_000_000_000_000n,
    endTimeUnixNano: 1_700_000_000_100_000_000n,
  });

  assert.match(result.traceId, /^[0-9a-f]{32}$/);
  assert.equal(calls.length, 2);

  const traceCall = calls[0];
  const eventCall = calls[1];
  assert.equal(traceCall?.url, 'https://vigia.example/v1/traces');
  assert.equal(eventCall?.url, 'https://vigia.example/v1/projects/wandora-prod-a1b2c3/events');

  const traceHeaders = traceCall?.init.headers as Record<string, string>;
  const eventHeaders = eventCall?.init.headers as Record<string, string>;
  assert.equal(traceHeaders.Authorization, 'Bearer synthetic-vigia-api-key-for-test');
  assert.equal(traceHeaders['X-Vigia-Project'], 'wandora-prod-a1b2c3');
  assert.equal(eventHeaders.Authorization, 'Bearer synthetic-vigia-api-key-for-test');
  assert.equal(eventHeaders['X-Vigia-Project'], 'wandora-prod-a1b2c3');

  const traceBody = JSON.parse(String(traceCall?.init.body));
  const eventBody = JSON.parse(String(eventCall?.init.body));
  const span = traceBody.resourceSpans[0].scopeSpans[0].spans[0];

  assert.equal(span.traceId, result.traceId);
  assert.match(span.spanId, /^[0-9a-f]{16}$/);
  assert.equal(span.name, 'wandora.digital_employee.work');
  assert.equal(eventBody.traceId, result.traceId);
  assert.equal(eventBody.event, 'work_completed');
  assert.equal(eventBody.success, true);
  assert.equal(eventBody.metadata.executionId, 'exec_internal_1');
  assert.equal(eventBody.metadata.workId, 'work_internal_1');
});

test('Vigia client stops before Business Event when OTLP ingest is rejected', async () => {
  let calls = 0;
  const client = new VigiaClient(
    {
      baseUrl: 'https://vigia.example',
      projectSlug: 'wandora-prod-a1b2c3',
      apiKey: 'synthetic-vigia-api-key-for-test',
      requestTimeoutMs: 2_000,
    },
    async () => {
      calls += 1;
      return new Response(null, { status: 401 });
    },
  );

  await assert.rejects(
    client.recordWorkCompleted({
      organizationId: 'org_internal_1',
      employeeId: 'employee_internal_1',
      workId: 'work_internal_1',
      executionId: 'exec_internal_1',
      model: 'wandora-supervised-v1',
      startTimeUnixNano: 1_700_000_000_000_000_000n,
      endTimeUnixNano: 1_700_000_000_100_000_000n,
    }),
    /OTLP trace export failed with HTTP 401/,
  );
  assert.equal(calls, 1);
});
