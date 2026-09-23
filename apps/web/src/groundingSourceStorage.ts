const SUPABASE_STORAGE_ORIGIN = 'https://supabase.wandora.com.br';
const GROUNDING_SOURCE_BUCKET = 'organization-grounding-sources';
const SOURCE_REF_PREFIX = 'wandora:grounding-source:v1:';

export const GROUNDING_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const GROUNDING_SOURCE_ACCEPT = '.pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg';

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type GroundingSourceUpload = {
  sourceRef: string;
  sourceLabel: string;
  sha256: string;
  objectPath: string;
};

export type GroundingSourceDescriptor = {
  organizationId: string;
  sha256: string;
  logicalName: string;
  objectPath: string;
};

export class GroundingSourceFileError extends Error {
  constructor(
    readonly code:
      | 'configuration'
      | 'invalid-file'
      | 'too-large'
      | 'upload-forbidden'
      | 'upload-failed'
      | 'download-failed'
      | 'invalid-source-ref'
      | 'idempotency-conflict',
    message: string,
  ) {
    super(message);
    this.name = 'GroundingSourceFileError';
  }
}

function requirePublishableKey(): string {
  if (!publishableKey) {
    throw new GroundingSourceFileError('configuration', 'O envio de arquivos ainda não está configurado neste build.');
  }
  return publishableKey;
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
}

function resolveMimeType(file: File): string {
  const expected = MIME_BY_EXTENSION[extensionOf(file.name)] ?? '';
  if (!expected) {
    throw new GroundingSourceFileError('invalid-file', 'Use PDF, DOCX, XLSX, CSV, TXT, PNG ou JPG.');
  }
  if (file.type && (!ALLOWED_MIME_TYPES.has(file.type) || file.type !== expected)) {
    throw new GroundingSourceFileError('invalid-file', 'O tipo do arquivo não corresponde à extensão informada.');
  }
  return expected;
}

export function validateGroundingSourceFile(file: File): string {
  if (file.size <= 0) {
    throw new GroundingSourceFileError('invalid-file', 'O arquivo está vazio.');
  }
  if (file.size > GROUNDING_SOURCE_MAX_BYTES) {
    throw new GroundingSourceFileError('too-large', 'O arquivo deve ter no máximo 10 MB.');
  }
  return resolveMimeType(file);
}

export function sanitizeGroundingSourceFileName(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[._-]+/, '')
    .replace(/[-_.]+$/, '');

  const fallback = 'arquivo.' + (extensionOf(name) || 'bin');
  const safe = normalized || fallback;
  if (safe.length <= 120) return safe;

  const ext = extensionOf(safe);
  const suffix = ext ? '.' + ext : '';
  return safe.slice(0, Math.max(1, 120 - suffix.length)).replace(/[-_.]+$/, '') + suffix;
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function encodeObjectPath(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function storageUploadUrl(path: string): string {
  return SUPABASE_STORAGE_ORIGIN + '/storage/v1/object/' + GROUNDING_SOURCE_BUCKET + '/' + encodeObjectPath(path);
}

function storageAuthenticatedDownloadUrl(path: string): string {
  return SUPABASE_STORAGE_ORIGIN + '/storage/v1/object/authenticated/' + GROUNDING_SOURCE_BUCKET + '/' + encodeObjectPath(path);
}

function buildSourceRef(organizationId: string, sha256: string, logicalName: string): string {
  return SOURCE_REF_PREFIX + organizationId + '/' + sha256 + '/' + logicalName;
}

export function isGroundingSourceFileRef(sourceRef: string | null | undefined): boolean {
  if (!sourceRef?.startsWith(SOURCE_REF_PREFIX)) return false;
  try {
    return parseGroundingSourceRef(sourceRef) !== null;
  } catch {
    return false;
  }
}

export function parseGroundingSourceRef(sourceRef: string): GroundingSourceDescriptor | null {
  if (!sourceRef.startsWith(SOURCE_REF_PREFIX)) return null;
  const remainder = sourceRef.slice(SOURCE_REF_PREFIX.length);
  const parts = remainder.split('/');
  if (parts.length !== 3) {
    throw new GroundingSourceFileError('invalid-source-ref', 'A referência deste arquivo é inválida.');
  }
  const [organizationId, sha256, logicalName] = parts;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)
    || !/^[0-9a-f]{64}$/.test(sha256)
    || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(logicalName)
  ) {
    throw new GroundingSourceFileError('invalid-source-ref', 'A referência deste arquivo é inválida.');
  }
  const objectPath = organizationId + '/' + sha256 + '/' + logicalName;
  return { organizationId, sha256, logicalName, objectPath };
}

