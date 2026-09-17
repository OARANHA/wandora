import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { open } from 'node:fs/promises';

const PROVIDER_COMPANY_REF_MAX = 255;
const SECRET_MAX = 8_192;

export function paperclipOrganizationAdapterSecretFileName(providerCompanyRef: string): string {
  const normalized = providerCompanyRef.trim();
  if (!normalized || normalized.length > PROVIDER_COMPANY_REF_MAX) {
    throw new RangeError('paperclip_organization_adapter_invalid_company_ref');
  }
  const digest = createHash('sha256').update(normalized).digest('hex');
  return `paperclip-${digest}.hmac`;
}

export function createPaperclipOrganizationAdapterFileSecretResolver(deps: {
  secretDirectory: string;
  readSecretFile?: (path: string) => Promise<string>;
}): (providerCompanyRef: string) => Promise<string> {
  if (!isAbsolute(deps.secretDirectory)) {
    throw new Error('paperclip_organization_adapter_secret_directory_must_be_absolute');
  }

  const readSecretFile = deps.readSecretFile ?? (async (path: string): Promise<string> => {
    const handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try {
      return await handle.readFile('utf8');
    } finally {
      await handle.close();
    }
  });

  return async (providerCompanyRef: string): Promise<string> => {
    const filename = paperclipOrganizationAdapterSecretFileName(providerCompanyRef);
    const secret = (await readSecretFile(join(deps.secretDirectory, filename))).trim();
    if (!secret || secret.length > SECRET_MAX) {
      throw new Error('paperclip_organization_adapter_hmac_secret_unavailable');
    }
    return secret;
  };
}
