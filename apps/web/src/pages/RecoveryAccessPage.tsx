import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import {
  AuthClientError,
  finalizeAuthenticatedUserPassword,
  refreshBrowserSession,
  requestPasswordRecovery,
  sessionNeedsRefresh,
  type BrowserAuthSession,
} from '../auth';
import {
  clearStagedRecoverySession,
  loadStagedRecoverySession,
  saveStagedRecoverySession,
} from '../recoveryAccess';
import { useAuth } from '../AuthProvider';

export function RecoveryAccessPage() {
  const navigate = useNavigate();
  const { completePasswordSetup } = useAuth();
  const [session, setSession] = useState<BrowserAuthSession | null>(() => loadStagedRecoverySession());
  const [email, setEmail] = useState('');
  const [requested, setRequested] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setFormError('Informe seu e-mail para continuar.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await requestPasswordRecovery(email);
      setEmail('');
      setRequested(true);
    } catch {
      setFormError('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    if (!password) {
      setFormError('Defina sua nova senha para continuar.');
      return;
    }
    if (password !== confirmation) {
      setFormError('As senhas não conferem.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      let active = session;
      if (sessionNeedsRefresh(active)) {
        active = await refreshBrowserSession(active);
        saveStagedRecoverySession(active);
        setSession(active);
      }
      const completed = await finalizeAuthenticatedUserPassword(active, password);
      clearStagedRecoverySession();
      await completePasswordSetup(completed);
      await navigate({ to: '/work', replace: true });
    } catch (error) {
      if (error instanceof AuthClientError) {
        if (error.code === 'session-expired') {
          clearStagedRecoverySession();
          setSession(null);
        }
        setFormError(error.message);
      } else {
        setFormError('Não foi possível concluir a recuperação agora. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f7fb] px-5 py-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">W</div>
        <p className="m-0 mt-6 text-sm font-semibold text-indigo-600">Recuperar acesso</p>
        <h1 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {session ? 'Defina sua nova senha' : 'Solicite um novo link'}
        </h1>
        <p className="m-0 mt-3 text-sm leading-6 text-slate-500">
          {session
            ? 'A sessão só será promovida para a Wandora depois que o provedor confirmar a nova senha.'
            : 'Informe o e-mail usado no seu acesso Wandora.'}
        </p>

        {session ? (
          <form onSubmit={resetPassword} className="mt-8 space-y-5">
            <PasswordField label="Nova senha" value={password} onChange={setPassword} />
            <PasswordField label="Confirme a senha" value={confirmation} onChange={setConfirmation} />
            {formError ? <ErrorBox>{formError}</ErrorBox> : null}
            <SubmitButton busy={submitting}>Concluir recuperação</SubmitButton>
          </form>
        ) : requested ? (
          <div className="mt-8 space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">
              Se existir uma conta liberada para esse e-mail, você receberá as instruções de recuperação. Verifique também a pasta de spam.
            </div>
            <button type="button" onClick={() => setRequested(false)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
              Solicitar outro link
            </button>
          </div>
        ) : (
          <form onSubmit={requestRecovery} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">E-mail</span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-3.5">
                <Mail className="size-[18px] text-slate-400" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" placeholder="voce@empresa.com.br" />
              </span>
            </label>
            {formError ? <ErrorBox>{formError}</ErrorBox> : null}
            <SubmitButton busy={submitting}>Enviar instruções</SubmitButton>
          </form>
        )}

        <button type="button" onClick={() => void navigate({ to: '/login', replace: true })} className="mt-6 w-full text-center text-sm font-semibold text-slate-500">
          Voltar para o login
        </button>
        <p className="m-0 mt-5 text-center text-xs leading-5 text-slate-400">
          Por segurança, esta tela não confirma se um e-mail possui uma conta.
        </p>
      </div>
    </div>
  );
}

function PasswordField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{props.label}</span>
      <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-3.5">
        <LockKeyhole className="size-[18px] text-slate-400" />
        <input value={props.value} onChange={(event) => props.onChange(event.target.value)} type="password" autoComplete="new-password" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
      </span>
    </label>
  );
}

function ErrorBox({ children }: { children: string }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">{children}</div>;
}

function SubmitButton({ busy, children }: { busy: boolean; children: string }) {
  return (
    <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
      {busy ? <LoaderCircle className="size-[18px] animate-spin" /> : <ArrowRight className="size-[18px]" />}
      {children}
    </button>
  );
}
