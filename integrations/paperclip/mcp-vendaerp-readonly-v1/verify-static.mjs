import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { TOOL_DEFINITIONS, VENDAERP_ORIGIN } from './server.mjs';

const source = await readFile(new URL('./server.mjs', import.meta.url), 'utf8');
assert.equal(VENDAERP_ORIGIN, 'https://whitelabel.vendaerp.com.br');
assert.equal(TOOL_DEFINITIONS.length, 8);
assert.equal(source.includes("method: 'POST'"), false);
assert.equal(source.includes("method: 'PUT'"), false);
assert.equal(source.includes("method: 'PATCH'"), false);
assert.equal(source.includes("method: 'DELETE'"), false);
assert.equal(source.includes("method: 'GET'"), true);
for (const tool of TOOL_DEFINITIONS) {
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.annotations.destructiveHint, false);
}
console.log('WANDORA_VENDAERP_READONLY_MCP_V1_OK');