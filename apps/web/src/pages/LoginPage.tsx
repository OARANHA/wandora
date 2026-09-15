import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Building2, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { AuthClientError } from '../auth';
import { useAuth } from '../AuthProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const { status, error: authError, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') void navigate({ to: '/work', replace: true });
  }, [navigate, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setFormError('Informe seu e-mail e sua senha.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await signIn(email, password);
    } catch (error) {
      if (error instanceof AuthClientError) setFormError(error.message);
      else setFormError('Não foi possível entrar agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const visibleError = formError ?? ((status === 'unlinked' || status === 'error') ? authError : null);

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-5 py-8 sm:py-14">
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[#111827] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-white text-lg font-black text-slate-950">W</div>
            <p className="m-0 mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Wandora</p>
            <h1 className="m-0 mt-3 max-w-md text-4xl font-semibold leading-tight tracking-[-0.04em]">Sua empresa trabalhando com humanos e funcionários digitais no mesmo lugar.</h1>
            <p className="m-0 mt-5 max-w-md text-sm leading-7 text-slate-400">Entre para acompanhar o que está acontecendo, o que precisa da sua atenção e o que sua equipe já resolveu.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-200">
              <Building2 className="size-5 text-indigo-300" /> Acesso somente para contas provisionadas
            </div>
            <p className="m-0 mt-2 text-xs leading-5 text-slate-500">O cadastro público permanece fechado nesta fase beta.</p>
          </div>
        </section>

        <section className="flex items-center justify-center p-7 sm:p-10 lg:p-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden">
              <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">W</div>
            </div>
            <p className="m-0 mt-7 text-sm font-semibold text-indigo-600 lg:mt-0">Bem-vindo de volta</p>
            <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Entrar na Wandora</h2>
            <p className="m-0 mt-3 text-sm leading-6 text-slate-500">Use a conta que foi liberada para sua empresa.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">E-mail</span>
                <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
                  <Mail className="size-[18px] text-slate-400" />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300" placeholder="voce@empresa.com.br" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Senha</span>
                <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
                  <LockKeyhole className="size-[18px] text-slate-400" />
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300" placeholder="Sua senha" />
                </span>
              </label>

              {visibleError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">{visibleError}</div> : null}

              <button type="submit" disabled={submitting || status === 'loading'} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting || status === 'loading' ? <LoaderCircle className="size-[18px] animate-spin" /> : <ArrowRight className="size-[18px]" />}
                Entrar
              </button>
            </form>

            <p className="m-0 mt-6 text-center text-xs leading-5 text-slate-400">Sem cadastro público. Novas empresas são liberadas pela Wandora durante o beta.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
