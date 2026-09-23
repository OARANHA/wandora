import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  LoaderCircle,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { workResultPlainText } from '../workResultFormat';

type DigitalEmployee = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
  work: {
    available: boolean;
    state: 'available' | 'unavailable';
  };
};

type TeamResponse = {
  items: DigitalEmployee[];
};

type WorkItem = {
  id: string;
  employeeId: string;
  title: string;
  state: 'submitting' | 'submitted' | 'uncertain' | 'executing' | 'review-ready' | 'execution-uncertain';
  result: { summary: string; model: string } | null;
  createdAt: string;
  updatedAt: string;
};

type DashboardData = {
  employees: DigitalEmployee[];
  workItems: WorkItem[];
};

const roleLabel: Record<DigitalEmployee['role'], string> = {
  'commercial-assistant': 'Assistente comercial',
};

const workStateLabel: Record<WorkItem['state'], string> = {
  submitting: 'Preparando',
  submitted: 'Enviado',
  uncertain: 'Verificação necessária',
  executing: 'Em andamento',
  'review-ready': 'Pronto para sua revisão',
  'execution-uncertain': 'Execução em verificação',
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'você';
}

function greetingForHour(hour: number): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(',', ' ·').replace(' às ', ' · ');
}

export function DashboardPage() {
  const { activeOrganization, context, authFetch } = useAuth();

  const query = useQuery({
    queryKey: ['customer-dashboard-real', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async (): Promise<DashboardData> => {
      const teamResponse = await authFetch(
        `/api/v1/organizations/${activeOrganization!.id}/digital-employees`,
      );
      if (teamResponse.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!teamResponse.ok) throw new Error('Não foi possível carregar a equipe da empresa.');
      const team = await teamResponse.json() as TeamResponse;

      const workResponses = await Promise.all(
        team.items
          .filter((employee) => employee.work.available)
          .map(async (employee) => {
            const response = await authFetch(
              `/api/v1/organizations/${activeOrganization!.id}/digital-employees/${employee.id}/work`,
            );
            if (!response.ok) return [] as WorkItem[];
            const body = await response.json() as { items: WorkItem[] };
            return body.items;
          }),
      );

      return {
        employees: team.items,
        workItems: workResponses.flat().sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      };
    },
  });

  if (!activeOrganization) {
    const hasMultiple = (context?.organizations.length ?? 0) > 1;
    return (
      <section className="mx-auto max-w-3xl pt-8">
        <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-7 wandora-pop">
          <div className="wandora-mono text-[10px] font-black text-[#09090b]/45">contexto necessário</div>
          <h1 className="wandora-display m-0 mt-3 text-4xl leading-none text-[#09090b]">
            {hasMultiple ? 'ESCOLHA SUA EMPRESA.' : 'SUA EMPRESA AINDA NÃO ESTÁ ATIVA.'}
          </h1>
          <p className="m-0 mt-4 max-w-xl text-sm leading-6 text-[#09090b]/60">
            {hasMultiple
              ? 'Selecione explicitamente a empresa no painel para carregar apenas o estado correto daquele negócio.'
              : 'Sua conta está autenticada, mas ainda não há uma empresa ativa vinculada para mostrar.'}
          </p>
        </div>
      </section>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-sm font-bold text-[#09090b]/55">
        <LoaderCircle className="mr-2 size-5 animate-spin" /> Abrindo o dia da empresa…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-7 wandora-pop">
        <div className="wandora-mono text-[10px] font-black text-[#09090b]/45">não foi possível carregar</div>
        <h1 className="wandora-display m-0 mt-3 text-4xl leading-none">O ESTADO REAL NÃO CHEGOU.</h1>
        <p className="m-0 mt-4 text-sm leading-6 text-[#09090b]/60">
          {query.error instanceof Error ? query.error.message : 'Tente novamente.'}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-5 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const employees = query.data?.employees ?? [];
  const workItems = query.data?.workItems ?? [];
  const activeEmployees = employees.filter((employee) => employee.status === 'active').length;
  const reviewReady = workItems.filter((work) => work.state === 'review-ready').length;
  const latestWork = workItems[0] ?? null;
  const latestEmployee = latestWork
    ? employees.find((employee) => employee.id === latestWork.employeeId) ?? null
    : null;
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const loggedUserName = firstName(context?.user.name ?? '');

  return (
    <div className="space-y-7">
      <section className="grid gap-5 xl:grid-cols-[1fr_190px] xl:items-start">
        <div>
          <div className="inline-flex rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1 wandora-pop-sm">
            <span className="wandora-mono text-[8px] font-black">{dayLabel(now)}</span>
          </div>

          <div className="mt-4 text-[clamp(1.45rem,2vw,2rem)] font-black leading-tight text-[#09090b]">
            {greeting}, {loggedUserName}.
          </div>

          <h1 className="wandora-display m-0 mt-1.5 max-w-3xl text-[clamp(1.9rem,3vw,3rem)] leading-[0.98] text-[#09090b]">
            SUA EQUIPE JÁ ESTÁ <span className="inline-block rounded-lg bg-[#d2e823] px-1.5">EM MOVIMENTO.</span>
          </h1>

          <p className="m-0 mt-4 max-w-2xl text-[15px] leading-7 text-[#09090b]/55">
            Veja rapidamente o que já está registrado em {activeOrganization.name} e o que precisa da sua atenção.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/approvals" className="inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-bold wandora-pop-sm wandora-press">
              <CheckCircle2 className="size-4" /> Ver aprovações
            </Link>
            <Link to="/conversations" className="inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-bold wandora-pop-sm wandora-press">
              <MessageCircleMore className="size-4" /> Conversas
            </Link>
            <Link to="/company" className="inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-bold wandora-pop-sm wandora-press">
              <Sparkles className="size-4" /> Ensinar algo
            </Link>
          </div>
        </div>

        <div className="hidden justify-self-end rounded-[1.6rem] border-[2.5px] border-[#09090b] bg-[#46c46a] p-5 wandora-pop xl:block">
          <Bot className="size-20 stroke-[2.2]" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={UsersRound} value={String(employees.length)} label="funcionários digitais" note={activeEmployees ? `${activeEmployees} ativos agora` : 'nenhum ativo'} tone="lime" />
        <MetricCard icon={BriefcaseBusiness} value={String(workItems.length)} label="trabalhos registrados" note="pelo contrato atual" tone="white" />
        <MetricCard icon={CheckCircle2} value={String(reviewReady)} label="prontos para revisão" note="resultado interno" tone="sun" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">sua equipe</div>
              <h2 className="wandora-display m-0 mt-2 text-[clamp(1.45rem,2.2vw,2rem)] leading-none">GERENCIE COMO GENTE.</h2>
            </div>
            <Link to="/team" className="rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-3 py-2 text-xs font-black wandora-pop-sm wandora-press">
              Ver equipe →
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {employees.length ? employees.map((employee) => (
              <div key={employee.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#09090b] bg-[#f8f4e8] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl border-2 border-[#09090b] bg-[#ff7a1a] text-white">
                    <Bot className="size-6" />
                  </span>
                  <div>
                    <div className="font-black">{employee.name}</div>
                    <div className="text-xs text-[#09090b]/50">{roleLabel[employee.role]} · {employee.autonomy === 'supervised' ? 'supervisionada' : employee.autonomy}</div>
                  </div>
                </div>
                <span className={`rounded-full border-2 border-[#09090b] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${employee.status === 'active' ? 'bg-[#d2e823]' : 'bg-white'}`}>
                  {employee.status === 'active' ? 'ativa' : 'pausada'}
                </span>
              </div>
            )) : (
              <p className="m-0 rounded-2xl border-2 border-dashed border-[#09090b]/25 p-5 text-sm text-[#09090b]/50">
                Nenhum funcionário digital está registrado nesta empresa.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-[#09090b] p-5 text-white wandora-pop sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="wandora-mono text-[9px] font-black text-white/45">trabalho mais recente</div>
              <h2 className="wandora-display m-0 mt-2 text-[clamp(1.45rem,2.2vw,2rem)] leading-none text-white">
                {latestWork ? 'PRONTO PARA ACOMPANHAR.' : 'SEM ADIVINHAÇÃO.'}
              </h2>
            </div>
            <Sparkles className="size-7 text-[#d2e823]" />
          </div>

          {latestWork ? (
            <div className="mt-5 rounded-2xl border-2 border-white/25 bg-white/5 p-4">
              <div className="text-xs font-black text-[#d2e823]">{latestEmployee?.name ?? 'Funcionário digital'}</div>
              <h3 className="m-0 mt-2 text-lg font-black leading-6 text-white">{latestWork.title}</h3>
              <div className="mt-3 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/75">
                {workStateLabel[latestWork.state]}
              </div>
              {latestWork.result?.summary ? (
                <p className="m-0 mt-4 line-clamp-4 text-sm leading-6 text-white/65">
                  {workResultPlainText(latestWork.result.summary, 320)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="m-0 mt-5 text-sm leading-6 text-white/55">
              Ainda não há trabalho registrado pelo contrato de customer work desta empresa.
            </p>
          )}

          <Link to="/team" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#d2e823]">
            Abrir trabalho da equipe <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#f8f4e8] p-5 wandora-pop sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-[#09090b] bg-white">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="font-black">Sem dados fictícios nesta visão.</div>
            <p className="m-0 mt-1 text-sm leading-6 text-[#09090b]/55">
              Métricas comerciais, aprovações, ferramentas e “regras da casa” só entrarão aqui quando houver contrato e estado canônico para sustentá-las.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  note,
  tone,
}: {
  icon: typeof UsersRound;
  value: string;
  label: string;
  note: string;
  tone: 'lime' | 'sun' | 'white';
}) {
  const background = tone === 'lime' ? 'bg-[#d2e823]' : tone === 'sun' ? 'bg-[#fdd030]' : 'bg-white';
  return (
    <article className={`rounded-3xl border-[2.5px] border-[#09090b] p-5 wandora-pop ${background}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="wandora-display text-4xl leading-none">{value}</div>
          <div className="mt-2 text-sm font-black">{label}</div>
          <div className="mt-1 text-xs text-[#09090b]/50">{note}</div>
        </div>
        <span className="grid size-10 place-items-center rounded-xl border-2 border-[#09090b] bg-white">
          <Icon className="size-5" />
        </span>
      </div>
    </article>
  );
}