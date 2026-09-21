import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const TYPES = ['object', 'array', 'string', 'integer', 'number', 'boolean'];
const record = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const canonical = (v) => JSON.stringify(sort(v));
export function sort(v) {
  if (Array.isArray(v)) return v.map(sort);
  return record(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v;
}
export const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function keys(value, allowed, at) {
  requireValue(record(value), `${at}: expected object`);
  for (const key of Object.keys(value)) requireValue(allowed.includes(key), `${at}: unknown key ${key}`);
}

// This validates one versioned Wandora manifest shape, not arbitrary JSON Schema.
function validateShape(s, at) {
  keys(s, ['type', 'nullable', 'enum', 'properties', 'required', 'items', 'minimum', 'maximum',
    'minLength', 'maxLength', 'format', 'pattern', 'additionalProperties'], at);
  requireValue(TYPES.includes(s.type), `${at}: explicit supported type required`);
  requireValue(s.nullable === undefined || typeof s.nullable === 'boolean', `${at}: invalid nullable`);
  if (s.enum !== undefined) {
    requireValue(Array.isArray(s.enum) && s.enum.length > 0 && s.enum.every((v) =>
      ['string', 'number', 'boolean'].includes(typeof v)), `${at}: invalid enum`);
  }
  for (const k of ['minimum', 'maximum', 'minLength', 'maxLength']) {
    requireValue(s[k] === undefined || Number.isFinite(s[k]), `${at}: invalid ${k}`);
  }
  for (const k of ['format', 'pattern']) requireValue(s[k] === undefined || typeof s[k] === 'string', `${at}: invalid ${k}`);
  if (s.type === 'object') {
    requireValue(record(s.properties), `${at}: properties required (may be empty)`);
    requireValue(s.required === undefined || (Array.isArray(s.required) &&
      s.required.every((k) => Object.hasOwn(s.properties, k))), `${at}: invalid required`);
    requireValue(s.additionalProperties === undefined || typeof s.additionalProperties === 'boolean', `${at}: invalid additionalProperties`);
    for (const [k, v] of Object.entries(s.properties)) validateShape(v, `${at}.${k}`);
  } else {
    requireValue(s.properties === undefined && s.required === undefined, `${at}: non-object properties`);
  }
  if (s.type === 'array') validateShape(s.items, `${at}[]`);
  else requireValue(s.items === undefined, `${at}: non-array items`);
}

export function validateManifest(m) {
  keys(m, ['schemaVersion', 'providerVersion', 'sourceCommit', 'wandoraSourceCommit', 'classes', 'operations', 'coverageNotes'], 'manifest');
  requireValue(m.schemaVersion === 1, 'manifest: unsupported schemaVersion');
  requireValue(typeof m.providerVersion === 'string' && /^v\d/.test(m.providerVersion), 'manifest: providerVersion required');
  for (const k of ['sourceCommit', 'wandoraSourceCommit']) requireValue(/^[a-f0-9]{40}$/.test(m[k]), `manifest: invalid ${k}`);
  requireValue(record(m.classes) && ['A', 'B', 'C'].every((c) => typeof m.classes[c] === 'string'), 'manifest: classes A/B/C required');
  requireValue(Array.isArray(m.coverageNotes) && m.coverageNotes.every((v) => typeof v === 'string'), 'manifest: coverageNotes required');
  requireValue(Array.isArray(m.operations) && m.operations.length > 0, 'manifest: operations must not be empty');
  const seen = new Set();
  for (const op of m.operations) {
    keys(op, ['path', 'method', 'class', 'context', 'reason', 'evidence', 'request', 'responses', 'security'], 'operation');
    const id = `${op.method} ${op.path}`;
    requireValue(typeof op.path === 'string' && op.path.startsWith('/api/') && !/[?#]/.test(op.path), `${id}: invalid path`);
    requireValue(METHODS.includes(op.method) && !seen.has(id), `${id}: duplicate/invalid method`);
    seen.add(id);
    requireValue(['A', 'B', 'C'].includes(op.class), `${id}: invalid class`);
    requireValue(['runtime', 'operator-runbook', 'radar'].includes(op.context), `${id}: invalid context`);
    requireValue((op.class === 'C') === (op.context === 'radar'), `${id}: radar classification mismatch`);
    requireValue(typeof op.reason === 'string' && op.reason.length > 10, `${id}: reason required`);
    requireValue(Array.isArray(op.evidence) && op.evidence.length > 0, `${id}: evidence required`);
    for (const e of op.evidence) {
      keys(e, ['file', 'anchor'], id);
      requireValue(typeof e.file === 'string' && !e.file.startsWith('/') && !e.file.includes('..') &&
        typeof e.anchor === 'string' && e.anchor.length > 0, `${id}: invalid evidence`);
    }
    keys(op.request, ['body', 'parameters'], `${id} request`);
    if (op.request.body !== null) validateShape(op.request.body, `${id} request.body`);
    requireValue(Array.isArray(op.request.parameters), `${id}: parameters required`);
    const params = new Set();
    for (const p of op.request.parameters) {
      keys(p, ['name', 'in', 'schema', 'alwaysSent'], `${id} parameter`);
      requireValue(['path', 'query', 'header', 'cookie'].includes(p.in) && typeof p.name === 'string' &&
        typeof p.alwaysSent === 'boolean' && !params.has(`${p.in}:${p.name}`), `${id}: invalid parameter`);
      params.add(`${p.in}:${p.name}`);
      validateShape(p.schema, `${id} parameter ${p.name}`);
    }
    requireValue(record(op.responses), `${id}: responses required`);
    if (op.class !== 'C') requireValue(Object.keys(op.responses).length > 0, `${id}: success response required`);
    for (const [status, schema] of Object.entries(op.responses)) {
      requireValue(/^2\d\d$/.test(status), `${id}: invalid response status`);
      if (schema !== null) validateShape(schema, `${id} response ${status}`);
    }
    keys(op.security, ['requirements', 'schemes', 'authorization'], `${id} security`);
    requireValue(Array.isArray(op.security.requirements) && record(op.security.schemes) &&
      record(op.security.authorization), `${id}: invalid security contract`);
  }
  return m;
}

// Never retrieve remote refs. An unsupported/cyclic consumed reference is a blocker.
export function dereference(value, doc, stack = []) {
  requireValue(record(value), 'schema/object missing');
  if (!value.$ref) return value;
  const ref = value.$ref;
  requireValue(typeof ref === 'string' && ref.startsWith('#/'), 'external $ref unsupported');
  requireValue(!stack.includes(ref) && stack.length < 40, 'cyclic $ref unsupported');
  requireValue(Object.keys(value).every((k) => ['$ref', 'description', 'summary'].includes(k)), '$ref siblings unsupported');
  let target = doc;
  for (const key of ref.slice(2).split('/').map((s) => s.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    requireValue(record(target) && Object.hasOwn(target, key), `unresolved $ref ${ref}`);
    target = target[key];
  }
  return dereference(target, doc, [...stack, ref]);
}

function normalizedType(s) {
  requireValue(s.nullable === undefined || typeof s.nullable === 'boolean', 'invalid nullable');
  const types = Array.isArray(s.type) ? s.type : [s.type];
  const nonNull = types.filter((t) => t !== 'null');
  requireValue(nonNull.length === 1 && TYPES.includes(nonNull[0]), 'explicit single type required');
  return { type: nonNull[0], nullable: s.nullable === true || types.includes('null') };
}

function compareShape(expected, raw, doc, direction, at, fail, depth = 0) {
  if (depth > 40) { fail('UNSUPPORTED_SCHEMA', at, 'nesting limit'); return; }
  let actual, a;
  try {
    actual = dereference(raw, doc);
    for (const key of ['allOf', 'oneOf', 'anyOf', 'not', 'if', 'then', 'else', 'dependentRequired', 'dependentSchemas', 'unevaluatedProperties']) {
      requireValue(actual[key] === undefined, `consumed ${key} requires explicit qualification`);
    }
    a = normalizedType(actual);
  } catch (e) { fail('UNPROVEN_SCHEMA', at, e.message); return; }
  const request = direction === 'request';
  const compatibleType = a.type === expected.type || (request
    ? a.type === 'number' && expected.type === 'integer'
    : a.type === 'integer' && expected.type === 'number');
  if (!compatibleType) { fail('TYPE_CHANGED', at, `need ${expected.type}; candidate ${a.type}`); return; }
  if (request ? expected.nullable === true && !a.nullable : a.nullable && expected.nullable !== true) {
    fail('NULLABILITY_CHANGED', at, request ? 'client can send null' : 'client does not accept null');
  }
  if (!request && actual.writeOnly === true) fail('RESPONSE_WRITE_ONLY', at, 'client consumes this response value');
  if (actual.enum !== undefined && (!Array.isArray(actual.enum) || actual.enum.length === 0)) {
    fail('UNPROVEN_SCHEMA', at, 'invalid enum');
  } else if (request && actual.enum && !expected.enum) {
    fail('ENUM_RESTRICTED', at, 'candidate restricts unconstrained client values');
  } else if (expected.enum && (!actual.enum || expected.enum.some((v) => !actual.enum.includes(v)))) {
    // Response enum here is the set of values the client branches on, not every provider value.
    if (!request || actual.enum) fail('CONSUMED_ENUM_CHANGED', at, 'consumed enum values no longer declared');
  }
  if (request) {
    // Compare only constraints on values the client sends. Optional unused schemas are ignored.
    const supported = new Set(['type', 'nullable', 'enum', 'properties', 'required', 'items', 'additionalProperties',
      'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'format', 'pattern',
      'description', 'title', 'example', 'examples', 'default', 'deprecated', 'readOnly', 'writeOnly', 'xml', 'externalDocs']);
    for (const k of Object.keys(actual)) {
      if (!supported.has(k) && !k.startsWith('x-')) fail('UNSUPPORTED_CONSTRAINT', at, k);
    }
    if (actual.readOnly === true) fail('REQUEST_READ_ONLY', at, 'client sends this value');
    for (const [key, lower] of [['minimum', true], ['maximum', false], ['minLength', true], ['maxLength', false]]) {
      let clientBound = expected[key];
      if (expected.enum) {
        const values = expected.enum.map((v) => key.endsWith('Length') && typeof v === 'string' ? [...v].length : v);
        if (values.every((v) => typeof v === 'number')) clientBound = lower ? Math.min(...values) : Math.max(...values);
      }
      if (actual[key] !== undefined && (!Number.isFinite(actual[key]) || clientBound === undefined ||
        (lower ? actual[key] > clientBound : actual[key] < clientBound))) {
        fail('REQUEST_CONSTRAINT', at, `${key} excludes client values`);
      }
    }
    for (const k of ['exclusiveMinimum', 'exclusiveMaximum']) {
      if (actual[k] !== undefined && actual[k] !== false) {
        const low = k === 'exclusiveMinimum', bound = typeof actual[k] === 'number'
          ? actual[k] : actual[low ? 'minimum' : 'maximum'];
        const client = expected[low ? 'minimum' : 'maximum'];
        if (client === undefined || (low ? client <= bound : client >= bound)) fail('REQUEST_CONSTRAINT', at, k);
      }
    }
    for (const k of ['format', 'pattern']) {
      if (actual[k] !== undefined && actual[k] !== expected[k]) fail('REQUEST_CONSTRAINT', at, `${k} needs qualification`);
    }
  }
  if (a.type === 'object') {
    const required = actual.required ?? [];
    if (!Array.isArray(required) || !required.every((v) => typeof v === 'string')) {
      fail('UNPROVEN_SCHEMA', at, 'invalid required'); return;
    }
    if (request) {
      for (const name of required) if (!(expected.required ?? []).includes(name)) {
        fail('NEW_REQUIRED_REQUEST_PROPERTY', `${at}.${name}`, 'not guaranteed to be sent by Wandora');
      }
      if (expected.additionalProperties === true && actual.additionalProperties === false) {
        fail('REQUEST_CONSTRAINT', at, 'additional client properties forbidden');
      }
    } else {
      for (const name of expected.required ?? []) if (!required.includes(name)) {
        fail('RESPONSE_REQUIRED_REMOVED', `${at}.${name}`, 'presence guarantee removed');
      }
    }
    for (const [name, schema] of Object.entries(expected.properties)) {
      const field = actual.properties?.[name];
      if (!field) fail(request ? 'CONSUMED_REQUEST_PROPERTY_REMOVED' : 'CONSUMED_RESPONSE_PROPERTY_REMOVED', `${at}.${name}`, 'explicit property schema missing');
      else compareShape(schema, field, doc, direction, `${at}.${name}`, fail, depth + 1);
    }
  } else if (a.type === 'array') {
    compareShape(expected.items, actual.items, doc, direction, `${at}[]`, fail, depth + 1);
  }
}

function securityRequirements(value) {
  requireValue(Array.isArray(value), 'security must be an array');
  return value.map((v) => {
    requireValue(record(v) && Object.values(v).every((scopes) => Array.isArray(scopes) && scopes.every((s) => typeof s === 'string')), 'invalid security requirement');
    return Object.fromEntries(Object.entries(v).map(([k, scopes]) => [k, [...scopes].sort()]));
  }).sort((a, b) => canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0);
}
export function declaredSecurity(doc, op) {
  const requirements = securityRequirements(op.security ?? doc.security ?? []);
  const schemes = {};
  for (const name of new Set(requirements.flatMap((r) => Object.keys(r)))) {
    const scheme = dereference(doc.components?.securitySchemes?.[name], doc);
    // Ignore prose but retain all actual transport/flow properties.
    const { description, ...boundary } = scheme;
    schemes[name] = boundary;
  }
  requireValue(record(op['x-paperclip-authorization']), 'x-paperclip-authorization missing');
  return { requirements, schemes, authorization: op['x-paperclip-authorization'] };
}

export function check(doc, manifest) {
  validateManifest(manifest);
  requireValue(record(doc) && /^3\.(0|1)\./.test(doc.openapi) && record(doc.paths), 'candidate: OpenAPI 3.0/3.1 JSON paths required');
  const diagnostics = [];
  for (const op of manifest.operations) {
    const id = `${op.method.toUpperCase()} ${op.path}`;
    const fail = (code, at, message) => diagnostics.push({ level: op.class === 'C' ? 'WARN' : 'FAIL', class: op.class, operation: id, code, at, message });
    const path = doc.paths[op.path];
    if (!path) { fail('PATH_REMOVED', op.path, op.reason); continue; }
    let item, candidate;
    try { item = dereference(path, doc); candidate = item[op.method]; }
    catch (e) { fail('UNPROVEN_PATH', op.path, e.message); continue; }
    if (!candidate) { fail('METHOD_REMOVED', id, op.reason); continue; }
    try {
      if (canonical(declaredSecurity(doc, candidate)) !== canonical({ ...op.security, requirements: securityRequirements(op.security.requirements) })) {
        fail('SECURITY_BOUNDARY_CHANGED', id, 'declared security scheme/actor boundary differs');
      }
    } catch (e) { fail('SECURITY_UNPROVEN', id, e.message); }
    try {
      const params = new Map();
      for (const raw of [...(item.parameters ?? []), ...(candidate.parameters ?? [])]) {
        const p = dereference(raw, doc);
        requireValue(typeof p.name === 'string' && ['path', 'query', 'header', 'cookie'].includes(p.in), 'invalid parameter');
        params.set(`${p.in}:${p.name}`, p);
      }
      for (const p of params.values()) {
        const client = op.request.parameters.find((v) => v.name === p.name && v.in === p.in);
        if (p.required && !client?.alwaysSent) fail('NEW_REQUIRED_PARAMETER', `${p.in}:${p.name}`, 'not guaranteed to be sent');
      }
      for (const p of op.request.parameters) {
        const actual = params.get(`${p.in}:${p.name}`);
        if (!actual) fail('CONSUMED_PARAMETER_REMOVED', `${p.in}:${p.name}`, 'parameter no longer declared');
        else compareShape(p.schema, actual.schema, doc, 'request', `${p.in}:${p.name}`, fail);
      }
      const body = candidate.requestBody ? dereference(candidate.requestBody, doc) : null;
      if (op.request.body) {
        compareShape(op.request.body, body?.content?.['application/json']?.schema, doc, 'request', 'request.body', fail);
      } else if (body?.required) fail('NEW_REQUIRED_REQUEST_BODY', 'request.body', 'Wandora sends no body');
    } catch (e) { fail('REQUEST_UNPROVEN', id, e.message); }
    for (const [status, schema] of Object.entries(op.responses)) {
      const raw = candidate.responses?.[status];
      if (!raw) { fail('RESPONSE_STATUS_REMOVED', status, 'required success status missing'); continue; }
      if (schema === null) continue;
      try {
        const response = dereference(raw, doc);
        compareShape(schema, response.content?.['application/json']?.schema, doc, 'response', `response.${status}`, fail);
      } catch (e) { fail('RESPONSE_UNPROVEN', status, e.message); }
    }
  }
  diagnostics.sort((a, b) => canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0);
  return { verdict: diagnostics.some((d) => d.level === 'FAIL') ? 'FAIL' : 'PASS', diagnostics };
}

export function formatResult(result) {
  return [result.verdict, ...result.diagnostics.map((d) =>
    `${d.level} [${d.class}] ${d.operation} ${d.code} ${d.at}: ${d.message}`),
  'Scope: declared consumed HTTP contract only; additive/unconsumed changes are non-blocking.',
  'OpenAPI does not prove wake, drain locality, retry, scheduler/recovery, transaction or idempotency semantics.'].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    requireValue(process.argv.length === 4, 'usage: node scripts/check.mjs <candidate-openapi.json> <wandora-paperclip-api-contract.json>');
    const result = check(json(process.argv[2]), json(process.argv[3]));
    console.log(formatResult(result));
    process.exitCode = result.verdict === 'PASS' ? 0 : 1;
  } catch (e) {
    console.log(`FAIL INVALID_INPUT: ${e.message}`);
    process.exitCode = 2;
  }
}
