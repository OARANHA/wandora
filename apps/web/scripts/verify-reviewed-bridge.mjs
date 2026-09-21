import { readFile } from 'node:fs/promises';
import ts from 'typescript';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nginx = await readFile(new URL('../nginx.conf', import.meta.url), 'utf8');
const digitalEmployeesLocation =
  /location ~ "\^\/api\/v1\/organizations\/\[0-9A-Fa-f\][\s\S]*?\/digital-employees\$" \{([\s\S]*?)\n  \}/
    .exec(nginx)?.[1];

if (!digitalEmployeesLocation) {
  throw new Error('digital_employees_bridge_missing');
}
if (!digitalEmployeesLocation.includes('proxy_set_header Authorization $http_authorization;')) {
  throw new Error('digital_employees_authorization_forwarding_missing');
}
if (!digitalEmployeesLocation.includes('proxy_set_header Idempotency-Key $http_idempotency_key;')) {
  throw new Error('digital_employees_idempotency_forwarding_missing');
}
if (!digitalEmployeesLocation.includes('proxy_set_header Cookie "";')) {
  throw new Error('digital_employees_cookie_stripping_missing');
}
if (!nginx.includes('location /api/ {\n    return 404;\n  }')) {
  throw new Error('generic_api_boundary_not_closed');
}

console.log('WANDORA_WEB_DIGITAL_EMPLOYEE_HIRE_BRIDGE_V1_OK');
const digitalEmployeeActivationLocation =
  /location ~ "\^\/api\/v1\/organizations\/\[0-9A-Fa-f\][\s\S]*?\/digital-employees\/\[0-9A-Fa-f\][\s\S]*?\/activate\$" \{([\s\S]*?)\n  \}/
    .exec(nginx)?.[1];

if (!digitalEmployeeActivationLocation) {
  throw new Error('digital_employee_activation_bridge_missing');
}
if (!digitalEmployeeActivationLocation.includes('proxy_set_header Authorization $http_authorization;')) {
  throw new Error('digital_employee_activation_authorization_forwarding_missing');
}
if (!digitalEmployeeActivationLocation.includes('proxy_set_header Cookie "";')) {
  throw new Error('digital_employee_activation_cookie_stripping_missing');
}
if (digitalEmployeeActivationLocation.includes('Idempotency-Key')) {
  throw new Error('digital_employee_activation_must_not_forward_hire_idempotency');
}

console.log('WANDORA_WEB_DIGITAL_EMPLOYEE_ACTIVATION_BRIDGE_V1_OK');


const [startPage, teamPage] = await Promise.all([
  readFile(new URL('../src/pages/StartPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/TeamPage.tsx', import.meta.url), 'utf8'),
]);

const requiredStartPageFragments = [
  "queryKey: ['digital-employees', activeOrganization?.id]",
  'availabilityQuery.data?.hire',
  "hire.state === 'reconciliation-required'",
  'peekHireOperation(activeOrganization.id)',
  'resolveHireOperation(activeOrganization.id, hireOperationRef.current)',
  "'Idempotency-Key': operation.idempotencyKey",
  'body: JSON.stringify({ catalogKey: HIRE_CATALOG_KEY })',
  'clearHireOperation(operation)',
  'hireOperationRef.current = null',
  "queryKey: ['digital-employees', organizationId]",
  'activeOrganizationIdRef.current === organizationId',
  'retryOrganizationMismatch',
  '!actionEnabled',
  'operation.organizationId',
];

for (const fragment of requiredStartPageFragments) {
  if (!startPage.includes(fragment)) {
    throw new Error(`customer_hire_browser_contract_missing:${fragment}`);
  }
}

const requiredTeamPageFragments = [
  "queryKey: ['digital-employees', activeOrganization?.id]",
  "hire?.available || hire?.state === 'reconciliation-required'",
  'showHireAction',
  "hire?.state === 'reconciliation-required' ? 'Revisar contratação' : 'Contratar Ana'",
  "/digital-employees/${employeeId}/activate",
  "{ method: 'POST' }",
  "employee.activation.available",
  "Não inicia trabalho",
  "não libera envios externos",
];

