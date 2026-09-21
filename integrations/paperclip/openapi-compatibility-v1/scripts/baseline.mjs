import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { json, sort, canonical, validateManifest } from './check.mjs';

export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const encode = (value) => `${JSON.stringify(sort(value), null, 2)}\n`;
const requireValue = (ok, msg) => { if (!ok) throw new Error(msg); };

// Retain exact selected operations, including unused optional request properties,
// and transitively referenced components. No schema is inferred by extraction.
export function extract(doc, manifest) {
  validateManifest(manifest);
  const subset = { openapi: doc.openapi, info: doc.info, paths: {}, components: {}, security: doc.security ?? [] };
  for (const op of manifest.operations) {
    const item = doc.paths?.[op.path];
    requireValue(item?.[op.method], `missing upstream operation ${op.method} ${op.path}`);
    subset.paths[op.path] ??= {};
    subset.paths[op.path][op.method] = structuredClone(item[op.method]);
    if (item.parameters) subset.paths[op.path].parameters = structuredClone(item.parameters);
    for (const requirement of item[op.method].security ?? doc.security ?? []) {
      for (const name of Object.keys(requirement)) {
        requireValue(doc.components?.securitySchemes?.[name], `security scheme missing: ${name}`);
        subset.components.securitySchemes ??= {};
        subset.components.securitySchemes[name] = structuredClone(doc.components.securitySchemes[name]);
      }
    }
  }
  const refs = new Set();
  function collect(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref) {
      const ref = value.$ref;
      requireValue(/^#\/components\/[^/]+\/[^/]+$/.test(ref), `unsupported baseline ref ${ref}`);
      if (refs.has(ref)) return;
      refs.add(ref);
      const [, , kind, name] = ref.split('/');
      const original = doc.components?.[kind]?.[name];
      requireValue(original, `missing ${ref}`);
      subset.components[kind] ??= {};
      subset.components[kind][name] = structuredClone(original);
      collect(original);
    }
    for (const child of Object.values(value)) collect(child);
  }
  collect(subset.paths);
  return subset;
}

export function enrich(subset, supplement) {
  requireValue(supplement.schemaVersion === 1 && /^[a-f0-9]{40}$/.test(supplement.sourceCommit), 'invalid supplement provenance');
  const result = structuredClone(subset);
  for (const entry of supplement.operations) {
    const op = result.paths[entry.path]?.[entry.method];
    requireValue(op && entry.sourceFiles.length && entry.sourceFiles.every((f) => supplement.sourceFiles[f]), 'supplement operation/source evidence missing');
    for (const [status, schema] of Object.entries(entry.responses ?? {})) {
      const target = op.responses?.[status]?.content?.['application/json'];
      requireValue(canonical(target?.schema) === canonical({ type: 'object', additionalProperties: {} }),
        `supplement cannot overwrite non-generic/missing response ${entry.method} ${entry.path} ${status}`);
      target.schema = structuredClone(schema);
    }
    if (entry.requestBody) {
      requireValue(!op.requestBody && entry.path === '/api/plugins/{pluginId}/webhooks/{endpointKey}', 'only omitted plugin webhook payload may be supplemented');
      op.requestBody = { required: true, content: { 'application/json': { schema: structuredClone(entry.requestBody) } } };
    }
  }
  result['x-wandora-evidence'] = {
    kind: 'source-reviewed-dependency-projection',
    providerVersion: supplement.providerVersion,
    sourceCommit: supplement.sourceCommit,
    upstreamSha256: supplement.upstreamSha256,
    supplementSha256: digest(encode(supplement)),
    warning: 'Supplemented response/payload schemas are source-review evidence, not generated upstream OpenAPI guarantees.',
  };
  return result;
}

function verifySources(root, expected) {
  for (const [file, sha] of Object.entries(expected)) {
    requireValue(!file.startsWith('/') && !file.includes('..'), 'unsafe source path');
    requireValue(digest(readFileSync(join(root, file))) === sha, `source differs: ${file}; review required`);
  }
}

