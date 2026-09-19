import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';
import { createRuntimeReadinessChecker } from '../src/runtime/readiness.js';

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

function fakePool(options: { bridgeFails?: boolean } = {}): {
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
      return { rows: [] };
    },
  } as unknown as Pool;
  return { pool, queries };
}

test('Paperclip bridge readiness does not probe migration 014 while capability is disabled', async () => {
  const { pool, queries } = fakePool();
  const checkReady = createRuntimeReadinessChecker(pool);
  assert.deepEqual(await checkReady(), { ready: true });
  assert.equal(queries.some((sql) => sql.includes('resolve_paperclip_execution_organization')), false);
});

test('Paperclip bridge readiness proves the migration 014 resolver is callable', async () => {
  const { pool, queries } = fakePool();
  const checkReady = createRuntimeReadinessChecker(pool, {
    paperclipExecutionBridgeEnabled: true,
  });
  assert.deepEqual(await checkReady(), { ready: true });
  assert.equal(queries.some((sql) => sql.includes('resolve_paperclip_execution_organization')), true);
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
