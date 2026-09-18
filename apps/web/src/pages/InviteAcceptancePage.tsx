import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import {
  AuthClientError,
  refreshBrowserSession,
  sessionNeedsRefresh,
  finalizeAuthenticatedUserPassword,
  type BrowserAuthSession,
} from '../auth';
import {
  clearStagedInviteSession,
  loadStagedInviteSession,
  saveStagedInviteSession,
} from '../inviteAcceptance';
import { useAuth } from '../AuthProvider';

export function InviteAcceptancePage() {
  const navigate = useNavigate();
  const { completePasswordSetup } = useAuth();
  const [inviteSession, setInviteSession] = useState<BrowserAuthSession | null>(() => loadStagedInviteSession());
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteSession) {
      setFormError('Este convite não está mais disponível neste navegador.');
      return;
    }
    if (!password) {
      setFormError('Defina sua senha para continuar.');
      return;
    }
    if (password !== confirmation) {
      setFormError('As senhas não conferem.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      let session = inviteSession;
      if (sessionNeedsRefresh(session)) {
        session = await refreshBrowserSession(session);
        saveStagedInviteSession(session);
        setInviteSession(session);
      }

      const completedSession = await finalizeAuthenticatedUserPassword(session, password);
      clearStagedInviteSession();
      await completePasswordSetup(completedSession);
      await navigate({ to: '/work', replace: true });
    } catch (error) {
      if (error instanceof AuthClientError) {
        if (error.code === 'session-expired') {
          clearStagedInviteSession();
          setInviteSession(null);
        }
        setFormError(error.message);
      } else {
        setFormError('Não foi possível concluir seu acesso agora. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!inviteSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f7fb] px-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <KeyRound className="size-5" />
          </span>
          <h1 className="m-0 mt-5 text-2xl font-semibold tracking-tight text-slate-950">Convite indisponível</h1>
          <p className="m-0 mt-3 text-sm leading-6 text-slate-500">
            O link pode ter expirado, já ter sido utilizado ou ter sido aberto em outra sessão do navegador.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void navigate({ to: '/recover-access', replace: true })}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Recuperar acesso <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => void navigate({ to: '/login', replace: true })}
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Ir para o login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-5 py-8 sm:py-14">
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[#111827] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-white text-lg font-black text-slate-950">W</div>
            <p className="m-0 mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Primeiro acesso</p>
            <h1 className="m-0 mt-3 max-w-md text-4xl font-semibold leading-tight tracking-[-0.04em]">
              Seu acesso à Wandora começa com uma senha definida por você.
            </h1>
            <p className="m-0 mt-5 max-w-md text-sm leading-7 text-slate-400">
              O convite valida sua identidade. Sua empresa e suas permissões continuam sendo autorizadas pela Wandora.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-200">
              <ShieldCheck className="size-5 text-indigo-300" /> Cadastro público permanece fechado
            </div>
            <p className="m-0 mt-2 text-xs leading-5 text-slate-500">
              Este fluxo só aceita uma sessão emitida pelo convite de acesso.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-7 sm:p-10 lg:p-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden">
              <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">W</div>
            </div>
            <p className="m-0 mt-7 text-sm font-semibold text-indigo-600 lg:mt-0">Convite confirmado</p>
            <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Defina sua senha</h2>
            <p className="m-0 mt-3 text-sm leading-6 text-slate-500">
              Depois disso, você poderá entrar normalmente com seu e-mail e esta senha.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Nova senha</span>
                <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
                  <LockKeyhole className="size-[18px] text-slate-400" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
                    placeholder="Crie sua senha"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Confirme a senha</span>
                <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
                  <LockKeyhole className="size-[18px] text-slate-400" />
                  <input
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
                    placeholder="Repita sua senha"
                  />
                </span>
              </label>

              {formError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">
                  {formError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <LoaderCircle className="size-[18px] animate-spin" /> : <ArrowRight className="size-[18px]" />}
                Concluir primeiro acesso
              </button>
            </form>

            <p className="m-0 mt-6 text-center text-xs leading-5 text-slate-400">
              A Wandora não recebe sua senha. Ela é definida diretamente no provedor de autenticação.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
