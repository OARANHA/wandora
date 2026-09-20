import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import manifest from '../dist/manifest.js';

const compatibility = JSON.parse(await readFile(new URL('../compatibility.json', import.meta.url), 'utf8'));
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(packageJson.name, 'paperclip-plugin-wandora-organization-adapter');
assert.equal(packageJson.version, '0.2.0');
assert.deepEqual(packageJson.paperclipPlugin, {
  manifest: './dist/manifest.js',
  worker: './dist/worker.js',
});

assert.equal(manifest.id, 'wandora.organization-adapter-v1');
assert.equal(manifest.apiVersion, 1);
assert.equal(manifest.version, '0.2.0');
assert.deepEqual([...manifest.capabilities].sort(), ['agents.managed', 'agents.resume', 'secrets.read-ref', 'webhooks.receive']);
assert.equal(manifest.webhooks?.length, 2);
assert.deepEqual(manifest.webhooks?.map((entry) => entry.endpointKey).sort(), ['employee-activate', 'employee-reconcile']);
assert.equal(manifest.agents?.length, 1);
assert.equal(manifest.agents?.[0]?.agentKey, 'ana-commercial-v1');
assert.equal(manifest.agents?.[0]?.adapterType, 'wandora_mastra');
assert.equal(manifest.agents?.[0]?.status, 'paused');
assert.equal(manifest.agents?.[0]?.budgetMonthlyCents, 0);
assert.equal(manifest.agents?.[0]?.adapterConfig, undefined);

assert.equal(compatibility.paperclipImage, 'wandora/paperclip:v2026.916.0');
assert.equal(compatibility.paperclipSourceCommit, 'dffc2b3ca1b9e88fa21cb17493083e682dffd1ca');
assert.equal(compatibility.pluginApiVersion, 1);
assert.equal(compatibility.pluginSdkVersion, '1.0.0');

console.log('WANDORA_ORGANIZATION_ADAPTER_PLUGIN_ARTIFACT_V1_OK');
