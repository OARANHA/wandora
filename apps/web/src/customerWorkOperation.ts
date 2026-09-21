const IDEMPOTENCY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/i;

export class WorkOperationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'WorkOperationError';
  }
}

export type WorkOperationRef = {
  organizationId: string;
  employeeId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  storageKey: string;
};

type OperationStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type WorkOperationDependencies = {
  storage?: OperationStorage;
  randomUUID?: () => string;
  digest?: (value: ArrayBuffer) => Promise<ArrayBuffer>;
};

const operationStorageKey = (organizationId: string, employeeId: string): string =>
  `wandora:customer-work:idempotency:v1:${organizationId}:${employeeId}`;

function toHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function fingerprintWorkRequest(
  organizationId: string,
  employeeId: string,
  title: string,
  description: string,
  digest: (value: ArrayBuffer) => Promise<ArrayBuffer> = (value) => crypto.subtle.digest('SHA-256', value),
): Promise<string> {
  const canonical = JSON.stringify([
    'wandora-customer-work-v1',
    organizationId,
    employeeId,
    title.trim(),
    description.trim(),
  ]);
  const bytes = new TextEncoder().encode(canonical);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return toHex(await digest(buffer));
}

function readPersistedOperation(
  organizationId: string,
  employeeId: string,
  storage: OperationStorage,
): WorkOperationRef | null {
  const storageKey = operationStorageKey(organizationId, employeeId);
  let raw: string | null = null;
  try {
    raw = storage.getItem(storageKey);
  } catch {
    throw new WorkOperationError(
      'idempotency-storage-unavailable',
      'A solicitação segura não pode continuar neste navegador porque a operação anterior não pôde ser lida.',
    );
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new WorkOperationError(
      'idempotency-storage-invalid',
      'A identidade segura da solicitação anterior está inválida e precisa de reconciliação.',
    );
  }
  const record = parsed as Record<string, unknown>;
  if (
    !IDEMPOTENCY_UUID_RE.test(String(record.idempotencyKey ?? ''))
    || !SHA256_HEX_RE.test(String(record.requestFingerprint ?? ''))
  ) {
    throw new WorkOperationError(
      'idempotency-storage-invalid',
      'A identidade segura da solicitação anterior está inválida e precisa de reconciliação.',
    );
  }
  return {
    organizationId,
    employeeId,
    idempotencyKey: String(record.idempotencyKey),
    requestFingerprint: String(record.requestFingerprint),
    storageKey,
  };
}

export function peekWorkOperation(
  organizationId: string,
  employeeId: string,
  dependencies: Pick<WorkOperationDependencies, 'storage'> = {},
): WorkOperationRef | null {
  return readPersistedOperation(
    organizationId,
    employeeId,
    dependencies.storage ?? window.sessionStorage,
  );
}

export async function resolveWorkOperation(
  organizationId: string,
  employeeId: string,
  title: string,
  description: string,
  current: WorkOperationRef | null,
  dependencies: WorkOperationDependencies = {},
): Promise<WorkOperationRef> {
  const fingerprint = await fingerprintWorkRequest(
    organizationId,
    employeeId,
    title,
    description,
    dependencies.digest,
  );
  const storage = dependencies.storage ?? window.sessionStorage;
  const candidate = current?.organizationId === organizationId && current.employeeId === employeeId
    ? current
    : readPersistedOperation(organizationId, employeeId, storage);
  if (candidate) {
    if (candidate.requestFingerprint !== fingerprint) {
      throw new WorkOperationError(
        'pending-request-conflict',
        'Existe uma solicitação anterior ainda sem confirmação. Para evitar trabalho duplicado, repita exatamente a solicitação original antes de criar outra.',
      );
    }
    return candidate;
  }

  const randomUUID = dependencies.randomUUID ?? (() => crypto.randomUUID());
  const idempotencyKey = randomUUID();
  if (!IDEMPOTENCY_UUID_RE.test(idempotencyKey)) {
    throw new WorkOperationError(
      'idempotency-generation-invalid',
      'A Wandora não conseguiu gerar uma identidade segura para esta solicitação.',
    );
  }
  const storageKey = operationStorageKey(organizationId, employeeId);
  try {
    storage.setItem(storageKey, JSON.stringify({ idempotencyKey, requestFingerprint: fingerprint }));
  } catch {
    throw new WorkOperationError(
      'idempotency-storage-unavailable',
      'A solicitação não pode começar porque sua identidade segura não pôde ser preservada neste navegador.',
    );
  }
  return { organizationId, employeeId, idempotencyKey, requestFingerprint: fingerprint, storageKey };
}

export function clearWorkOperation(
  operation: WorkOperationRef,
  storage: OperationStorage = window.sessionStorage,
): void {
  try {
    storage.removeItem(operation.storageKey);
  } catch {
    // A stale opaque fingerprint is safer than generating a duplicate request.
  }
}
