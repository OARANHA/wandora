import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { check, json, formatResult, validateManifest, canonical } from '../scripts/check.mjs';
import { verifyBaseline, enrich, encode, extract } from '../scripts/baseline.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const repo = resolve(root, '../../..');
const manifest = json(join(root, 'wandora-paperclip-api-contract.json'));
const baseline = json(join(root, 'fixtures/paperclip-v2026.916.0.openapi.json'));
const raw = json(join(root, 'fixtures/upstream-subset-v2026.916.0.json'));
const clone = (v) => structuredClone(v);
const drain = '/api/instance/task-drain';
const issue = '/api/issues/{id}';
const response = (doc, path = drain, method = 'get', status = '200') => doc.paths[path][method].responses[status].content['application/json'].schema;
const body = (doc, path = issue, method = 'patch') => doc.paths[path][method].requestBody.content['application/json'].schema;
function expectMutation(name, mutate, verdict, code) {
  test(name, () => {
    const doc = clone(baseline);
    const m = clone(manifest);
    mutate(doc, m);
    const result = check(doc, m);
    assert.equal(result.verdict, verdict, formatResult(result));
    if (code) assert.ok(result.diagnostics.some((d) => d.code === code), formatResult(result));
  });
}

test('same contract passes and baseline hashes/regeneration are reproducible offline', () => {
  assert.equal(check(baseline, manifest).verdict, 'PASS');
  const provenance = verifyBaseline(root);
  assert.equal(provenance.upstreamPathCount, 685);
  assert.equal(provenance.sourceCommit, manifest.sourceCommit);
  assert.equal(Object.keys(provenance.artifactSha256).length, 3);
  assert.equal(encode(extract(raw, manifest)), encode(raw));
});

test('every operation has an existing code or canonical-document evidence anchor', () => {
  for (const op of manifest.operations) for (const e of op.evidence) {
    assert.ok(readFileSync(join(repo, e.file), 'utf8').includes(e.anchor), `${op.path}: ${e.file} missing ${e.anchor}`);
  }
  assert.ok(manifest.operations.some((op) => op.path.includes('/webhooks/')));
  assert.ok(!manifest.operations.some((op) => /\/agents\/\{id\}\/(pause|resume|wakeup)/.test(op.path)));
});

test('production pins remain canonical while explicitly qualified provider candidates may advance independently', () => {
  const productionPin = json(resolve(root, '..', 'adapters/wandora-mastra-v1/compatibility.json'));
  assert.equal(productionPin.paperclipSourceCommit, manifest.sourceCommit);
  assert.equal(productionPin.paperclipImage, `wandora/paperclip:${manifest.providerVersion}`);

  const productionWorkflow = readFileSync(join(repo, '.github/workflows/paperclip-mastra-adapter-ci.yml'), 'utf8');
  assert.equal(
    productionWorkflow.match(/ref: ([a-f0-9]{40})/)?.[1],
    manifest.sourceCommit,
    'paperclip-mastra-adapter-ci.yml: production source pin differs from canonical OpenAPI',
  );

  const compose = readFileSync(join(repo, 'infra/stacks/paperclip/compose.yaml'), 'utf8');
  assert.equal(compose.match(/image: wandora\/paperclip:(\S+)/)?.[1], manifest.providerVersion);
  assert.equal(compose.match(/PAPERCLIP_BUILD_COMMIT: (\S+)/)?.[1], manifest.sourceCommit);
  assert.equal(compose.match(/PAPERCLIP_BUILD_VERSION: (\S+)/)?.[1], manifest.providerVersion);

  const candidate = json(join(
    root,
    'candidates/organization-adapter-v0.5.0-paperclip-v2026.916.1.json',
  ));
  assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.kind, 'organization_adapter_candidate');
  assert.equal(candidate.productionEffect, false);
  assert.equal(candidate.productionPromotionAuthorized, false);
  assert.equal(candidate.openApi.pathCount, 685);
  assert.equal(
    candidate.openApi.sha256,
    json(join(root, 'fixtures/provenance.json')).upstreamSha256,
    'candidate OpenAPI must remain byte-identical to the qualified production HTTP contract',
  );
  assert.equal(candidate.openApi.sourceEvidenceIdenticalTo, manifest.providerVersion);

  const candidatePackage = json(resolve(root, '..', 'plugins/organization-adapter-v1/package.json'));
  const candidatePin = json(resolve(root, '..', 'plugins/organization-adapter-v1/compatibility.json'));
  assert.equal(candidatePackage.version, candidate.pluginVersion);
  assert.equal(candidatePin.paperclipSourceCommit, candidate.paperclipSourceCommit);
  assert.equal(candidatePin.paperclipImage, `wandora/paperclip:${candidate.providerVersion}`);

  const candidateWorkflow = readFileSync(join(repo, '.github/workflows/organization-adapter-plugin-ci.yml'), 'utf8');
  assert.equal(
    candidateWorkflow.match(/ref: ([a-f0-9]{40})/)?.[1],
    candidate.paperclipSourceCommit,
    'organization-adapter-plugin-ci.yml: candidate source pin differs from qualified candidate record',
  );

  const expectedDeltas = new Set([
    'integrations/paperclip/patches/v2026.916.1-host-operational-read-v1.patch',
    'integrations/paperclip/patches/v2026.916.1-fast-read-run-result-read-v1.patch',
    'integrations/paperclip/patches/v2026.916.1-synchronous-webhook-response-v1.patch',
  ]);
  assert.deepEqual(
    new Set(candidate.providerDeltas.map((entry) => entry.path)),
    expectedDeltas,
  );
  for (const entry of candidate.providerDeltas) {
    assert.ok(readFileSync(join(repo, entry.path), 'utf8').length > 0, `missing candidate delta ${entry.path}`);
    assert.equal(typeof entry.qualificationWorkflow, 'string');
    assert.ok(entry.qualificationWorkflow.length > 0);
  }
});

