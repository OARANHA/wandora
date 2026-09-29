import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const paperclipRoot = process.env.PAPERCLIP_ROOT;
if (!paperclipRoot) throw new Error('PAPERCLIP_ROOT is required');

const server = await readFile(path.join(paperclipRoot, 'server/src/routes/plugins.ts'), 'utf8');
const worker = await readFile(path.join(paperclipRoot, 'packages/plugins/sdk/src/worker-rpc-host.ts'), 'utf8');
const protocol = await readFile(path.join(paperclipRoot, 'packages/plugins/sdk/src/protocol.ts'), 'utf8');

const scopeStart = server.indexOf('function assertPluginBridgeScope');
const scopeEnd = server.indexOf('function requirePluginConfigCompanyId', scopeStart);
assert.ok(scopeStart >= 0 && scopeEnd > scopeStart, 'plugin_bridge_scope_boundary_missing');
const scope = server.slice(scopeStart, scopeEnd);
assert.match(scope, /assertInstanceAdmin\(req\)/);
assert.match(scope, /assertCompanyAccess\(req, companyId\)/);

const dataRouteStart = server.indexOf('router.post("/plugins/:pluginId/data/:key"');
const dataRouteEnd = server.indexOf('router.post("/plugins/:pluginId/actions/:key"', dataRouteStart);
assert.ok(dataRouteStart >= 0 && dataRouteEnd > dataRouteStart, 'plugin_data_route_missing');
const dataRoute = server.slice(dataRouteStart, dataRouteEnd);
assert.match(dataRoute, /assertBoardOrgAccess\(req\)/);
assert.match(dataRoute, /assertPluginBridgeScope\(req, body\?\.companyId\)/);
assert.match(dataRoute, /"getData"/);

assert.match(protocol, /Host-authorized active company scope, when this bridge call is company-scoped/);

const getDataStart = worker.indexOf('async function handleGetData');
const getDataEnd = worker.indexOf('function stringOrNull', getDataStart);
assert.ok(getDataStart >= 0 && getDataEnd > getDataStart, 'worker_get_data_boundary_missing');
const getData = worker.slice(getDataStart, getDataEnd);
const callerParams = getData.indexOf('...params.params');
const hostScope = getData.indexOf('{ companyId: params.companyId }');
assert.ok(callerParams >= 0 && hostScope > callerParams, 'host_company_scope_must_override_caller_params');

console.log('WANDORA_ORGANIZATION_ADAPTER_OPERATOR_READ_SURFACE_V1_OK');
