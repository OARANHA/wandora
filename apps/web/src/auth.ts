const SUPABASE_AUTH_ORIGIN = 'https://supabase.wandora.com.br';
const SESSION_STORAGE_KEY = 'wandora.auth.session.v1';
const REFRESH_SKEW_SECONDS = 60;

const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export type BrowserAuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
};

export class AuthClientError extends Error {
  constructor(readonly code: 'configuration' | 'invalid-credentials' | 'session-expired' | 'password-rejected' | 'provider-error', message: string) {
    super(message);
    this.name = 'AuthClientError';
  }
}

function requirePublishableKey(): string {
  if (!publishableKey) {
    throw new AuthClientError('configuration', 'A autenticação da Wandora ainda não foi configurada neste build.');
  }
  return publishableKey;
}

function normalizeTokenResponse(payload: TokenResponse): BrowserAuthSession {
  if (!payload.access_token || !payload.refresh_token) {
    throw new AuthClientError('provider-error', 'A sessão recebida do provedor de identidade é inválida.');
  }
  const expiresAt = payload.expires_at ?? Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600);
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token, expiresAt };
}

async function tokenRequest(grantType: 'password' | 'refresh_token', body: Record<string, string>): Promise<BrowserAuthSession> {
  const response = await fetch(`${SUPABASE_AUTH_ORIGIN}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: {
      apikey: requirePublishableKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (grantType === 'password' && (response.status === 400 || response.status === 401)) {
      throw new AuthClientError('invalid-credentials', 'E-mail ou senha inválidos.');
    }
    if (grantType === 'refresh_token' && (response.status === 400 || response.status === 401)) {
      throw new AuthClientError('session-expired', 'Sua sessão expirou. Entre novamente.');
    }
    throw new AuthClientError('provider-error', 'Não foi possível validar sua sessão agora.');
  }

  return normalizeTokenResponse(await response.json() as TokenResponse);
}

export function signInWithPassword(email: string, password: string): Promise<BrowserAuthSession> {
  return tokenRequest('password', { email: email.trim(), password });
}

export function refreshBrowserSession(session: BrowserAuthSession): Promise<BrowserAuthSession> {
  return tokenRequest('refresh_token', { refresh_token: session.refreshToken });
}

export function sessionNeedsRefresh(session: BrowserAuthSession): boolean {
  return session.expiresAt <= Math.floor(Date.now() / 1000) + REFRESH_SKEW_SECONDS;
}


type AuthenticatedUserResponse = {
  email?: string | null;
};

async function readAuthenticatedUserEmail(session: BrowserAuthSession): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_AUTH_ORIGIN}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: requirePublishableKey(),
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
  } catch {
    throw new AuthClientError('provider-error', 'Não foi possível validar seu convite agora.');
  }

  if (response.status === 401) {
    throw new AuthClientError('session-expired', 'Seu convite expirou. Solicite um novo acesso à Wandora.');
  }
  if (!response.ok) {
    throw new AuthClientError('provider-error', 'Não foi possível validar seu convite agora.');
  }

  const payload = await response.json() as AuthenticatedUserResponse;
  const email = payload.email?.trim() ?? '';
  if (!email) {
    throw new AuthClientError('provider-error', 'A identidade do convite não possui um e-mail válido.');
  }
  return email;
}

export async function updateInvitedUserPassword(session: BrowserAuthSession, password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_AUTH_ORIGIN}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: requirePublishableKey(),
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new AuthClientError('provider-error', 'Não foi possível atualizar sua senha agora.');
  }

  if (response.ok) return;

  if (response.status === 401) {
    throw new AuthClientError('session-expired', 'Seu convite expirou. Solicite um novo acesso à Wandora.');
  }
  if (response.status === 400 || response.status === 422) {
    throw new AuthClientError('password-rejected', 'A senha não atende aos requisitos de segurança do acesso.');
  }

  throw new AuthClientError('provider-error', 'Não foi possível atualizar sua senha agora.');
}

export async function finalizeInvitedUserPassword(
  session: BrowserAuthSession,
  password: string,
): Promise<BrowserAuthSession> {
  const email = await readAuthenticatedUserEmail(session);
  let updateError: AuthClientError | null = null;

  try {
    await updateInvitedUserPassword(session, password);
  } catch (error) {
    if (error instanceof AuthClientError && error.code === 'session-expired') {
      throw error;
    }
    updateError = error instanceof AuthClientError
      ? error
      : new AuthClientError('provider-error', 'Não foi possível atualizar sua senha agora.');
  }

  try {
    // This password grant is both the normal post-onboarding session and the
    // reconciliation proof for an ambiguous PUT /user response. If the update
    // committed but its response was lost, the new credential still proves it.
    return await signInWithPassword(email, password);
  } catch {
    if (updateError?.code === 'password-rejected') {
      throw updateError;
    }
    if (updateError) {
      throw new AuthClientError(
        'provider-error',
        'Não foi possível confirmar se sua senha foi atualizada. Tente novamente.',
      );
    }
    throw new AuthClientError(
      'provider-error',
      'Sua senha foi atualizada, mas não foi possível abrir uma nova sessão. Tente novamente.',
    );
  }
}

export function loadBrowserSession(): BrowserAuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BrowserAuthSession>;
    if (typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string' || typeof parsed.expiresAt !== 'number') {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed as BrowserAuthSession;
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveBrowserSession(session: BrowserAuthSession): void {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearBrowserSession(): void {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function revokeBrowserSession(session: BrowserAuthSession): Promise<void> {
  try {
    await fetch(`${SUPABASE_AUTH_ORIGIN}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: requirePublishableKey(),
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
  } catch {
    // Local logout is authoritative for the browser even if the provider is temporarily unavailable.
  }
}