for (const fragment of requiredTeamPageFragments) {
  if (!teamPage.includes(fragment)) {
    throw new Error(`customer_hire_team_gate_missing:${fragment}`);
  }
}
if (teamPage.includes('providerAgentId') || teamPage.includes('paperclip')) {
  throw new Error('digital_employee_activation_provider_identifier_leak');
}

const validationIndex = startPage.indexOf("if (!employee?.id || employee.name !== 'Ana')");
const clearIndex = startPage.indexOf('clearHireOperation(operation);');
assert(validationIndex >= 0, 'customer_hire_success_validation_missing');
assert(clearIndex > validationIndex, 'customer_hire_idempotency_cleared_before_response_validation');
assert(
  startPage.split('clearHireOperation(operation);').length - 1 === 1,
  'customer_hire_idempotency_clear_must_be_success_only',
);

const helperSource = await readFile(
  new URL('../src/customerHireOperation.ts', import.meta.url),
  'utf8',
);
const compiledHelper = ts.transpileModule(helperSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;

const helper = await import(
  `data:text/javascript;base64,${Buffer.from(compiledHelper).toString('base64')}`
);
const {
  HIRE_CATALOG_KEY,
  HireError,
  clearHireOperation,
  peekHireOperation,
  resolveHireOperation,
} = helper;

assert(HIRE_CATALOG_KEY === 'ana-commercial-v1', 'customer_hire_catalog_key_changed');

function createMemoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function expectHireError(fn, expectedCode, label, expectedOrganizationId = null) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert(thrown instanceof HireError, `${label}:expected_hire_error`);
  assert(thrown.code === expectedCode, `${label}:unexpected_code:${thrown?.code}`);
  if (expectedOrganizationId !== null) {
    assert(
      thrown.organizationId === expectedOrganizationId,
      `${label}:unexpected_organization:${thrown?.organizationId}`,
    );
  }
}

const storage = createMemoryStorage();
const uuidA = '11111111-1111-4111-8111-111111111111';
const uuidB = '22222222-2222-4222-9222-222222222222';

assert(
  peekHireOperation('org-empty', { storage }) === null,
  'customer_hire_peek_empty_must_not_create_operation',
);

let uuidCalls = 0;
const opA = resolveHireOperation('org-a', null, {
  storage,
  randomUUID: () => {
    uuidCalls += 1;
    return uuidA;
  },
});
assert(opA.idempotencyKey === uuidA, 'customer_hire_first_key_not_generated');
assert(uuidCalls === 1, 'customer_hire_first_key_generation_count_invalid');
assert(
  storage.getItem(opA.storageKey) === uuidA,
  'customer_hire_first_key_not_persisted',
);

const peekedA = peekHireOperation('org-a', { storage });
assert(peekedA?.idempotencyKey === uuidA, 'customer_hire_peek_did_not_recover_key');
assert(peekedA?.organizationId === 'org-a', 'customer_hire_peek_changed_tenant');

const inaccessibleStorage = {
  getItem() { throw new Error('must-not-read'); },
  setItem() { throw new Error('must-not-write'); },
  removeItem() { throw new Error('must-not-remove'); },
};

const sameRenderOp = resolveHireOperation('org-a', opA, {
  storage: inaccessibleStorage,
  randomUUID: () => {
    throw new Error('must-not-regenerate');
  },
});
assert(
  sameRenderOp.idempotencyKey === uuidA,
  'customer_hire_same_render_key_changed',
);

const reloadOp = resolveHireOperation('org-a', null, {
  storage,
  randomUUID: () => {
    throw new Error('reload_must_reuse_session_key');
  },
});
assert(
  reloadOp.idempotencyKey === uuidA,
  'customer_hire_reload_did_not_reuse_session_key',
);

const opB = resolveHireOperation('org-b', opA, {
  storage,
  randomUUID: () => uuidB,
});
assert(opB.idempotencyKey === uuidB, 'customer_hire_other_tenant_key_not_generated');
assert(opB.storageKey !== opA.storageKey, 'customer_hire_tenant_storage_key_collision');
assert(
  storage.getItem(opA.storageKey) === uuidA && storage.getItem(opB.storageKey) === uuidB,
  'customer_hire_tenant_keys_not_isolated',
);

expectHireError(
  () => peekHireOperation('org-peek-fail', {
    storage: {
      getItem() { throw new Error('blocked'); },
      setItem() {},
      removeItem() {},
    },
  }),
  'idempotency-storage-unavailable',
  'customer_hire_peek_storage_failure',
  'org-peek-fail',
);

