import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useAuth } from '../AuthProvider';

type DevelopmentEntry = {
  kind: 'responsibility' | 'behavior' | 'practice';
  status: 'active' | 'retired';
};

type WorkItem = {
  state: 'submitting' | 'submitted' | 'uncertain' | 'executing' | 'review-ready' | 'execution-uncertain';
  result: { summary: string; model: string } | null;
};

const milestoneLabels = ['Papel', 'Comportamento', 'Prática', 'Experiência'] as const;

export function DigitalEmployeeDevelopmentProgress({
  employeeId,
}: {
  employeeId: string;
}) {
  const { activeOrganization, authFetch } = useAuth();

  const developmentPath = activeOrganization
    ? `/api/v1/organizations/${activeOrganization.id}/digital-employees/${employeeId}/development`
    : '';
  const workPath = activeOrganization
    ? `/api/v1/organizations/${activeOrganization.id}/digital-employees/${employeeId}/work`
    : '';

  const developmentQuery = useQuery({
    queryKey: ['digital-employee-development', activeOrganization?.id, employeeId],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(developmentPath);
      if (!response.ok) throw new Error('development-progress-unavailable');
      return await response.json() as { items: DevelopmentEntry[] };
    },
  });

  const workQuery = useQuery({
    queryKey: ['digital-employee-work', activeOrganization?.id, employeeId],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(workPath);
      if (!response.ok) throw new Error('development-work-evidence-unavailable');
      return await response.json() as { items: WorkItem[] };
    },
  });

  const milestones = useMemo(() => {
    const active = (developmentQuery.data?.items ?? []).filter((entry) => entry.status === 'active');
    return [
      active.some((entry) => entry.kind === 'responsibility'),
      active.some((entry) => entry.kind === 'behavior'),
      active.some((entry) => entry.kind === 'practice'),
      (workQuery.data?.items ?? []).some((item) => item.state === 'review-ready' && Boolean(item.result)),
    ];
  }, [developmentQuery.data?.items, workQuery.data?.items]);

  const completed = milestones.filter(Boolean).length;
  const loading = developmentQuery.isLoading || workQuery.isLoading;
  const unavailable = developmentQuery.isError || workQuery.isError;

  return (
    <div className="mt-5 rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="wandora-mono text-[8px] font-black uppercase tracking-[0.08em] text-[#09090b]/40">
            desenvolvimento na empresa
          </div>
          <div className="mt-1 text-sm font-black">
            {loading ? 'Lendo marcos reais…' : unavailable ? 'Progresso indisponível agora' : `${completed} de 4 marcos`}
          </div>
        </div>
        {!loading && !unavailable ? (
          <div className="text-2xl font-black tabular-nums">{completed * 25}%</div>
        ) : null}
      </div>

      <div
        className="mt-3 grid grid-cols-4 gap-1.5"
        role="progressbar"
        aria-label="Desenvolvimento baseado em marcos reais"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={unavailable ? undefined : completed}
      >
        {milestones.map((done, index) => (
          <span
            key={milestoneLabels[index]}
            className={`h-3 rounded-full border border-[#09090b] ${done ? 'bg-[#d2e823]' : 'bg-white'}`}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        {milestoneLabels.map((label, index) => (
          <div key={label} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.05em] text-[#09090b]/55">
            <span className={`grid size-4 shrink-0 place-items-center rounded-full border border-[#09090b] ${milestones[index] ? 'bg-[#d2e823]' : 'bg-white'}`}>
              {milestones[index] ? <Check className="size-2.5" strokeWidth={3} /> : null}
            </span>
            {label}
          </div>
        ))}
      </div>

      <p className="m-0 mt-3 text-[10px] leading-4 text-[#09090b]/45">
        Mede marcos observáveis da formação nesta empresa. Não mede inteligência, desempenho nem altera autonomia.
      </p>
    </div>
  );
}
