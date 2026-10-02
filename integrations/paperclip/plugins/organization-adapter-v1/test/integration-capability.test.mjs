import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADAPTER_MAPPED_BUSINESS_CAPABILITIES,
  OPERATIONAL_READ_DATA_KEY,
  normalizePaperclipOperationalSnapshot,
  projectPaperclipOperationalRead,
  readManagedEmployeeIntegrationCapabilityProjection,
  registerManagedEmployeeOperationalReadData,
} from '../.test-build/integration-capability.mjs';

function tool(toolName, overrides = {}) {
  return {
    toolName,
    status: 'active',
    riskLevel: 'read',
    isReadOnly: true,
    isWrite: false,
    isDestructive: false,
    allowedByEffectiveProfile: true,
    ...overrides,
  };
}

function connection(overrides = {}) {
  return {
    displayName: 'VendaERP 28PRO',
    status: 'active',
    enabled: true,
    healthStatus: 'ok',
    organizationGrantActive: true,
    installedForAgent: true,
    tools: [
      tool('vendaerp_probe'),
      tool('vendaerp_list_companies'),
      tool('vendaerp_search_products'),
      tool('vendaerp_get_product_stock'),
      tool('vendaerp_list_price_tables'),
      tool('vendaerp_search_price_table_products'),
      tool('vendaerp_search_parties'),
      tool('vendaerp_search_orders'),
    ],
    ...overrides,
  };
}

test('maps only explicit provider tools to finite Wandora business capabilities', () => {
  const [projection] = normalizePaperclipOperationalSnapshot({
    runtimeHealth: 'ok',
    connections: [connection()],
  });

  assert.deepEqual(projection.supportedCapabilities, ADAPTER_MAPPED_BUSINESS_CAPABILITIES);
  assert.deepEqual(projection.organizationEnabledCapabilities, ADAPTER_MAPPED_BUSINESS_CAPABILITIES);
  assert.equal(JSON.stringify(projection).includes('vendaerp_'), false);
  assert.equal(ADAPTER_MAPPED_BUSINESS_CAPABILITIES.some((capability) =>
    /send|whatsapp|outbound|preview/i.test(capability)), false);
});

test('unknown or malicious tool names cannot inject semantic capabilities', () => {
  const [projection] = normalizePaperclipOperationalSnapshot({
    runtimeHealth: 'ok',
    connections: [connection({
      tools: [
        tool('vendaerp_search_products'),
        tool('business.orders.search'),
        tool('__proto__'),
        tool('send_email'),
      ],
    })],
  });

  assert.deepEqual(projection.supportedCapabilities, [
    'business.products.search',
    'business.products.price',
  ]);
  assert.deepEqual(projection.organizationEnabledCapabilities, [
    'business.products.search',
    'business.products.price',
  ]);
});

test('operational evidence can narrow availability without changing semantic support', () => {
  const [projection] = normalizePaperclipOperationalSnapshot({
    runtimeHealth: 'ok',
    connections: [connection({
      tools: [
        tool('vendaerp_search_products'),
        tool('vendaerp_get_product_stock', { allowedByEffectiveProfile: false }),
        tool('vendaerp_search_orders', { status: 'disabled' }),
      ],
    })],
  });

  assert.deepEqual(projection.supportedCapabilities, [
    'business.products.search',
    'business.products.price',
    'business.stock.read',
    'business.orders.search',
  ]);
  assert.deepEqual(projection.organizationEnabledCapabilities, [
    'business.products.search',
    'business.products.price',
  ]);
});

test('grant, install, connection health and host runtime readiness fail closed', () => {
  for (const sample of [
    { runtimeHealth: 'degraded', connection: connection() },
    { runtimeHealth: 'ok', connection: connection({ organizationGrantActive: false }) },
    { runtimeHealth: 'ok', connection: connection({ installedForAgent: false }) },
    { runtimeHealth: 'ok', connection: connection({ healthStatus: 'degraded' }) },
    { runtimeHealth: 'ok', connection: connection({ enabled: false }) },
  ]) {
    const [projection] = normalizePaperclipOperationalSnapshot({
      runtimeHealth: sample.runtimeHealth,
      connections: [sample.connection],
    });
    assert.equal(projection.connection.readiness, 'not_ready');
    assert.deepEqual(projection.organizationEnabledCapabilities, []);
  }
});

