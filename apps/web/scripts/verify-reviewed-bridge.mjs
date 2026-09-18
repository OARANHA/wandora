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
