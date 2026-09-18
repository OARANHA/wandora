import type { BrowserAuthSession } from './auth';

const INVITE_STORAGE_KEY = 'wandora.auth.invite.v1';
const INVITE_ACCEPTANCE_PATH = '/accept-invite';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type LocationLike = Pick<Location, 'pathname' | 'search' | 'hash'>;
type HistoryLike = Pick<History, 'replaceState'>;

let ephemeralInviteSession: BrowserAuthSession | null = null;

function isUsableSession(session: Partial<BrowserAuthSession>, nowSeconds: number): session is BrowserAuthSession {
  return typeof session.accessToken === 'string'
    && session.accessToken.length > 0
    && typeof session.refreshToken === 'string'
    && session.refreshToken.length > 0
    && typeof session.expiresAt === 'number'
    && Number.isFinite(session.expiresAt)
    && session.expiresAt > nowSeconds;
}

export function parseInviteRedirectFragment(hash: string, nowSeconds = Math.floor(Date.now() / 1000)): BrowserAuthSession | null {
  if (!hash) return null;

  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  if (!params.has('sb')) return null;
  if (params.get('type') !== 'invite') return null;
  if (params.get('token_type')?.toLowerCase() !== 'bearer') return null;

  const accessToken = params.get('access_token') ?? '';
  const refreshToken = params.get('refresh_token') ?? '';
  const expiresAt = Number(params.get('expires_at'));

  const session: Partial<BrowserAuthSession> = { accessToken, refreshToken, expiresAt };
  return isUsableSession(session, nowSeconds) ? session : null;
}

export function saveStagedInviteSession(
  session: BrowserAuthSession,
  storage: StorageLike = window.sessionStorage,
): void {
  ephemeralInviteSession = session;
  try {
    storage.setItem(INVITE_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The in-memory copy still allows this page load to finish safely.
  }
}

export function loadStagedInviteSession(
  storage: StorageLike = window.sessionStorage,
  nowSeconds = Math.floor(Date.now() / 1000),
): BrowserAuthSession | null {
  if (ephemeralInviteSession && isUsableSession(ephemeralInviteSession, nowSeconds)) {
    return ephemeralInviteSession;
  }

  try {
    const raw = storage.getItem(INVITE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BrowserAuthSession>;
    if (!isUsableSession(parsed, nowSeconds)) {
      storage.removeItem(INVITE_STORAGE_KEY);
      return null;
    }

    ephemeralInviteSession = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStagedInviteSession(
  storage: StorageLike = window.sessionStorage,
): void {
  ephemeralInviteSession = null;
  try {
    storage.removeItem(INVITE_STORAGE_KEY);
  } catch {
    // Browser storage is best-effort; the in-memory copy is already cleared.
  }
}

export function stageInviteRedirectFromCurrentLocation(options: {
  location?: LocationLike;
  history?: HistoryLike;
  storage?: StorageLike;
  nowSeconds?: number;
} = {}): boolean {
  const location = options.location ?? window.location;
  if (!location.hash) return false;

  const fragment = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);
  const isSupabaseAuthRedirect = fragment.has('sb');
  if (isSupabaseAuthRedirect && fragment.get('type') === 'recovery') return false;
  if (location.pathname !== INVITE_ACCEPTANCE_PATH && !isSupabaseAuthRedirect) return false;

  const history = options.history ?? window.history;
  const storage = options.storage ?? window.sessionStorage;
  const session = parseInviteRedirectFragment(location.hash, options.nowSeconds);

  if (session) saveStagedInviteSession(session, storage);
  else clearStagedInviteSession(storage);

  // GoTrue v2.196.0 implicit verification returns credentials in the URL fragment.
  // Remove them before React renders or any network request is made. A valid invite
  // is canonicalized to the dedicated public route even if GoTrue fell back to SITE_URL.
  const nextPath = session ? INVITE_ACCEPTANCE_PATH : location.pathname;
  history.replaceState(null, '', `${nextPath}${location.search}`);

  return session !== null;
}