expectHireError(
  () => resolveHireOperation('org-read-fail', null, {
    storage: {
      getItem() { throw new Error('blocked'); },
      setItem() {},
      removeItem() {},
    },
    randomUUID: () => uuidA,
  }),
  'idempotency-storage-unavailable',
  'customer_hire_storage_read_failure',
  'org-read-fail',
);

expectHireError(
  () => resolveHireOperation('org-write-fail', null, {
    storage: {
      getItem() { return null; },
      setItem() { throw new Error('blocked'); },
      removeItem() {},
    },
    randomUUID: () => uuidA,
  }),
  'idempotency-storage-unavailable',
  'customer_hire_storage_write_failure',
  'org-write-fail',
);

const invalidStorage = createMemoryStorage();
const invalidStorageKey =
  `wandora:customer-hire:idempotency:v1:org-invalid:${HIRE_CATALOG_KEY}`;
invalidStorage.setItem(invalidStorageKey, 'not-a-valid-operation-key');
expectHireError(
  () => peekHireOperation('org-invalid', { storage: invalidStorage }),
  'idempotency-storage-invalid',
  'customer_hire_invalid_stored_key',
  'org-invalid',
);

expectHireError(
  () => resolveHireOperation('org-generator-invalid', null, {
    storage: createMemoryStorage(),
    randomUUID: () => 'not-a-uuid',
  }),
  'idempotency-generation-invalid',
  'customer_hire_invalid_generated_key',
  'org-generator-invalid',
);

clearHireOperation(opA, storage);
assert(storage.getItem(opA.storageKey) === null, 'customer_hire_success_key_not_cleared');
assert(
  peekHireOperation('org-a', { storage }) === null,
  'customer_hire_cleared_key_still_peekable',
);
assert(
  storage.getItem(opB.storageKey) === uuidB,
  'customer_hire_success_clear_crossed_tenant_boundary',
);

clearHireOperation(opB, {
  getItem() { return null; },
  setItem() {},
  removeItem() { throw new Error('blocked'); },
});

console.log('WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK');
console.log('WANDORA_WEB_CUSTOMER_HIRE_TENANT_AVAILABILITY_V1_OK');


const [workPanelSource, workHelperSource] = await Promise.all([
  readFile(new URL('../src/components/DigitalEmployeeWorkPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/customerWorkOperation.ts', import.meta.url), 'utf8'),
]);

const requiredWorkPanelFragments = [
  'resolveWorkOperation(',
  "'idempotency-key': operation.idempotencyKey",
  'clearWorkOperation(operation)',
  'workOperationRef.current = null',
  'Repita exatamente a mesma solicitação',
  "body?.error === 'employee-work-uncertain'",
];
for (const fragment of requiredWorkPanelFragments) {
  if (!workPanelSource.includes(fragment)) {
    throw new Error(`customer_work_browser_contract_missing:${fragment}`);
  }
}
assert(
  workPanelSource.includes("response.status === 400 || response.status === 403 || response.status === 404")
    && !workPanelSource.includes("response.status === 400 || response.status === 403 || response.status === 404 || response.status === 503"),
  'customer_work_503_must_preserve_original_idempotency_key',
);
assert(
  workPanelSource.includes("if (response.status === 503)")
    && workPanelSource.includes("a identidade original será reutilizada"),
  'customer_work_503_same_request_retry_contract_missing',
);

const workClearIndex = workPanelSource.indexOf('clearWorkOperation(operation);');
const workSuccessIndex = workPanelSource.indexOf('if (response.ok)');
assert(workSuccessIndex >= 0, 'customer_work_success_boundary_missing');
assert(workClearIndex > workSuccessIndex, 'customer_work_idempotency_cleared_before_success_validation');
assert(
  !workHelperSource.includes('title: string;\n  description: string;\n  storageKey:'),
  'customer_work_storage_must_not_persist_plaintext_content',
);

