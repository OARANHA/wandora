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
