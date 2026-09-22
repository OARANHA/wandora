import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nginx = await readFile(new URL('../nginx.conf', import.meta.url), 'utf8');
const uuid = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}';

function locationBlock(pattern, label) {
  const header = 'location ~ "^' + pattern + '$" {';
  const start = nginx.indexOf(header);
  assert(start >= 0, label + '_location_missing');
  const bodyStart = start + header.length;
  const end = nginx.indexOf('\n  }', bodyStart);
  assert(end >= 0, label + '_location_unterminated');
  return nginx.slice(bodyStart, end);
}

function assertProxyContract(block, label, idempotency) {
  assert(block.includes('proxy_pass http://wandora-core:8788;'), label + '_core_proxy_missing');
  assert(block.includes('proxy_set_header Authorization $http_authorization;'), label + '_authorization_forwarding_missing');
  assert(block.includes('proxy_set_header Cookie "";'), label + '_cookie_stripping_missing');
  assert(block.includes('proxy_set_header Connection "";'), label + '_connection_header_contract_missing');
  assert(!block.includes('proxy_method '), label + '_method_override_forbidden');
  assert(!block.includes('proxy_pass_request_body off'), label + '_request_body_disable_forbidden');
  assert(!block.includes('proxy_set_body '), label + '_request_body_override_forbidden');
  assert(!block.includes('limit_except'), label + '_nginx_method_gate_forbidden');
  if (idempotency) {
    assert(
      block.includes('proxy_set_header Idempotency-Key $http_idempotency_key;'),
      label + '_idempotency_forwarding_missing',
    );
  }
}

const base = '/api/v1/organizations/' + uuid + '/grounding';
const entry = base + '/' + uuid;
const readCreate = locationBlock(base, 'grounding_read_create');
const retire = locationBlock(entry + '/retire', 'grounding_retire');
const correct = locationBlock(entry + '/correct', 'grounding_correct');

assertProxyContract(readCreate, 'grounding_read_create', true);
assertProxyContract(retire, 'grounding_retire', true);
assertProxyContract(correct, 'grounding_correct', true);

// Nginx preserves the incoming HTTP method/body by default; Core remains
// authoritative for GET+POST on base and POST on retire/correct.
assert(nginx.includes('location = /api/v1/me {'), 'existing_me_bridge_missing');
assert(nginx.includes('/work/attention-required$" {'), 'existing_work_bridge_missing');
assert(nginx.includes('/conversations$" {'), 'existing_conversations_list_bridge_missing');
assert(
  nginx.includes('/conversations/' + uuid + '$" {'),
  'existing_conversation_detail_bridge_missing',
);
assert(
  nginx.includes('location /api/ {\n    return 404;\n  }'),
  'generic_api_boundary_not_closed',
);
assert(
  !nginx.includes('location /api/ {\n    proxy_pass'),
  'generic_api_proxy_forbidden',
);

const groundingLocationHeaders = nginx
  .split('\n')
  .filter((line) => line.trim().startsWith('location ') && line.includes('/grounding'));
assert(groundingLocationHeaders.length === 3, 'unexpected_grounding_proxy_surface');

console.log('WANDORA_WEB_GROUNDING_API_BRIDGE_V1_OK');