test('incomplete raw upstream is a coverage FAIL, never silently enriched or accepted', () => {
  const result = check(raw, manifest);
  assert.equal(result.verdict, 'FAIL');
  for (const path of ['/api/agents/me', '/api/adapters', issue, drain]) {
    assert.ok(result.diagnostics.some((d) => d.level === 'FAIL' && d.operation.endsWith(path)));
  }
});

test('supplement cannot hide a missing or newly typed upstream response', () => {
  const supplement = json(join(root, 'fixtures/source-supplement-v2026.916.0.json'));
  for (const change of [
    (doc) => { delete doc.paths[drain].get.responses['200']; },
    (doc) => { doc.paths[drain].get.responses['200'].content['application/json'].schema = { type: 'object', properties: {} }; },
  ]) {
    const doc = clone(raw); change(doc);
    assert.throws(() => enrich(doc, supplement), /cannot overwrite/);
  }
});

expectMutation('new route is non-blocking', (d) => { d.paths['/api/new-unconsumed'] = { get: {} }; }, 'PASS');
expectMutation('new method is non-blocking', (d) => { d.paths[drain].put = {}; }, 'PASS');
expectMutation('new optional response property is non-blocking', (d) => { response(d).properties.extra = { type: 'string' }; }, 'PASS');
expectMutation('descriptions tags examples and unconsumed schemas are non-blocking', (d) => {
  d.paths[drain].get.description = 'new prose'; d.paths[drain].get.tags = ['new'];
  response(d).examples = [{ arbitrary: true }];
  body(d).properties.unconsumed = { oneOf: [{ type: 'string' }, { type: 'number' }] };
}, 'PASS');
expectMutation('removing unused optional request property is non-blocking', (d) => { delete body(d).properties.comment; }, 'PASS');
expectMutation('narrowing unused request enum is non-blocking', (d) => { body(d).properties.priority.enum = ['low']; }, 'PASS');
expectMutation('required path A removed', (d) => { delete d.paths[drain]; }, 'FAIL', 'PATH_REMOVED');
expectMutation('required method A removed', (d) => { delete d.paths[drain].post; }, 'FAIL', 'METHOD_REMOVED');
expectMutation('consumed response field removed', (d) => { delete response(d).properties.quiescent; }, 'FAIL', 'CONSUMED_RESPONSE_PROPERTY_REMOVED');
expectMutation('new required request property breaks status-only completion', (d) => {
  body(d).properties.comment = { type: 'string' }; body(d).required = ['comment'];
}, 'FAIL', 'NEW_REQUIRED_REQUEST_PROPERTY');
expectMutation('existing optional property becomes required', (d) => { body(d).required = ['title']; }, 'FAIL', 'NEW_REQUIRED_REQUEST_PROPERTY');
expectMutation('incompatible consumed request type', (d) => { body(d).properties.status = { type: 'integer' }; }, 'FAIL', 'TYPE_CHANGED');
expectMutation('consumed request property removed', (d) => { delete body(d).properties.status; }, 'FAIL', 'CONSUMED_REQUEST_PROPERTY_REMOVED');
expectMutation('request enum narrowed without done', (d) => { body(d).properties.status.enum = ['todo']; }, 'FAIL', 'CONSUMED_ENUM_CHANGED');
expectMutation('request enum narrowed only outside sent subset passes', (d) => { body(d).properties.status.enum = ['done']; }, 'PASS');
expectMutation('response enum narrowed without consumed todo branch', (d) => { response(d, issue).properties.status.enum = ['done']; }, 'FAIL', 'CONSUMED_ENUM_CHANGED');
expectMutation('response nullability widened for quiescent', (d) => { response(d).properties.quiescent.nullable = true; }, 'FAIL', 'NULLABILITY_CHANGED');
expectMutation('write-only consumed response field fails', (d) => { response(d).properties.quiescent.writeOnly = true; }, 'FAIL', 'RESPONSE_WRITE_ONLY');
expectMutation('compatible constraint on singleton request value does not overfreeze enum', (d) => { body(d).properties.status.minLength = 1; }, 'PASS');
expectMutation('incompatible constraint on singleton request value fails', (d) => { body(d).properties.status.maxLength = 3; }, 'FAIL', 'REQUEST_CONSTRAINT');
expectMutation('response nullable field may become non-null', (d) => { response(d, issue).properties.checkoutRunId.nullable = false; }, 'PASS');
expectMutation('client-sent null becomes forbidden', (d, m) => {
  m.operations.find((o) => o.path === drain && o.method === 'post').request.body.properties.ttlMs.nullable = true;
  body(d, drain, 'post').properties.ttlMs.nullable = false;
}, 'FAIL', 'NULLABILITY_CHANGED');
expectMutation('Task Drain TTL restriction breaks admitted bounded range', (d) => { body(d, drain, 'post').properties.ttlMs.maximum = 100; }, 'FAIL', 'REQUEST_CONSTRAINT');
expectMutation('install newly required version breaks current local package client', (d) => { body(d, '/api/adapters/install', 'post').required.push('version'); }, 'FAIL', 'NEW_REQUIRED_REQUEST_PROPERTY');
expectMutation('adapter install readback loses requiresRestart', (d) => { delete response(d, '/api/adapters/install', 'post', '201').properties.requiresRestart; }, 'FAIL', 'CONSUMED_RESPONSE_PROPERTY_REMOVED');
expectMutation('adapters array element loses loaded', (d) => { delete response(d, '/api/adapters').items.properties.loaded; }, 'FAIL', 'CONSUMED_RESPONSE_PROPERTY_REMOVED');
expectMutation('nested agent identity field removed', (d) => { delete response(d, '/api/agents/me').properties.metadata.properties.pluginManagedAgent.properties.agentKey; }, 'FAIL', 'CONSUMED_RESPONSE_PROPERTY_REMOVED');
expectMutation('recovery active projection loses nullable support only is compatible', (d) => { response(d, '/api/issues/{id}/recovery-actions').properties.active.nullable = false; }, 'PASS');
expectMutation('success status removed', (d) => { delete d.paths[issue].patch.responses['200']; }, 'FAIL', 'RESPONSE_STATUS_REMOVED');
expectMutation('JSON response replaced by text', (d) => { delete d.paths[drain].get.responses['200'].content['application/json']; }, 'FAIL', 'UNPROVEN_SCHEMA');
expectMutation('security boundary changes to public', (d) => { d.paths[drain].post.security = []; }, 'FAIL', 'SECURITY_BOUNDARY_CHANGED');
expectMutation('security actor changes', (d) => { d.paths[drain].post['x-paperclip-authorization'] = { actor: 'public' }; }, 'FAIL', 'SECURITY_BOUNDARY_CHANGED');
expectMutation('security scheme transport changes', (d) => { d.components.securitySchemes.BoardSessionAuth.in = 'header'; }, 'FAIL', 'SECURITY_BOUNDARY_CHANGED');
expectMutation('auth descriptions and requirement ordering do not block', (d) => {
  d.components.securitySchemes.BoardSessionAuth.description = 'new prose';
  d.paths[drain].post.security.reverse();
}, 'PASS');
expectMutation('root security inheritance is respected', (d) => {
  d.security = d.paths[drain].get.security; delete d.paths[drain].get.security;
}, 'PASS');
expectMutation('root inherited auth drift blocks', (d) => {
  d.security = []; delete d.paths[drain].get.security;
}, 'FAIL', 'SECURITY_BOUNDARY_CHANGED');
expectMutation('new required header blocks', (d) => { d.paths[drain].get.parameters = [{ in: 'header', name: 'x-new', required: true, schema: { type: 'string' } }]; }, 'FAIL', 'NEW_REQUIRED_PARAMETER');
expectMutation('path-level required query blocks', (d) => { d.paths[drain].parameters = [{ in: 'query', name: 'new', required: true, schema: { type: 'string' } }]; }, 'FAIL', 'NEW_REQUIRED_PARAMETER');
expectMutation('optional query addition is non-blocking', (d) => { d.paths[drain].get.parameters = [{ in: 'query', name: 'new', required: false, schema: { oneOf: [] } }]; }, 'PASS');
expectMutation('new mandatory body on GET blocks', (d) => { d.paths[drain].get.requestBody = { required: true }; }, 'FAIL', 'NEW_REQUIRED_REQUEST_BODY');
expectMutation('local schema ref is resolved', (d) => {
  d.components.schemas.Drain = response(d); d.paths[drain].get.responses['200'].content['application/json'].schema = { $ref: '#/components/schemas/Drain' };
}, 'PASS');
expectMutation('local requestBody and response refs are resolved', (d) => {
  d.components.requestBodies = { Patch: d.paths[issue].patch.requestBody };
  d.paths[issue].patch.requestBody = { $ref: '#/components/requestBodies/Patch' };
  d.components.responses = { Drain: d.paths[drain].get.responses['200'] };
  d.paths[drain].get.responses['200'] = { $ref: '#/components/responses/Drain' };
}, 'PASS');
expectMutation('external refs fail without network', (d) => { response(d).properties.quiescent = { $ref: 'https://example.invalid/schema.json' }; }, 'FAIL', 'UNPROVEN_SCHEMA');
expectMutation('cyclic refs fail deterministically', (d) => {
  d.components.schemas.Loop = { $ref: '#/components/schemas/Loop' }; response(d).properties.quiescent = { $ref: '#/components/schemas/Loop' };
}, 'FAIL', 'UNPROVEN_SCHEMA');
expectMutation('unsupported consumed composition fails instead of guessing', (d) => { response(d).properties.quiescent = { allOf: [{ type: 'boolean' }] }; }, 'FAIL', 'UNPROVEN_SCHEMA');
expectMutation('unknown request constraint fails closed', (d) => { body(d).properties.status.minItems = 1; }, 'FAIL', 'UNSUPPORTED_CONSTRAINT');
expectMutation('OpenAPI 3.1 nullable union is understood', (d) => {
  d.openapi = '3.1.0'; const p = response(d, issue).properties.checkoutRunId; delete p.nullable; p.type = ['string', 'null'];
}, 'PASS');
expectMutation('C removal warns without blocking', (d) => { delete d.paths['/api/companies/{companyId}/cases']; }, 'PASS', 'PATH_REMOVED');
expectMutation('B break blocks only the identified specialist contract', (d, m) => {
  const op = m.operations.find((o) => o.path === '/api/health'); op.class = 'B'; delete d.paths[op.path];
}, 'FAIL', 'PATH_REMOVED');

