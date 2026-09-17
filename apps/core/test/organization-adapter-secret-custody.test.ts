import assert from 'node:assert/strict';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  createPaperclipOrganizationAdapterFileSecretResolver,
  paperclipOrganizationAdapterSecretFileName,
} from '../src/organization-adapter/secret-custody.js';

const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(32);

test('resolves only the file deterministically bound to the requested provider company', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'wandora-org-adapter-secrets-'));
  try {
    const companyA = 'company-a-proof';
    const companyB = 'company-b-proof';
    await writeFile(join(directory, paperclipOrganizationAdapterSecretFileName(companyA)), `${SECRET_A}\n`, { mode: 0o600 });
    await writeFile(join(directory, paperclipOrganizationAdapterSecretFileName(companyB)), `${SECRET_B}\n`, { mode: 0o600 });

    const resolve = createPaperclipOrganizationAdapterFileSecretResolver({ secretDirectory: directory });
    assert.equal(await resolve(companyA), SECRET_A);
    assert.equal(await resolve(companyB), SECRET_B);
    assert.notEqual(
      paperclipOrganizationAdapterSecretFileName(companyA),
      paperclipOrganizationAdapterSecretFileName(companyB),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('company refs never become filesystem paths and missing custody fails closed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'wandora-org-adapter-secrets-'));
  try {
    const malicious = '../../outside';
    const filename = paperclipOrganizationAdapterSecretFileName(malicious);
    assert.match(filename, /^paperclip-[0-9a-f]{64}\.hmac$/);
    assert.equal(filename.includes('..'), false);
    assert.equal(filename.includes('/'), false);

    const resolve = createPaperclipOrganizationAdapterFileSecretResolver({ secretDirectory: directory });
    await assert.rejects(resolve(malicious));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('weak material, relative directories and symlinked secret files fail closed', async () => {
  assert.throws(
    () => createPaperclipOrganizationAdapterFileSecretResolver({ secretDirectory: 'relative/secrets' }),
    /secret_directory_must_be_absolute/,
  );

  const directory = await mkdtemp(join(tmpdir(), 'wandora-org-adapter-secrets-'));
  const target = join(directory, 'target-secret');
  try {
    const weakCompany = 'company-weak-proof';
    await writeFile(
      join(directory, paperclipOrganizationAdapterSecretFileName(weakCompany)),
      'too-short',
      { mode: 0o600 },
    );
    const resolve = createPaperclipOrganizationAdapterFileSecretResolver({ secretDirectory: directory });
    await assert.rejects(resolve(weakCompany), /hmac_secret_unavailable/);

    const company = 'company-symlink-proof';
    const secretPath = join(directory, paperclipOrganizationAdapterSecretFileName(company));
    await writeFile(target, 'c'.repeat(32), { mode: 0o600 });
    await symlink(target, secretPath);
    await assert.rejects(resolve(company));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
