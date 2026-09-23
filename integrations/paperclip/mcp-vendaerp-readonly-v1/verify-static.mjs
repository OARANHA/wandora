import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import {
  TOOL_DEFINITIONS,
  VENDAERP_HOST_SUFFIX,
  vendaErpOriginForTenant,
} from './server.mjs';

const source = await readFile(new URL('./server.mjs', import.meta.url), 'utf8');
assert.equal(VENDAERP_HOST_SUFFIX, '.vendaerp.com.br');
assert.equal(vendaErpOriginForTenant('voepro'), 'https://voepro.vendaerp.com.br');
assert.throws(() => vendaErpOriginForTenant('https://evil.example'));
assert.equal(TOOL_DEFINITIONS.length, 8);
assert.equal(source.includes("method: 'POST'"), false);
assert.equal(source.includes("method: 'PUT'"), false);
assert.equal(source.includes("method: 'PATCH'"), false);
assert.equal(source.includes("method: 'DELETE'"), false);
assert.equal(source.includes("method: 'GET'"), true);
for (const tool of TOOL_DEFINITIONS) {
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.annotations.destructiveHint, false);
  assert.equal('tenant' in tool.inputSchema.properties, false);
  assert.equal('url' in tool.inputSchema.properties, false);
  assert.equal('method' in tool.inputSchema.properties, false);
}
console.log('WANDORA_VENDAERP_READONLY_MCP_V1_OK');