test('every Class A operation is actually blocking for path/method removal', () => {
  for (const op of manifest.operations.filter((v) => v.class === 'A')) {
    const d = clone(baseline); delete d.paths[op.path][op.method];
    assert.equal(check(d, manifest).verdict, 'FAIL', `${op.method} ${op.path}`);
  }
});

test('malformed or empty manifests cannot accidentally report PASS', () => {
  for (const mutate of [
    (m) => { m.schemaVersion = 2; }, (m) => { m.operations = []; },
    (m) => { m.operations[0].class = 'D'; }, (m) => { m.operations.push(clone(m.operations[0])); },
    (m) => { m.operations[0].responses['200'].properties.status.typo = true; },
    (m) => { delete m.operations[0].request; },
  ]) { const m = clone(manifest); mutate(m); assert.throws(() => validateManifest(m)); }
});

test('CLI has deterministic diagnostics and exits 0 / 1 / 2 for pass / fail / invalid', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'wandora-openapi-test-'));
  try {
    const candidate = join(tmp, 'candidate.json');
    const run = () => spawnSync(process.execPath, [join(root, 'scripts/check.mjs'), candidate, join(root, 'wandora-paperclip-api-contract.json')], { encoding: 'utf8' });
    writeFileSync(candidate, JSON.stringify(baseline));
    assert.equal(run().status, 0);
    const d = clone(baseline); delete d.paths[drain]; delete d.paths[issue];
    writeFileSync(candidate, JSON.stringify(d));
    const first = run(); assert.equal(first.status, 1); assert.match(first.stdout, /^FAIL\n/);
    writeFileSync(candidate, canonical(d));
    assert.equal(run().stdout, first.stdout);
    writeFileSync(candidate, '{invalid');
    assert.equal(run().status, 2);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
