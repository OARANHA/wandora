import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../AuthProvider';

type Employee = { id: string; name: string };
type WorkItem = {
  id: string;
  employeeId: string;
  title: string;
  state: 'submitting' | 'submitted' | 'uncertain' | 'executing' | 'review-ready' | 'execution-uncertain';
};

type CompletedWork = WorkItem & { employeeName: string };

export function WorkCompletionNotifier() {
  const { activeOrganization, authFetch } = useAuth();
  const previousStates = useRef<Map<string, WorkItem['state']> | null>(null);
  const [notice, setNotice] = useState<CompletedWork | null>(null);

  const query = useQuery({
    queryKey: ['customer-work-completion-watch', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const employeesResponse = await authFetch(
        `/api/v1/organizations/${activeOrganization!.id}/digital-employees`,
      );
      if (!employeesResponse.ok) return [] as CompletedWork[];
      const employeesPayload = await employeesResponse.json() as { items?: Employee[] };
      const employees = employeesPayload.items ?? [];

      const groups = await Promise.all(employees.map(async (employee) => {
        const response = await authFetch(
          `/api/v1/organizations/${activeOrganization!.id}/digital-employees/${employee.id}/work`,
        );
        if (!response.ok) return [] as CompletedWork[];
        const payload = await response.json() as { items?: WorkItem[] };
        return (payload.items ?? []).map((item) => ({ ...item, employeeName: employee.name }));
      }));

      return groups.flat();
    },
  });

  useEffect(() => {
    previousStates.current = null;
    setNotice(null);
  }, [activeOrganization?.id]);

  useEffect(() => {
    if (!query.data) return;

    const next = new Map(query.data.map((item) => [item.id, item.state] as const));
    const previous = previousStates.current;
    previousStates.current = next;

    // The first successful read establishes a baseline. Wandora has no durable
    // "unread work result" contract, so the Web must not invent one.
    if (!previous) return;

    const newlyReady = query.data.find((item) => (
      item.state === 'review-ready' && previous.get(item.id) !== 'review-ready'
    ));
    if (newlyReady) setNotice(newlyReady);
  }, [query.data]);

  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 right-4 z-50 w-[min(420px,calc(100vw-2rem))] rounded-2xl border-[2.5px] border-[#09090b] bg-white p-4 shadow-[6px_6px_0_#09090b] lg:bottom-5 lg:right-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-[#09090b] bg-[#d2e823]">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="wandora-mono text-[9px] font-black text-[#09090b]/45">trabalho concluído nesta sessão</div>
          <p className="m-0 mt-1 text-sm font-black text-[#09090b]">{notice.employeeName} terminou: {notice.title}</p>
          <Link
            to="/work"
            onClick={() => setNotice(null)}
            className="mt-3 inline-flex rounded-lg border-2 border-[#09090b] bg-[#d2e823] px-3 py-2 text-xs font-black"
          >
            Ver resultado
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-[#09090b] bg-white"
          aria-label="Fechar notificação"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
