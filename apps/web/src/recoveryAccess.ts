import type { BrowserAuthSession } from './auth';

const RECOVERY_STORAGE_KEY = 'wandora.auth.recovery.v1';
const RECOVERY_ACCESS_PATH = '/recover-access';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type LocationLike = Pick<Location, 'pathname' | 'search' | 'hash'>;
type HistoryLike = Pick<History, 'replaceState'>;

let ephemeralRecoverySession: BrowserAuthSession | null = null;

function isUsableSession(session: Partial<BrowserAuthSession>, nowSeconds: number): session is BrowserAuthSession {
  return typeof session.accessToken === 'string'
    && session.accessToken.length > 0
    && typeof session.refreshToken === 'string'
    && session.refreshToken.length > 0
    && typeof session.expiresAt === 'number'
    && Number.isFinite(session.expiresAt)
    && session.expiresAt > nowSeconds;
}

export function parseRecoveryRedirectFragment(
  hash: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): BrowserAuthSession | null {
  if (!hash) return null;

  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  if (!params.has('sb')) return null;
  if (params.get('type') !== 'recovery') return null;
  if (params.get('token_type')?.toLowerCase() !== 'bearer') return null;

  const accessToken = params.get('access_token') ?? '';
  const refreshToken = params.get('refresh_token') ?? '';
  const expiresAt = Number(params.get('expires_at'));

  const session: Partial<BrowserAuthSession> = { accessToken, refreshToken, expiresAt };
  return isUsableSession(session, nowSeconds) ? session : null;
}

export function saveStagedRecoverySession(
  session: BrowserAuthSession,
  storage: StorageLike = window.sessionStorage,
): void {
  ephemeralRecoverySession = session;
  try {
    storage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The in-memory copy still allows this page load to finish safely.
  }
}

export function loadStagedRecoverySession(
  storage: StorageLike = window.sessionStorage,
  nowSeconds = Math.floor(Date.now() / 1000),
): BrowserAuthSession | null {
  if (ephemeralRecoverySession && isUsableSession(ephemeralRecoverySession, nowSeconds)) {
    return ephemeralRecoverySession;
  }

  try {
    const raw = storage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BrowserAuthSession>;
    if (!isUsableSession(parsed, nowSeconds)) {
      storage.removeItem(RECOVERY_STORAGE_KEY);
      return null;
    }

    ephemeralRecoverySession = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStagedRecoverySession(
  storage: StorageLike = window.sessionStorage,
): void {
  ephemeralRecoverySession = null;
  try {
    storage.removeItem(RECOVERY_STORAGE_KEY);
  } catch {
    // Browser storage is best-effort; the in-memory copy is already cleared.
  }
}

export function stageRecoveryRedirectFromCurrentLocation(options: {
  location?: LocationLike;
  history?: HistoryLike;
  storage?: StorageLike;
  nowSeconds?: number;
} = {}): boolean {
  const location = options.location ?? window.location;
  if (!location.hash) return false;

  const fragment = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);
  const isSupabaseAuthRedirect = fragment.has('sb');
  if (isSupabaseAuthRedirect && fragment.get('type') === 'invite') return false;
  if (location.pathname !== RECOVERY_ACCESS_PATH && !isSupabaseAuthRedirect) return false;

  const history = options.history ?? window.history;
  const storage = options.storage ?? window.sessionStorage;
  const session = parseRecoveryRedirectFragment(location.hash, options.nowSeconds);

  if (session) saveStagedRecoverySession(session, storage);
  else clearStagedRecoverySession(storage);

  // GoTrue v2.196.0 implicit recovery returns credentials in the URL fragment.
  // Remove them before React renders. A valid recovery session is canonicalized
  // to the dedicated public route even if the provider falls back to SITE_URL.
  const nextPath = session ? RECOVERY_ACCESS_PATH : location.pathname;
  history.replaceState(null, '', `${nextPath}${location.search}`);

  return session !== null;
}