const compiledWorkHelper = ts.transpileModule(workHelperSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const workHelper = await import(
  `data:text/javascript;base64,${Buffer.from(compiledWorkHelper).toString('base64')}`
);
const {
  WorkOperationError,
  clearWorkOperation,
  peekWorkOperation,
  resolveWorkOperation,
} = workHelper;

function expectWorkErrorAsync(promise, expectedCode, label) {
  return promise.then(
    () => { throw new Error(`${label}:expected_work_error`); },
    (error) => {
      assert(error instanceof WorkOperationError, `${label}:unexpected_error_type`);
      assert(error.code === expectedCode, `${label}:unexpected_code:${error?.code}`);
    },
  );
}

const workStorage = createMemoryStorage();
const workUuidA = '33333333-3333-4333-8333-333333333333';
const workUuidB = '44444444-4444-4444-8444-444444444444';
let workUuidCalls = 0;
const workA = await resolveWorkOperation(
  'org-work-a',
  'employee-work-a',
  'Preparar resumo',
  'Resultado interno supervisionado.',
  null,
  {
    storage: workStorage,
    randomUUID: () => {
      workUuidCalls += 1;
      return workUuidA;
    },
  },
);
assert(workUuidCalls === 1, 'customer_work_first_key_generation_count_invalid');
assert(workA.idempotencyKey === workUuidA, 'customer_work_first_key_not_generated');
assert(
  !String(workStorage.getItem(workA.storageKey)).includes('Preparar resumo')
    && !String(workStorage.getItem(workA.storageKey)).includes('Resultado interno supervisionado.'),
  'customer_work_plaintext_leaked_to_session_storage',
);

const peekedWorkA = peekWorkOperation('org-work-a', 'employee-work-a', { storage: workStorage });
assert(peekedWorkA?.idempotencyKey === workUuidA, 'customer_work_peek_did_not_recover_key');

const reloadedWorkA = await resolveWorkOperation(
  'org-work-a',
  'employee-work-a',
  'Preparar resumo',
  'Resultado interno supervisionado.',
  null,
  {
    storage: workStorage,
    randomUUID: () => { throw new Error('reload_must_not_regenerate_work_key'); },
  },
);
assert(reloadedWorkA.idempotencyKey === workUuidA, 'customer_work_reload_changed_key');

await expectWorkErrorAsync(
  resolveWorkOperation(
    'org-work-a',
    'employee-work-a',
    'Outra solicitação',
    'Resultado diferente.',
    null,
    { storage: workStorage, randomUUID: () => workUuidB },
  ),
  'pending-request-conflict',
  'customer_work_changed_request_while_pending',
);

const concurrentStorage = createMemoryStorage();
let concurrentUuidCalls = 0;
const concurrentIds = [workUuidA, workUuidB];
const [concurrentA, concurrentB] = await Promise.all([
  resolveWorkOperation('org-concurrent', 'employee-concurrent', 'Mesmo trabalho', 'Mesmo conteúdo.', null, {
    storage: concurrentStorage,
    randomUUID: () => concurrentIds[concurrentUuidCalls++],
  }),
  resolveWorkOperation('org-concurrent', 'employee-concurrent', 'Mesmo trabalho', 'Mesmo conteúdo.', null, {
    storage: concurrentStorage,
    randomUUID: () => concurrentIds[concurrentUuidCalls++],
  }),
]);
assert(concurrentA.idempotencyKey === concurrentB.idempotencyKey, 'customer_work_double_click_changed_key');
assert(concurrentUuidCalls === 1, 'customer_work_double_click_generated_multiple_keys');

const otherEmployee = await resolveWorkOperation(
  'org-work-a',
  'employee-work-b',
  'Preparar resumo',
  'Resultado interno supervisionado.',
  null,
  { storage: workStorage, randomUUID: () => workUuidB },
);
assert(otherEmployee.idempotencyKey === workUuidB, 'customer_work_employee_scope_not_isolated');
assert(otherEmployee.storageKey !== workA.storageKey, 'customer_work_employee_storage_collision');

clearWorkOperation(workA, workStorage);
assert(
  peekWorkOperation('org-work-a', 'employee-work-a', { storage: workStorage }) === null,
  'customer_work_success_key_not_cleared',
);
assert(
  peekWorkOperation('org-work-a', 'employee-work-b', { storage: workStorage })?.idempotencyKey === workUuidB,
  'customer_work_clear_crossed_employee_boundary',
);

console.log('WANDORA_WEB_CUSTOMER_WORK_BROWSER_IDEMPOTENCY_V1_OK');
