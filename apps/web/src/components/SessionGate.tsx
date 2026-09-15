import { Navigate } from '@tanstack/react-router';
import { AlertTriangle, LoaderCircle, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { AppShell } from './AppShell';

function StateCard({ title, description, action, actionLabel, secondary }: {
  title: string;
  description: string;
  action: () => void;
  actionLabel: string;
  secondary?: { label: string; action: () => void };
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f7fb] px-5">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <span className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="m-0 mt-5 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="m-0 mt-3 text-sm leading-6 text-slate-500">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={action} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">
            <RefreshCw className="size-4" /> {actionLabel}
          </button>
          {secondary ? (
            <button onClick={secondary.action} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
              <LogOut className="size-4" /> {secondary.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SessionGate() {
  const { status, error, retryBootstrap, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f7fb] text-slate-500">
        <div className="flex items-center gap-3 text-sm font-medium">
          <LoaderCircle className="size-5 animate-spin" /> Abrindo sua empresa…
        </div>
      </div>
    );
  }

  if (status === 'anonymous') return <Navigate to="/login" replace />;

  if (status === 'unlinked') {
    return (
      <StateCard
        title="Conta ainda não vinculada"
        description={error ?? 'Sua identidade foi validada, mas ainda não existe uma empresa Wandora vinculada a esta conta.'}
        action={() => void retryBootstrap()}
        actionLabel="Verificar novamente"
        secondary={{ label: 'Sair', action: () => void signOut() }}
      />
    );
  }

  if (status === 'error') {
    return (
      <StateCard
        title="Não foi possível abrir sua conta"
        description={error ?? 'Ocorreu um erro ao validar sua sessão Wandora.'}
        action={() => void retryBootstrap()}
        actionLabel="Tentar novamente"
        secondary={{ label: 'Sair', action: () => void signOut() }}
      />
    );
  }

  return <AppShell />;
}
