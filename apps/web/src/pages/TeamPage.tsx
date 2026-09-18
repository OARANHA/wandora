import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Bot, LoaderCircle, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../AuthProvider';

type DigitalEmployee = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
};

type DigitalEmployeesResponse = { items: DigitalEmployee[] };

const roleLabel: Record<DigitalEmployee['role'], string> = {
  'commercial-assistant': 'Assistente Comercial Digital',
};

const autonomyLabel: Record<DigitalEmployee['autonomy'], string> = {
  supervised: 'Supervisionada',
};

export function TeamPage() {
  const { activeOrganization, context, authFetch } = useAuth();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['digital-employees', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/organizations/${activeOrganization!.id}/digital-employees`,
      );
      if (response.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!response.ok) throw new Error('Não foi possível carregar os funcionários digitais da empresa.');
      return await response.json() as DigitalEmployeesResponse;
    },
  });

  if (!activeOrganization) {
    const hasMultiple = (context?.organizations.length ?? 0) > 1;
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <h3 className="m-0 text-sm font-semibold">
                {hasMultiple ? 'Escolha de empresa necessária' : 'Nenhuma empresa ativa'}
              </h3>
              <p className="m-0 mt-2 text-sm leading-6 text-amber-800/80">
                {hasMultiple
                  ? 'Escolha explicitamente uma empresa no seletor para ver a equipe correta.'
                  : 'Sua conta está vinculada à Wandora, mas ainda não possui uma empresa ativa.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {query.isLoading ? (
        <div className="flex min-h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm font-medium text-slate-500">
          <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando sua equipe…
        </div>
      ) : query.isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h3 className="m-0 text-sm font-semibold">Não foi possível carregar Equipe</h3>
          <p className="m-0 mt-2 text-sm leading-6">
            {query.error instanceof Error ? query.error.message : 'Tente novamente.'}
          </p>
          <button
            onClick={() => void query.refetch()}
            className="mt-4 rounded-xl bg-rose-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
        </div>
      ) : !query.data?.items.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-500">
            <Bot className="size-5" />
          </span>
          <h3 className="m-0 mt-4 text-base font-semibold text-slate-900">Nenhum funcionário digital nesta empresa</h3>
          <p className="m-0 mt-2 text-sm text-slate-500">
            Quando a empresa tiver funcionários digitais contratados, eles aparecerão aqui.
          </p>
          {activeOrganization.role === 'owner' || activeOrganization.role === 'admin' ? (
            <button
              type="button"
              onClick={() => void navigate({ to: '/start' })}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              <Plus className="size-4" /> Contratar Ana
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {query.data.items.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="m-0 text-sm font-semibold text-indigo-600">Sua equipe</p>
      <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
        Funcionários digitais da empresa
      </h2>
      <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">
        Veja quem já faz parte da empresa, sua função, estado e nível de autonomia.
      </p>
    </div>
  );
}

function EmployeeCard({ employee }: { employee: DigitalEmployee }) {
  const active = employee.status === 'active';
  const initials = employee.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-700">
          {initials || 'IA'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="m-0 text-lg font-semibold text-slate-950">{employee.name}</h3>
              <p className="m-0 mt-1 text-sm text-slate-500">{roleLabel[employee.role]}</p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              <span className={`size-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              {active ? 'Ativo' : 'Contratada · aguardando ativação'}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                <ShieldCheck className="size-4" /> Autonomia
              </div>
              <p className="m-0 mt-2 text-sm font-semibold text-slate-800">
                {autonomyLabel[employee.autonomy]}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                <Bot className="size-4" /> Função
              </div>
              <p className="m-0 mt-2 text-sm font-semibold text-slate-800">{roleLabel[employee.role]}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