// Offline regeneration from the checked-in subset + reviewed supplement.
export function verifyBaseline(directory) {
  const metadata = json(join(directory, 'fixtures/provenance.json'));
  const supplement = json(join(directory, 'fixtures/source-supplement-v2026.916.0.json'));
  for (const [file, hash] of Object.entries(metadata.artifactSha256)) {
    requireValue(digest(readFileSync(join(directory, file))) === hash, `artifact SHA-256 differs: ${file}`);
  }
  const raw = json(join(directory, 'fixtures/upstream-subset-v2026.916.0.json'));
  const normalized = readFileSync(join(directory, 'fixtures/paperclip-v2026.916.0.openapi.json'), 'utf8');
  requireValue(encode(enrich(raw, supplement)) === normalized, 'normalized baseline is not reproducible');
  requireValue(metadata.sourceCommit === supplement.sourceCommit && metadata.upstreamSha256 === supplement.upstreamSha256, 'provenance mismatch');
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (command === 'verify' && args.length === 1) {
      verifyBaseline(args[0]);
      console.log('PASS baseline SHA-256 and offline regeneration');
    } else if (command === 'generate' && args.length === 4) {
      const [upstreamFile, paperclipSource, manifestFile, supplementFile] = args;
      const manifest = validateManifest(json(manifestFile));
      const supplement = json(supplementFile);
      const bytes = readFileSync(upstreamFile);
      requireValue(digest(bytes) === supplement.upstreamSha256, 'upstream bytes differ from reviewed supplement; new source review required');
      requireValue(execFileSync('git', ['-C', paperclipSource, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() === supplement.sourceCommit, 'wrong upstream source commit');
      verifySources(paperclipSource, supplement.sourceFiles);
      verifySources(resolve(new URL('../../../../', import.meta.url).pathname), supplement.wandoraSourceFiles);
      requireValue(manifest.sourceCommit === supplement.sourceCommit && manifest.providerVersion === supplement.providerVersion, 'manifest/supplement version mismatch');
      const doc = JSON.parse(bytes);
      const subset = extract(doc, manifest);
      const output = resolve(manifestFile, '..');
      const version = manifest.providerVersion;
      const artifacts = {
        [`fixtures/upstream-subset-${version}.json`]: encode(subset),
        [`fixtures/paperclip-${version}.openapi.json`]: encode(enrich(subset, supplement)),
      };
      const artifactSha256 = { [`fixtures/source-supplement-${version}.json`]: digest(readFileSync(supplementFile)) };
      for (const [name, content] of Object.entries(artifacts)) {
        writeFileSync(join(output, name), content);
        artifactSha256[name] = digest(content);
      }
      writeFileSync(join(output, 'fixtures/provenance.json'), encode({
        schemaVersion: 1, providerVersion: version, sourceCommit: supplement.sourceCommit,
        upstreamRepository: 'paperclipai/paperclip', builder: 'server/src/routes/openapi.ts#buildOpenApiDocument',
        upstreamSha256: digest(bytes), upstreamPathCount: Object.keys(doc.paths).length,
        generatorDependencies: { node: '24.19.0', express: '5.2.1', zod: '4.4.3', tsx: '4.23.12' },
        generatorInputs: { 'server/src/routes/openapi.ts': digest(readFileSync(join(paperclipSource, 'server/src/routes/openapi.ts'))),
          'pnpm-lock.yaml': digest(readFileSync(join(paperclipSource, 'pnpm-lock.yaml'))) },
        artifactSha256,
      }));
      console.log('PASS generated dependency subset and source-reviewed baseline');
    } else throw new Error('usage: baseline.mjs verify <gate-directory> | generate <upstream.json> <pinned-source-root> <manifest.json> <reviewed-supplement.json>');
  } catch (e) { console.error(`FAIL BASELINE: ${e.message}`); process.exitCode = 1; }
}