test('write/destructive evidence never advertises a read capability', () => {
  const [projection] = normalizePaperclipOperationalSnapshot({
    runtimeHealth: 'ok',
    connections: [connection({
      tools: [
        tool('vendaerp_search_products', {
          isReadOnly: false,
          isWrite: true,
          riskLevel: 'write',
        }),
        tool('vendaerp_search_orders', {
          isDestructive: true,
          riskLevel: 'destructive',
        }),
      ],
    })],
  });

  assert.deepEqual(projection.supportedCapabilities, []);
  assert.deepEqual(projection.organizationEnabledCapabilities, []);
  assert.equal(projection.connection.readiness, 'not_ready');
});

test('adapter consumes only managed agent lookup plus host operational snapshot', async () => {
  const calls = [];
  const ctx = {
    agents: {
      managed: {
        async get(catalogKey, companyId) {
          calls.push(['managed.get', catalogKey, companyId]);
          return {
            status: 'resolved',
            agentId: '11111111-1111-4111-8111-111111111111',
            agent: { id: '11111111-1111-4111-8111-111111111111' },
          };
        },
      },
    },
    toolAccess: {
      async readOperationalSnapshot(input) {
        calls.push(['toolAccess.readOperationalSnapshot', input]);
        return { runtimeHealth: 'ok', connections: [connection()] };
      },
    },
  };

  const result = await readManagedEmployeeIntegrationCapabilityProjection(ctx, 'company-a');
  assert.equal(result.length, 1);
  assert.deepEqual(calls, [
    ['managed.get', 'ana-commercial-v1', 'company-a'],
    ['toolAccess.readOperationalSnapshot', {
      companyId: 'company-a',
      agentId: '11111111-1111-4111-8111-111111111111',
    }],
  ]);
});

test('host capability denial is propagated and does not fall back to Board/db/state reads', async () => {
  const ctx = {
    agents: {
      managed: {
        async get() {
          return {
            status: 'resolved',
            agentId: '11111111-1111-4111-8111-111111111111',
            agent: { id: '11111111-1111-4111-8111-111111111111' },
          };
        },
      },
    },
    toolAccess: {
      async readOperationalSnapshot() {
        throw new Error('plugin_capability_denied:tools.operational.read');
      },
    },
  };

  await assert.rejects(
    readManagedEmployeeIntegrationCapabilityProjection(ctx, 'company-a'),
    /plugin_capability_denied:tools\.operational\.read/,
  );
});


