import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AuthClientError,
  clearBrowserSession,
  loadBrowserSession,
  refreshBrowserSession,
  revokeBrowserSession,
  saveBrowserSession,
  sessionNeedsRefresh,
  signInWithPassword,
  type BrowserAuthSession,
} from './auth';

export type HumanOrganization = {
  id: string;
  slug: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
};

export type HumanSessionContext = {
  user: {
    id: string;
    name: string;
  };
  organizations: HumanOrganization[];
};

type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unlinked' | 'error';

type AuthContextValue = {
  status: AuthStatus;
  context: HumanSessionContext | null;
  activeOrganization: HumanOrganization | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  retryBootstrap: () => Promise<void>;
};

class BootstrapError extends Error {
  constructor(readonly code: 'unauthorized' | 'unlinked' | 'unexpected', message: string) {
    super(message);
    this.name = 'BootstrapError';
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSessionContext(accessToken: string): Promise<HumanSessionContext> {
  const response = await fetch('/api/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    throw new BootstrapError('unauthorized', 'A sessão não é mais válida.');
  }
  if (response.status === 403) {
    throw new BootstrapError('unlinked', 'Esta conta ainda não foi vinculada a uma empresa Wandora.');
  }
  if (!response.ok) {
    throw new BootstrapError('unexpected', 'Não foi possível carregar sua conta Wandora agora.');
  }

  const payload = await response.json() as HumanSessionContext;
  if (!payload.user?.id || !payload.user?.name || !Array.isArray(payload.organizations)) {
    throw new BootstrapError('unexpected', 'A resposta da sessão Wandora é inválida.');
  }
  return payload;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [context, setContext] = useState<HumanSessionContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<BrowserAuthSession | null>(null);
  const bootStarted = useRef(false);

  const commitSession = useCallback((session: BrowserAuthSession | null) => {
    sessionRef.current = session;
    if (session) saveBrowserSession(session);
    else clearBrowserSession();
  }, []);

  const getFreshSession = useCallback(async (force = false): Promise<BrowserAuthSession> => {
    const current = sessionRef.current;
    if (!current) {
      throw new AuthClientError('session-expired', 'Sua sessão expirou. Entre novamente.');
    }
    if (!force && !sessionNeedsRefresh(current)) return current;
    const refreshed = await refreshBrowserSession(current);
    commitSession(refreshed);
    return refreshed;
  }, [commitSession]);

  const clearToAnonymous = useCallback(() => {
    commitSession(null);
    setContext(null);
    setError(null);
    setStatus('anonymous');
  }, [commitSession]);

  const bootstrap = useCallback(async (initialSession: BrowserAuthSession) => {
    commitSession(initialSession);
    setStatus('loading');
    setContext(null);
    setError(null);

    try {
      let session = await getFreshSession(false);
      try {
        const nextContext = await fetchSessionContext(session.accessToken);
        setContext(nextContext);
        setStatus('authenticated');
        return;
      } catch (bootstrapError) {
        if (!(bootstrapError instanceof BootstrapError) || bootstrapError.code !== 'unauthorized') throw bootstrapError;
      }

      session = await getFreshSession(true);
      const nextContext = await fetchSessionContext(session.accessToken);
      setContext(nextContext);
      setStatus('authenticated');
    } catch (bootstrapError) {
      if (bootstrapError instanceof BootstrapError && bootstrapError.code === 'unlinked') {
        setStatus('unlinked');
        setError(bootstrapError.message);
        return;
      }
      if (bootstrapError instanceof AuthClientError && bootstrapError.code === 'session-expired') {
        clearToAnonymous();
        return;
      }
      if (bootstrapError instanceof BootstrapError && bootstrapError.code === 'unauthorized') {
        clearToAnonymous();
        return;
      }
      setStatus('error');
      setError(bootstrapError instanceof Error ? bootstrapError.message : 'Não foi possível validar sua sessão.');
    }
  }, [clearToAnonymous, commitSession, getFreshSession]);

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    const stored = loadBrowserSession();
    if (!stored) {
      setStatus('anonymous');
      return;
    }
    void bootstrap(stored);
  }, [bootstrap]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const session = await signInWithPassword(email, password);
    await bootstrap(session);
  }, [bootstrap]);

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    clearToAnonymous();
    if (current) await revokeBrowserSession(current);
  }, [clearToAnonymous]);

  const retryBootstrap = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      clearToAnonymous();
      return;
    }
    await bootstrap(current);
  }, [bootstrap, clearToAnonymous]);

  const authFetch = useCallback(async (input: string, init: RequestInit = {}) => {
    let session = await getFreshSession(false);
    const run = (token: string) => fetch(input, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    let response = await run(session.accessToken);
    if (response.status !== 401) return response;

    try {
      session = await getFreshSession(true);
      response = await run(session.accessToken);
      if (response.status === 401) clearToAnonymous();
      return response;
    } catch {
      clearToAnonymous();
      return response;
    }
  }, [clearToAnonymous, getFreshSession]);

  const activeOrganization = context?.organizations.length === 1 ? context.organizations[0] : null;

  const value = useMemo<AuthContextValue>(() => ({
    status,
    context,
    activeOrganization,
    error,
    signIn,
    signOut,
    authFetch,
    retryBootstrap,
  }), [activeOrganization, authFetch, context, error, retryBootstrap, signIn, signOut, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
