import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';
import { createRuntimeReadinessChecker } from '../src/runtime/readiness.js';

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

function fakePool(options: { bridgeFails?: boolean; groundingFails?: boolean; developmentFails?: boolean } = {}): {
  pool: Pool;
  queries: string[];
} {
  const queries: string[] = [];
  const pool = {
    async query(sql: string): Promise<QueryResult> {
      queries.push(sql);
      if (sql.includes('current_core_organization_id')) {
        return { rows: [{ current_user: 'wandora_core_runtime', organization_scope: null }] };
      }
      if (sql.includes('resolve_paperclip_execution_organization')) {
        if (options.bridgeFails) throw new Error('resolver unavailable');
        return { rows: [{ organization_id: null }] };
      }
      if (sql.includes('organization_grounding_entries')) {
        if (options.groundingFails) throw new Error('grounding unavailable');
        return { rows: [] };
      }
      if (sql.includes('digital_employee_development_entries')) {
        if (options.developmentFails) throw new Error('development unavailable');
        return { rows: [] };
      }
      return { rows: [] };
    },
  } as unknown as Pool;
  return { pool, queries };
}

test('Paperclip bridge readiness does not probe bridge/grounding migrations while capability is disabled', async () => {
  const { pool, queries } = fakePool();
  const checkReady = createRuntimeReadinessChecker(pool);
  assert.deepEqual(await checkReady(), { ready: true });
  assert.equal(queries.some((sql) => sql.includes('resolve_paperclip_execution_organization')), false);
  assert.equal(queries.some((sql) => sql.includes('organization_grounding_entries')), false);
  assert.equal(queries.some((sql) => sql.includes('digital_employee_development_entries')), false);
});

test('Paperclip bridge readiness proves bridge resolver and grounding projection boundaries are callable', async () => {
  const { pool, queries } = fakePool();
  const checkReady = createRuntimeReadinessChecker(pool, {
    paperclipExecutionBridgeEnabled: true,
  });
  assert.deepEqual(await checkReady(), { ready: true });
  assert.equal(queries.some((sql) => sql.includes('resolve_paperclip_execution_organization')), true);
  assert.equal(queries.some((sql) => sql.includes('organization_grounding_entries')), true);
  assert.equal(queries.some((sql) => sql.includes('digital_employee_development_entries')), true);
});

test('Paperclip bridge readiness fails closed when the migration 014 resolver is unavailable', async () => {
  const { pool } = fakePool({ bridgeFails: true });
  const checkReady = createRuntimeReadinessChecker(pool, {
    paperclipExecutionBridgeEnabled: true,
  });
  assert.deepEqual(await checkReady(), {
    ready: false,
    reason: 'paperclip-execution-bridge-database-boundary-unavailable',
  });
});


test('Paperclip bridge readiness fails closed when migration 017 grounding read boundary is unavailable', async () => {
  const { pool } = fakePool({ groundingFails: true });
  const checkReady = createRuntimeReadinessChecker(pool, {
    paperclipExecutionBridgeEnabled: true,
  });
  assert.deepEqual(await checkReady(), {
    ready: false,
    reason: 'organization-grounding-runtime-boundary-unavailable',
  });
});


test('Paperclip bridge readiness fails closed when migration 020 employee development boundary is unavailable', async () => {
  const { pool } = fakePool({ developmentFails: true });
  const checkReady = createRuntimeReadinessChecker(pool, {
    paperclipExecutionBridgeEnabled: true,
  });
  assert.deepEqual(await checkReady(), {
    ready: false,
    reason: 'digital-employee-development-runtime-boundary-unavailable',
  });
});
