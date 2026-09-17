import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';
import { OrganizationAdapterService } from '../src/organization-adapter/service.js';
import { createRuntimeOrganizationAdapter } from '../src/runtime/organization-adapter.js';

test('runtime wiring constructs the provider-neutral service without enabling a route or effect', () => {
  const pool = {} as Pool;
  const service = createRuntimeOrganizationAdapter(
    pool,
    {
      webhookUrl: 'http://wandora-paperclip:3000/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile',
      secretDirectory: '/run/secrets/wandora/organization-adapter',
    },
    {
      readSecretFile: async () => 'synthetic-test-secret',
      fetchImpl: async () => new Response(JSON.stringify({ status: 'success', deliveryId: 'proof' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
      now: () => 1_789_618_400_000,
    },
  );

  assert.ok(service instanceof OrganizationAdapterService);
});
