import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { DigitalEmployeeDevelopmentPanel } from '../components/DigitalEmployeeDevelopmentPanel';
import { DigitalEmployeeWorkPanel } from '../components/DigitalEmployeeWorkPanel';

type DigitalEmployee = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
  activation: {
    available: boolean;
    state: 'available' | 'active' | 'unavailable';
  };
  work: {
    available: boolean;
    state: 'available' | 'unavailable';
  };
};

type HireAvailability = {
  catalogKey: 'ana-commercial-v1';
  available: boolean;
  state: 'available' | 'already-hired' | 'reconciliation-required' | 'unavailable';
};

type DigitalEmployeesResponse = {
  items: DigitalEmployee[];
  hire: HireAvailability;
};

const roleLabel: Record<DigitalEmployee['role'], string> = {
  'commercial-assistant': 'Assistente comercial',
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

  const activation = useMutation({
    mutationFn: async (employeeId: string) => {
      if (!activeOrganization) throw new Error('Escolha uma empresa antes de ativar um funcionário.');
      const response = await authFetch(
        `/api/v1/organizations/${activeOrganization.id}/digital-employees/${employeeId}/activate`,
        { method: 'POST' },
      );
      if (response.status === 403) throw new Error('Seu acesso não permite ativar funcionários nesta empresa.');
      if (response.status === 409) throw new Error('A ativação precisa ser reconciliada antes de tentar novamente.');
      if (response.status === 503) throw new Error('A ativação está temporariamente indisponível.');
      if (!response.ok) throw new Error('Não foi possível ativar este funcionário agora.');
      return await response.json() as { employee: DigitalEmployee };
    },
    onSuccess: async () => {
      await query.refetch();
    },
  });

  if (!activeOrganization) {
    const hasMultiple = (context?.organizations.length ?? 0) > 1;
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-6 wandora-pop">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <h3 className="m-0 text-sm font-black">
                {hasMultiple ? 'Escolha a empresa que você quer abrir' : 'Nenhuma empresa ativa'}
              </h3>
              <p className="m-0 mt-2 text-sm leading-6 text-[#09090b]/65">
                {hasMultiple
                  ? 'A equipe sempre é carregada no contexto explícito da empresa selecionada.'
                  : 'Sua conta está autenticada, mas ainda não possui uma empresa ativa.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canManage = activeOrganization.role === 'owner' || activeOrganization.role === 'admin';
  const hire = query.data?.hire;
  const showHireAction = Boolean(
    canManage && (hire?.available || hire?.state === 'reconciliation-required'),
  );

  return (
    <div className="space-y-7">
      <PageHeader />

      {query.isLoading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border-[2.5px] border-[#09090b] bg-white text-sm font-black text-[#09090b]/55 wandora-pop">
          <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando sua equipe…
        </div>
      ) : query.isError ? (
        <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-6 wandora-pop">
          <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">não foi possível carregar</div>
          <h3 className="wandora-display m-0 mt-2 text-3xl">A EQUIPE NÃO CHEGOU.</h3>
          <p className="m-0 mt-3 text-sm leading-6 text-[#09090b]/60">
            {query.error instanceof Error ? query.error.message : 'Tente novamente.'}
          </p>
          <button
            onClick={() => void query.refetch()}
            className="mt-4 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press"
          >
            Tentar novamente
          </button>
        </div>
      ) : !query.data?.items.length ? (
        <EmptyTeam
          hire={hire}
          showHireAction={showHireAction}
          onHire={() => void navigate({ to: '/start' })}
        />
      ) : (
        <>
          {activation.isError ? (
            <div className="rounded-2xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-4 text-sm font-bold">
              {activation.error instanceof Error ? activation.error.message : 'Não foi possível ativar o funcionário.'}
            </div>
          ) : null}

          <section className="grid gap-6">
            {query.data.items.map((employee) => (
              <EmployeeProfile
                key={employee.id}
                employee={employee}
                canManage={canManage}
                activating={activation.isPending && activation.variables === employee.id}
                onActivate={() => activation.mutate(employee.id)}
              />
            ))}
          </section>

          <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">contratação</div>
                <h2 className="wandora-display m-0 mt-2 text-3xl">CRESÇA SÓ QUANDO FOR REAL.</h2>
                <p className="m-0 mt-3 max-w-2xl text-sm leading-6 text-[#09090b]/55">
                  A Wandora só mostra contratação quando o catálogo e a elegibilidade desta empresa realmente permitem.
                  Não exibimos candidatos ou vagas fictícias.
                </p>
              </div>
              {showHireAction ? (
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/start' })}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press"
                >
                  <Plus className="size-4" />
                  {hire?.state === 'reconciliation-required' ? 'Revisar contratação' : 'Contratar Ana'}
                </button>
              ) : (
                <span className="rounded-full border-2 border-[#09090b] bg-[#f8f4e8] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em]">
                  {hire?.state === 'already-hired' ? 'catálogo já contratado' : 'sem nova contratação disponível'}
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <section>
      <div className="inline-flex rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1.5 wandora-pop-sm">
        <span className="wandora-mono text-[9px] font-black">sua equipe · estado real</span>
      </div>
      <h1 className="wandora-display m-0 mt-4 max-w-4xl text-[clamp(2.35rem,4.2vw,4rem)] leading-[0.96] text-[#09090b]">
        GERENCIE COMO <span className="inline-block rounded-xl bg-[#fdd030] px-2">GENTE.</span>
      </h1>
      <p className="m-0 mt-4 max-w-2xl text-[15px] leading-7 text-[#09090b]/60">
        Veja quem já faz parte da empresa, o estado de cada funcionário digital e quanto de autonomia está realmente
        habilitado hoje.
      </p>
    </section>
  );
}

function EmptyTeam({
  hire,
  showHireAction,
  onHire,
}: {
  hire: HireAvailability | undefined;
  showHireAction: boolean;
  onHire: () => void;
}) {
  return (
    <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-7 text-center wandora-pop">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl border-2 border-[#09090b] bg-[#d2e823]">
        <Bot className="size-6" />
      </span>
      <h3 className="wandora-display m-0 mt-5 text-3xl">AINDA NÃO TEM NINGUÉM DIGITAL AQUI.</h3>
      <p className="m-0 mx-auto mt-3 max-w-xl text-sm leading-6 text-[#09090b]/55">
        {hire?.state === 'reconciliation-required'
          ? 'Existe uma contratação em verificação. A Wandora só permitirá retomar a operação original.'
          : hire?.state === 'unavailable'
            ? 'A contratação ainda não está liberada para esta empresa.'
            : 'Quando a empresa tiver funcionários digitais contratados, eles aparecerão aqui.'}
      </p>
      {showHireAction ? (
        <button
          type="button"
          onClick={onHire}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press"
        >
          <Plus className="size-4" />
          {hire?.state === 'reconciliation-required' ? 'Revisar contratação' : 'Contratar Ana'}
        </button>
      ) : null}
    </div>
  );
}

function EmployeeProfile({
  employee,
  canManage,
  activating,
  onActivate,
}: {
  employee: DigitalEmployee;
  canManage: boolean;
  activating: boolean;
  onActivate: () => void;
}) {
  const active = employee.status === 'active';

  return (
    <article className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-6 wandora-pop">
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-24 place-items-center rounded-[1.75rem] border-[2.5px] border-[#09090b] bg-[#ff7a1a] text-white wandora-pop-sm">
              <Bot className="size-12" strokeWidth={2.2} />
            </span>
            <span className={`inline-flex items-center gap-2 rounded-full border-2 border-[#09090b] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] ${active ? 'bg-[#d2e823]' : 'bg-[#f8f4e8]'}`}>
              <span className={`size-2 rounded-full ${active ? 'bg-[#46c46a] wandora-live-dot' : 'bg-[#09090b]/35'}`} />
              {active ? 'ativa' : 'pausada'}
            </span>
          </div>

          <h2 className="wandora-display m-0 mt-5 text-4xl uppercase">{employee.name}</h2>
          <p className="m-0 mt-1 text-sm font-black text-[#09090b]/55">
            {roleLabel[employee.role]} · funcionária digital
          </p>

          <div className="mt-5 space-y-2.5">
            <FactLine text="Autonomia atual: supervisionada" />
            <FactLine text={employee.work.available ? 'Pode receber trabalho supervisionado' : 'Admissão de trabalho indisponível neste momento'} />
            <FactLine text={active ? 'Estado operacional ativo na Wandora' : 'Permanece pausada até uma ativação autorizada'} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em]">
              supervisionada
            </span>
            <span className="rounded-full border-2 border-[#09090b] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em]">
              {employee.activation.state === 'active' ? 'ativação concluída' : employee.activation.state === 'available' ? 'ativação disponível' : 'ativação indisponível'}
            </span>
          </div>

          {canManage && employee.status === 'paused' && employee.activation.available ? (
            <div className="mt-6 rounded-2xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-4">
              <div className="font-black">Pronta para ativação.</div>
              <p className="m-0 mt-1 text-sm leading-6 text-[#09090b]/65">
                Ativar torna {employee.name} apta a receber trabalho supervisionado. Não inicia trabalho e não libera envios externos.
              </p>
              <button
                type="button"
                disabled={activating}
                onClick={onActivate}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {activating ? 'Ativando…' : `Ativar ${employee.name}`}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#09090b] p-6 text-white wandora-pop">
          <div className="wandora-mono text-[9px] font-black text-white/45">nível de autonomia · real hoje</div>
          <h3 className="wandora-display m-0 mt-3 text-4xl text-white">COM SUPERVISÃO.</h3>
          <p className="m-0 mt-3 text-sm leading-6 text-white/65">
            Este é o único nível de autonomia atualmente exposto pelo contrato da Wandora para {employee.name}. Outros
            níveis do protótipo não aparecem como opções até existir política e contrato canônico para sustentá-los.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <AutonomyCell label="Aprendiz" active={false} future />
            <AutonomyCell label="Com supervisão" active />
            <AutonomyCell label="De confiança" active={false} future />
          </div>

          <div className="mt-5 rounded-2xl border-2 border-dashed border-white/25 p-4">
            <div className="flex items-center gap-2 text-[#d2e823]">
              <ShieldCheck className="size-5" />
              <span className="font-black">Controle humano preservado</span>
            </div>
            <p className="m-0 mt-2 text-sm leading-6 text-white/60">
              O estado supervisionado continua sendo a verdade do produto. Human Send e outros efeitos externos
              permanecem contratos separados.
            </p>
          </div>

          <Link to="/work" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#d2e823]">
            Ver trabalho que precisa de atenção <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)] xl:items-start">
        <DigitalEmployeeDevelopmentPanel
          employeeId={employee.id}
          employeeName={employee.name}
          autonomy={employee.autonomy}
          canManage={canManage}
        />

        {employee.work.available ? (
          <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-4 wandora-pop sm:p-5 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
            <DigitalEmployeeWorkPanel employeeId={employee.id} employeeName={employee.name} compact />
          </section>
        ) : null}
      </div>
    </article>
  );
}

function FactLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm leading-6 text-[#09090b]/75">
      <Check className="mt-1 size-4 shrink-0" strokeWidth={2.5} />
      <span>{text}</span>
    </div>
  );
}

function AutonomyCell({
  label,
  active,
  future = false,
}: {
  label: string;
  active: boolean;
  future?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-2 px-3 py-3 text-center ${active
        ? 'border-[#d2e823] bg-[#d2e823] text-[#09090b]'
        : 'border-white/20 bg-white/5 text-white/35'}`}
    >
      <div className="text-xs font-black uppercase tracking-[0.08em]">{label}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em]">
        {active ? 'nível atual' : future ? 'futuro' : ''}
      </div>
    </div>
  );
}