test('projection strips Paperclip/provider object ids, secret refs and raw operational metadata', () => {
  const [projection] = normalizePaperclipOperationalSnapshot({
    runtimeHealth: 'ok',
    connections: [connection({
      connectionId: 'paperclip-connection-id-must-not-leak',
      grantId: 'paperclip-grant-id-must-not-leak',
      profileId: 'paperclip-profile-id-must-not-leak',
      secretRef: 'paperclip-secret-ref-must-not-leak',
      providerTenantId: 'provider-tenant-id-must-not-leak',
      tools: [
        {
          ...tool('vendaerp_search_products'),
          catalogEntryId: 'paperclip-catalog-id-must-not-leak',
          providerSchema: { private: true },
        },
      ],
    })],
  });

  const serialized = JSON.stringify(projection);
  for (const forbidden of [
    'connectionId',
    'grantId',
    'profileId',
    'secretRef',
    'providerTenantId',
    'catalogEntryId',
    'providerSchema',
    'paperclip-',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('removed or non-read catalog evidence cannot create semantic support', () => {
  const [projection] = normalizePaperclipOperationalSnapshot({
    runtimeHealth: 'ok',
    connections: [connection({
      tools: [
        tool('vendaerp_search_products', { status: 'removed' }),
        tool('vendaerp_search_orders', { riskLevel: 'high' }),
      ],
    })],
  });

  assert.deepEqual(projection.supportedCapabilities, []);
  assert.deepEqual(projection.organizationEnabledCapabilities, []);
  assert.equal(projection.connection.readiness, 'not_ready');
});

test('operator operational read returns only mapped provider-native operational fields', () => {
  const projection = projectPaperclipOperationalRead({
    runtimeHealth: 'ok',
    connections: [connection({
      connectionId: 'must-not-leak',
      secretRef: 'must-not-leak',
      providerTenantId: 'must-not-leak',
      tools: [
        {
          ...tool('vendaerp_search_products'),
          catalogEntryId: 'must-not-leak',
          providerSchema: { private: true },
        },
        tool('unmapped_private_tool', { isWrite: true }),
      ],
    })],
  });

  assert.deepEqual(projection, {
    runtimeHealth: 'ok',
    connections: [{
      displayName: 'VendaERP 28PRO',
      status: 'active',
      enabled: true,
      healthStatus: 'ok',
      organizationGrantActive: true,
      installedForAgent: true,
      tools: [{
        toolName: 'vendaerp_search_products',
        status: 'active',
        riskLevel: 'read',
        isReadOnly: true,
        isWrite: false,
        isDestructive: false,
        allowedByEffectiveProfile: true,
      }],
    }],
  });

  const serialized = JSON.stringify(projection);
  for (const forbidden of ['connectionId', 'catalogEntryId', 'secretRef', 'providerTenantId', 'providerSchema']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('operator data handler accepts the real host getData envelope while rejecting caller selectors', async () => {
  let handler;
  const calls = [];
  const ctx = {
    data: {
      register(key, fn) {
        assert.equal(key, OPERATIONAL_READ_DATA_KEY);
        handler = fn;
      },
    },
    agents: {
      managed: {
        async get(catalogKey, companyId) {
          calls.push(['managed.get', catalogKey, companyId]);
          return {
            status: 'resolved',
            agentId: '11111111-1111-4111-8111-111111111111',
            agent: { id: '11111111-1111-4111-8111-111111111111' },
          };
        },
      },
    },
    toolAccess: {
      async readOperationalSnapshot(input) {
        calls.push(['toolAccess.readOperationalSnapshot', input]);
        return { runtimeHealth: 'ok', connections: [connection()] };
      },
    },
  };

  registerManagedEmployeeOperationalReadData(ctx);
  assert.equal(typeof handler, 'function');

  await assert.rejects(() => handler({}), /operator_operational_read_invalid_company_scope/);
  await assert.rejects(
    () => handler({ companyId: 'company-a', agentId: 'caller-controlled' }),
    /operator_operational_read_invalid_company_scope/,
  );
  await assert.rejects(
    () => handler({
      companyId: 'company-a',
      renderEnvironment: null,
      agentId: 'caller-controlled',
    }),
    /operator_operational_read_invalid_company_scope/,
  );
  await assert.rejects(
    () => handler({ companyId: 'company-a', renderEnvironment: { source: 'caller-controlled' } }),
    /operator_operational_read_invalid_company_scope/,
  );

  const result = await handler({ companyId: 'company-a', renderEnvironment: null });
  assert.equal(result.runtimeHealth, 'ok');
  assert.equal(result.connections.length, 1);
  assert.equal(result.connections[0].tools.some((entry) => entry.toolName === 'vendaerp_search_products'), true);
  assert.deepEqual(calls, [
    ['managed.get', 'ana-commercial-v1', 'company-a'],
    ['toolAccess.readOperationalSnapshot', {
      companyId: 'company-a',
      agentId: '11111111-1111-4111-8111-111111111111',
    }],
  ]);
});


test('order customer contact capability is derived only when both existing read tools are available on the same connection', () => {
  for (const [tools, supported, enabled] of [
    [[tool('vendaerp_search_orders')], ['business.orders.search'], ['business.orders.search']],
    [[tool('vendaerp_search_parties')], ['business.parties.search'], ['business.parties.search']],
    [[tool('vendaerp_search_orders'), tool('vendaerp_search_parties')], [
      'business.parties.search',
      'business.orders.search',
      'business.orders.customer_contact.read',
    ], [
      'business.parties.search',
      'business.orders.search',
      'business.orders.customer_contact.read',
    ]],
    [[tool('vendaerp_search_orders'), tool('vendaerp_search_parties', { allowedByEffectiveProfile: false })], [
      'business.parties.search',
      'business.orders.search',
      'business.orders.customer_contact.read',
    ], ['business.orders.search']],
  ]) {
    const [projection] = normalizePaperclipOperationalSnapshot({
      runtimeHealth: 'ok',
      connections: [connection({ tools })],
    });
    assert.deepEqual(projection.supportedCapabilities, supported);
    assert.deepEqual(projection.organizationEnabledCapabilities, enabled);
  }
});
