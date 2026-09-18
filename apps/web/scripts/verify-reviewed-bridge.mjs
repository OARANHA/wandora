import { readFile } from 'node:fs/promises';

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

const startPage = await readFile(new URL('../src/pages/StartPage.tsx', import.meta.url), 'utf8');
const requiredHireIdempotencyFragments = [
  "const HIRE_CATALOG_KEY = 'ana-commercial-v1' as const;",
  'wandora:customer-hire:idempotency:v1:',
  'window.sessionStorage.getItem(storageKey)',
  'window.sessionStorage.setItem(storageKey, idempotencyKey)',
  "'Idempotency-Key': operation.idempotencyKey",
  'body: JSON.stringify({ catalogKey: HIRE_CATALOG_KEY })',
  'window.sessionStorage.removeItem(operation.storageKey)',
  'hireOperationRef.current = null',
  "queryKey: ['digital-employees', organizationId]",
];

for (const fragment of requiredHireIdempotencyFragments) {
  if (!startPage.includes(fragment)) {
    throw new Error(`customer_hire_browser_idempotency_contract_missing:${fragment}`);
  }
}

if (startPage.includes('useRef<string | null>(null)')) {
  throw new Error('customer_hire_browser_idempotency_not_tenant_scoped');
}
if (!startPage.includes('current?.organizationId === organizationId')) {
  throw new Error('customer_hire_browser_idempotency_tenant_scope_missing');
}
if (!startPage.includes('idempotency-storage-unavailable')) {
  throw new Error('customer_hire_browser_idempotency_storage_fail_closed_missing');
}

console.log('WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK');

