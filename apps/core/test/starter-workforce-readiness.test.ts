import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyStarterWorkforce } from '../src/supervision/human-starter-workforce-readiness.js';

const base = {
  eligibilityEnabled: false,
  controlBindingCount: 0,
  hireStatus: null,
  matchingEmployeeCount: 0,
  boundEmployeeCount: 0,
  employeeStatus: null,
} as const;

test('starter workforce requires commercial activation policy before provider bootstrap', () => {
  const result = classifyStarterWorkforce({ ...base });
  assert.equal(result.state, 'commercial-activation-required');
  assert.equal(result.ready, false);
  assert.equal(result.starterProvisioningAllowed, false);
  assert.deepEqual(result.starter, { catalogKey: 'ana-commercial-v1', name: 'Ana', status: 'absent' });
});

test('starter workforce sequences provider company before hire', () => {
  assert.equal(classifyStarterWorkforce({ ...base, eligibilityEnabled: true }).state, 'provider-company-required');
  assert.equal(classifyStarterWorkforce({ ...base, eligibilityEnabled: true, controlBindingCount: 1 }).state, 'hire-required');
});

test('completed paused starter requires activation and active starter is ready', () => {
  const completed = {
    ...base, eligibilityEnabled: true, controlBindingCount: 1, hireStatus: 'completed' as const,
    matchingEmployeeCount: 1, boundEmployeeCount: 1,
  };
  const paused = classifyStarterWorkforce({ ...completed, employeeStatus: 'paused' });
  assert.equal(paused.state, 'activation-required');
  assert.equal(paused.ready, false);
  assert.equal(paused.starter.status, 'paused');

  const active = classifyStarterWorkforce({ ...completed, employeeStatus: 'active' });
  assert.equal(active.state, 'ready');
  assert.equal(active.ready, true);
  assert.equal(active.starter.status, 'active');
});

test('unfinished hire and inconsistent durable/provider projections fail closed', () => {
  for (const hireStatus of ['planned', 'creating', 'uncertain'] as const) {
    assert.equal(classifyStarterWorkforce({ ...base, eligibilityEnabled: true, controlBindingCount: 1, hireStatus }).state, 'reconciliation-required');
  }
  assert.equal(classifyStarterWorkforce({ ...base, matchingEmployeeCount: 1 }).state, 'reconciliation-required');
  assert.equal(classifyStarterWorkforce({ ...base, eligibilityEnabled: true, controlBindingCount: 2 }).state, 'reconciliation-required');
  assert.equal(classifyStarterWorkforce({
    ...base, eligibilityEnabled: true, controlBindingCount: 1, hireStatus: 'completed',
    matchingEmployeeCount: 1, boundEmployeeCount: 0, employeeStatus: 'paused',
  }).state, 'reconciliation-required');
});
