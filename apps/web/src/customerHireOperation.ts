export const HIRE_CATALOG_KEY = 'ana-commercial-v1' as const;

const IDEMPOTENCY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class HireError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retrySameKey = false,
    readonly organizationId: string | null = null,
  ) {
    super(message);
    this.name = 'HireError';
  }
}

export type HireOperationRef = {
  organizationId: string;
  catalogKey: typeof HIRE_CATALOG_KEY;
  idempotencyKey: string;
  storageKey: string;
};

type OperationStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type ResolveHireOperationDependencies = {
  storage?: OperationStorage;
  randomUUID?: () => string;
};

export function resolveHireOperation(
  organizationId: string,
  current: HireOperationRef | null,
  dependencies: ResolveHireOperationDependencies = {},
): HireOperationRef {
  if (current?.organizationId === organizationId && current.catalogKey === HIRE_CATALOG_KEY) {
    return current;
  }

  const storageKey =
    `wandora:customer-hire:idempotency:v1:${organizationId}:${HIRE_CATALOG_KEY}`;
  const storage = dependencies.storage ?? window.sessionStorage;
  const randomUUID = dependencies.randomUUID ?? (() => crypto.randomUUID());

  let idempotencyKey: string | null = null;
  try {
    idempotencyKey = storage.getItem(storageKey)?.trim() || null;
  } catch {
    throw new HireError(
      'idempotency-storage-unavailable',
      'A contratação não pode começar neste navegador porque a operação segura não pôde ser preservada.',
      false,
      organizationId,
    );
  }

  if (idempotencyKey && !IDEMPOTENCY_UUID_RE.test(idempotencyKey)) {
    throw new HireError(
      'idempotency-storage-invalid',
      'A contratação segura desta sessão precisa ser reiniciada antes de continuar.',
      false,
      organizationId,
    );
  }

  if (!idempotencyKey) {
    idempotencyKey = randomUUID();
    if (!IDEMPOTENCY_UUID_RE.test(idempotencyKey)) {
      throw new HireError(
        'idempotency-generation-invalid',
        'A contratação segura não pôde gerar uma identidade válida para esta operação.',
        false,
        organizationId,
      );
    }

    try {
      storage.setItem(storageKey, idempotencyKey);
    } catch {
      throw new HireError(
        'idempotency-storage-unavailable',
        'A contratação não pode começar neste navegador porque a operação segura não pôde ser preservada.',
        false,
        organizationId,
      );
    }
  }

  return {
    organizationId,
    catalogKey: HIRE_CATALOG_KEY,
    idempotencyKey,
    storageKey,
  };
}

export function clearHireOperation(
  operation: HireOperationRef,
  storage: OperationStorage = window.sessionStorage,
): void {
  try {
    storage.removeItem(operation.storageKey);
  } catch {
    // A stale opaque key is safe: the backend will replay the completed catalog operation.
  }
}
