const IDEMPOTENCY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GroundingCreateOperationInput = {
  entryType: 'fact' | 'rule';
  content: string;
  provenanceType: 'owner_statement' | 'approved_source';
  sourceRef: string | null;
  sourceLabel: string | null;
};

export type GroundingCreateOperationRef = {
  organizationId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  storageKey: string;
};

type OperationStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type Dependencies = {
  storage?: OperationStorage;
  randomUUID?: () => string;
};

export class GroundingCreateOperationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'GroundingCreateOperationError';
  }
}

const storageKeyFor = (organizationId: string): string =>
  `wandora:customer-grounding:create:idempotency:v1:${organizationId}`;

export function groundingCreateFingerprint(
  organizationId: string,
  input: GroundingCreateOperationInput,
): string {
  return JSON.stringify([
    'wandora-customer-grounding-create-v1',
    organizationId,
    input.entryType,
    input.content.trim(),
    input.provenanceType,
    input.sourceRef?.trim() || null,
    input.sourceLabel?.trim() || null,
  ]);
}

function readPersisted(
  organizationId: string,
  storage: OperationStorage,
): GroundingCreateOperationRef | null {
  const storageKey = storageKeyFor(organizationId);
  let raw: string | null;
  try {
    raw = storage.getItem(storageKey);
  } catch {
    throw new GroundingCreateOperationError(
      'idempotency-storage-unavailable',
      'O registro oficial não pode continuar porque a identidade segura da operação não pôde ser lida.',
    );
  }
  if (!raw) return null;

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GroundingCreateOperationError(
      'idempotency-storage-invalid',
      'Existe uma operação de grounding pendente com identidade inválida e ela precisa de reconciliação.',
    );
  }
  const record = parsed as Record<string, unknown>;
  const idempotencyKey = String(record.idempotencyKey ?? '');
  const requestFingerprint = String(record.requestFingerprint ?? '');
  if (!IDEMPOTENCY_UUID_RE.test(idempotencyKey) || !requestFingerprint) {
    throw new GroundingCreateOperationError(
      'idempotency-storage-invalid',
      'Existe uma operação de grounding pendente com identidade inválida e ela precisa de reconciliação.',
    );
  }
  return { organizationId, idempotencyKey, requestFingerprint, storageKey };
}

export function resolveGroundingCreateOperation(
  organizationId: string,
  input: GroundingCreateOperationInput,
  dependencies: Dependencies = {},
): GroundingCreateOperationRef {
  const storage = dependencies.storage ?? window.sessionStorage;
  const requestFingerprint = groundingCreateFingerprint(organizationId, input);
  const existing = readPersisted(organizationId, storage);
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) {
      throw new GroundingCreateOperationError(
        'pending-request-conflict',
        'Existe um registro oficial anterior ainda sem confirmação. Para evitar duplicação, repita exatamente o mesmo conteúdo e evidência.',
      );
    }
    return existing;
  }

  const randomUUID = dependencies.randomUUID ?? (() => crypto.randomUUID());
  const idempotencyKey = randomUUID();
  if (!IDEMPOTENCY_UUID_RE.test(idempotencyKey)) {
    throw new GroundingCreateOperationError(
      'idempotency-generation-invalid',
      'A Wandora não conseguiu gerar uma identidade segura para este registro oficial.',
    );
  }

  const storageKey = storageKeyFor(organizationId);
  try {
    storage.setItem(storageKey, JSON.stringify({ idempotencyKey, requestFingerprint }));
  } catch {
    throw new GroundingCreateOperationError(
      'idempotency-storage-unavailable',
      'O registro oficial não pode começar porque sua identidade segura não pôde ser preservada neste navegador.',
    );
  }
  return { organizationId, idempotencyKey, requestFingerprint, storageKey };
}

export function clearGroundingCreateOperation(
  operation: GroundingCreateOperationRef,
  storage: OperationStorage = window.sessionStorage,
): void {
  try {
    storage.removeItem(operation.storageKey);
  } catch {
    // Keeping a stale opaque operation is safer than generating a duplicate mutation.
  }
}
