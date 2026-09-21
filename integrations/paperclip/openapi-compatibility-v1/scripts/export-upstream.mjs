// Source-only generation: never imports the server entrypoint, DB or live config.
// Run with the pinned source's tsx loader; see README for dependency setup.
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [source, output] = process.argv.slice(2);
if (!source || !output || process.argv.length !== 4) throw new Error('usage: export-upstream.mjs <pinned-paperclip-source> <output.json>');
const sha = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (sha !== 'dffc2b3ca1b9e88fa21cb17493083e682dffd1ca') throw new Error('V1 baseline requires exact v2026.916.0 source');
const { buildOpenApiDocument } = await import(pathToFileURL(join(resolve(source), 'server/src/routes/openapi.ts')));
const document = buildOpenApiDocument();
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Exported ${Object.keys(document.paths).length} paths from ${sha}; no server started`);
