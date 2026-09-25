import assert from 'node:assert/strict';
import test from 'node:test';
import {
  projectFastReadCapabilities,
  projectOrganizationIntegrationCapabilities,
} from '../src/integrations/capability-plane.js';

test('keeps provider support, organization availability and run authorization as separate layers', () => {
  const integration = projectOrganizationIntegrationCapabilities({
    integrationKind: 'business_system',
    displayName: 'VendaERP',
    connection: { health: 'healthy', readiness: 'ready' },
    supportedCapabilities: [
      'business.products.search',
      'business.products.price',
      'business.stock.read',
      'business.orders.search',
    ],
    organizationEnabledCapabilities: [
      'business.products.price',
      'business.stock.read',
      'business.orders.search',
    ],
  });

  assert.deepEqual(integration.supportedCapabilities, [
    'business.products.search',
    'business.products.price',
    'business.stock.read',
    'business.orders.search',
  ]);
  assert.deepEqual(integration.availableCapabilities, [
    'business.products.price',
    'business.stock.read',
    'business.orders.search',
  ]);

  assert.deepEqual(projectFastReadCapabilities(integration, [
    'business.products.price',
    'business.companies.list',
  ]), ['business.products.price']);
});

test('connection readiness fails closed without erasing what the integration supports', () => {
  const integration = projectOrganizationIntegrationCapabilities({
    integrationKind: 'business_system',
    displayName: 'ERP de referência',
    connection: { health: 'degraded', readiness: 'not_ready' },
    supportedCapabilities: [
      'business.products.search',
      'business.stock.read',
    ],
    organizationEnabledCapabilities: [
      'business.products.search',
      'business.stock.read',
    ],
  });

  assert.deepEqual(integration.supportedCapabilities, [
    'business.products.search',
    'business.stock.read',
  ]);
  assert.deepEqual(integration.availableCapabilities, []);
  assert.deepEqual(projectFastReadCapabilities(integration, [
    'business.products.search',
  ]), []);
});

test('filters unknown capability strings and canonicalizes duplicates instead of becoming a tool registry', () => {
  const integration = projectOrganizationIntegrationCapabilities({
    integrationKind: 'business_system',
    displayName: 'Business System',
    connection: { health: 'healthy', readiness: 'ready' },
    supportedCapabilities: [
      'provider.tool.search-products',
      'business.stock.read',
      'business.products.search',
      'business.stock.read',
    ],
    organizationEnabledCapabilities: [
      'business.stock.read',
      'business.products.search',
      'provider.tool.search-products',
    ],
  });

  assert.deepEqual(integration.supportedCapabilities, [
    'business.products.search',
    'business.stock.read',
  ]);
  assert.deepEqual(integration.availableCapabilities, [
    'business.products.search',
    'business.stock.read',
  ]);
  assert.equal(JSON.stringify(integration).includes('provider.tool.search-products'), false);
});

test('runtime authorization cannot add a capability that the organization projection did not enable', () => {
  const integration = projectOrganizationIntegrationCapabilities({
    integrationKind: 'business_system',
    displayName: 'Business System',
    connection: { health: 'healthy', readiness: 'ready' },
    supportedCapabilities: [
      'business.products.search',
      'business.orders.search',
    ],
    organizationEnabledCapabilities: [
      'business.products.search',
    ],
  });

  assert.deepEqual(projectFastReadCapabilities(integration, [
    'business.products.search',
    'business.orders.search',
  ]), ['business.products.search']);
});

test('rejects empty or unbounded display names', () => {
  for (const displayName of ['', ' '.repeat(10), 'x'.repeat(161)]) {
    assert.throws(() => projectOrganizationIntegrationCapabilities({
      integrationKind: 'business_system',
      displayName,
      connection: { health: 'unknown', readiness: 'unknown' },
      supportedCapabilities: [],
      organizationEnabledCapabilities: [],
    }), /integration_capability_display_name_invalid/);
  }
});
