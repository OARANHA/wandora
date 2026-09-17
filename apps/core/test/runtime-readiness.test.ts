import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';
import { createRuntimeReadinessChecker } from '../src/runtime/readiness.js';

test('standard database readiness remains unchanged when Organization Adapter is disabled', async () => {
  const calls: string[] = [];
  const pool = {
    query: async (sql: string) => {
      calls.push(sql);
      return { rows: [{ current_user: 'wandora_core_runtime', organization_scope: null }] };
    },
  } as unknown as Pool;

  const ready = await createRuntimeReadinessChecker(pool)();
  assert.deepEqual(ready, { ready: true });
  assert.equal(calls.length, 1);
});

test('Organization Adapter candidate readiness requires the activated private DB boundary', async () => {
  let call = 0;
  const pool = {
    query: async (sql: string) => {
      call += 1;
      if (call === 1) {
        return { rows: [{ current_user: 'wandora_core_runtime', organization_scope: null }] };
      }
      assert.match(sql, /control_plane_provider_bindings/);
      assert.match(sql, /digital_employee_provider_bindings/);
      assert.match(sql, /digital_employee_hire_operations/);
      throw new Error('permission denied');
    },
  } as unknown as Pool;

  const ready = await createRuntimeReadinessChecker(pool, { organizationAdapterEnabled: true })();
  assert.deepEqual(ready, {
    ready: false,
    reason: 'organization-adapter-database-boundary-unavailable',
  });
  assert.equal(call, 2);
});

test('Organization Adapter candidate becomes ready when its private DB boundary is accessible', async () => {
  let call = 0;
  const pool = {
    query: async () => {
      call += 1;
      if (call === 1) {
        return { rows: [{ current_user: 'wandora_core_runtime', organization_scope: null }] };
      }
      return { rows: [] };
    },
  } as unknown as Pool;

  const ready = await createRuntimeReadinessChecker(pool, { organizationAdapterEnabled: true })();
  assert.deepEqual(ready, { ready: true });
  assert.equal(call, 2);
});