async function authenticatedStorageFetch(
  authFetch: AuthFetch,
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  return authFetch(input, {
    ...init,
    headers: {
      apikey: requirePublishableKey(),
      ...init.headers,
    },
  });
}

async function verifyExistingObject(
  authFetch: AuthFetch,
  descriptor: GroundingSourceDescriptor,
): Promise<boolean> {
  const response = await authenticatedStorageFetch(authFetch, storageAuthenticatedDownloadUrl(descriptor.objectPath));
  if (!response.ok) return false;
  const actual = await sha256Hex(await response.arrayBuffer());
  return actual === descriptor.sha256;
}

export async function uploadGroundingSourceFile(
  organizationId: string,
  file: File,
  authFetch: AuthFetch,
): Promise<GroundingSourceUpload> {
  const mimeType = validateGroundingSourceFile(file);
  const logicalName = sanitizeGroundingSourceFileName(file.name);
  const sha256 = await sha256Hex(await file.arrayBuffer());
  const descriptor: GroundingSourceDescriptor = {
    organizationId,
    sha256,
    logicalName,
    objectPath: organizationId + '/' + sha256 + '/' + logicalName,
  };

  let response: Response;
  try {
    response = await authenticatedStorageFetch(authFetch, storageUploadUrl(descriptor.objectPath), {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'x-upsert': 'false',
      },
      body: file,
    });
  } catch {
    if (await verifyExistingObject(authFetch, descriptor)) {
      return {
        sourceRef: buildSourceRef(organizationId, sha256, logicalName),
        sourceLabel: file.name,
        sha256,
        objectPath: descriptor.objectPath,
      };
    }
    throw new GroundingSourceFileError('upload-failed', 'Não foi possível confirmar o envio do arquivo. Tente novamente.');
  }

  if (!response.ok) {
    if ((response.status === 400 || response.status === 409) && await verifyExistingObject(authFetch, descriptor)) {
      return {
        sourceRef: buildSourceRef(organizationId, sha256, logicalName),
        sourceLabel: file.name,
        sha256,
        objectPath: descriptor.objectPath,
      };
    }
    if (response.status === 401 || response.status === 403) {
      throw new GroundingSourceFileError('upload-forbidden', 'Seu acesso não permite anexar arquivos a esta empresa.');
    }
    throw new GroundingSourceFileError('upload-failed', 'Não foi possível enviar este arquivo agora.');
  }

  return {
    sourceRef: buildSourceRef(organizationId, sha256, logicalName),
    sourceLabel: file.name,
    sha256,
    objectPath: descriptor.objectPath,
  };
}

export async function downloadGroundingSourceFile(
  sourceRef: string,
  sourceLabel: string | null,
  authFetch: AuthFetch,
): Promise<{ blob: Blob; fileName: string }> {
  const descriptor = parseGroundingSourceRef(sourceRef);
  if (!descriptor) {
    throw new GroundingSourceFileError('invalid-source-ref', 'Esta fonte não é um arquivo armazenado pela Wandora.');
  }

  const response = await authenticatedStorageFetch(authFetch, storageAuthenticatedDownloadUrl(descriptor.objectPath));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new GroundingSourceFileError('download-failed', 'Este arquivo não está disponível para seu acesso.');
    }
    throw new GroundingSourceFileError('download-failed', 'Não foi possível abrir este arquivo agora.');
  }

  const buffer = await response.arrayBuffer();
  const actualSha256 = await sha256Hex(buffer);
  if (actualSha256 !== descriptor.sha256) {
    throw new GroundingSourceFileError('idempotency-conflict', 'O arquivo armazenado não corresponde à referência oficial.');
  }

  return {
    blob: new Blob([buffer], { type: response.headers.get('content-type') ?? 'application/octet-stream' }),
    fileName: sourceLabel?.trim() || descriptor.logicalName,
  };
}
