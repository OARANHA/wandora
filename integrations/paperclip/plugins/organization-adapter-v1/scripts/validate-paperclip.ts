import { pathToFileURL } from 'node:url';
import manifest from '../dist/manifest.js';

const paperclipRoot = process.env.PAPERCLIP_ROOT;
if (!paperclipRoot) throw new Error('PAPERCLIP_ROOT is required');

const validatorUrl = pathToFileURL(`${paperclipRoot}/server/src/services/plugin-manifest-validator.ts`).href;
const { pluginManifestValidator } = await import(validatorUrl);
pluginManifestValidator().parseOrThrow(manifest);
console.log('PAPERCLIP_PINNED_MANIFEST_VALIDATOR_OK');
