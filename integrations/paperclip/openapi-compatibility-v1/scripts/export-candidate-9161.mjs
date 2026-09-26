import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const [source, output] = process.argv.slice(2);
if (!source || !output || process.argv.length !== 4) {
  throw new Error('usage: export-candidate-9161.mjs <paperclip-source> <output.json>');
}
const root = resolve(source);
const expected = 'd554c4789ed3930f8a53ac9fdf6503b3187097da';
const sha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (sha !== expected) throw new Error(`candidate requires exact v2026.916.1 source: ${sha}`);

const { buildOpenApiDocument } = await import(pathToFileURL(join(root, 'server/src/routes/openapi.ts')));
const document = buildOpenApiDocument();
const bytes = `${JSON.stringify(document, null, 2)}\n`;
writeFileSync(output, bytes);
console.log(`candidate_source_commit=${sha}`);
console.log(`candidate_paths=${Object.keys(document.paths).length}`);
console.log(`candidate_sha256=${createHash('sha256').update(bytes).digest('hex')}`);
