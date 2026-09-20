import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bot, LoaderCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../AuthProvider';

type WorkItem = {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  state: 'submitting' | 'submitted' | 'uncertain' | 'executing' | 'review-ready' | 'execution-uncertain';
  result: { summary: string; model: string } | null;
  createdAt: string;
  updatedAt: string;
};

class WorkRequestError extends Error {
  constructor(message: string, readonly retrySameRequest = false) {
    super(message);
    this.name = 'WorkRequestError';
  }
}

const stateLabel: Record<WorkItem['state'], string> = {
  submitting: 'Preparando',
  submitted: 'Enviado para Ana',
  uncertain: 'Verificação necessária',
  executing: 'Ana está trabalhando',
  'review-ready': 'Pronto para sua revisão',
  'execution-uncertain': 'Execução em verificação',
};

export function DigitalEmployeeWorkPanel({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const { activeOrganization, authFetch } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pendingRequest, setPendingRequest] = useState<{
    key: string;
    title: string;
    description: string;
  } | null>(null);

  const path = activeOrganization
    ? `/api/v1/organizations/${activeOrganization.id}/digital-employees/${employeeId}/work`
    : '';

  const query = useQuery({
    queryKey: ['digital-employee-work', activeOrganization?.id, employeeId],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(path);
      if (response.status === 403) throw new Error('Seu acesso não permite acompanhar este trabalho.');
      if (!response.ok) throw new Error('Não foi possível carregar o trabalho deste funcionário.');
      return await response.json() as { items: WorkItem[] };
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: { key: string; title: string; description: string }) => {
      const response = await authFetch(path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': input.key,
        },
        body: JSON.stringify({ title: input.title, description: input.description }),
      });
      if (response.status === 403) {
        throw new WorkRequestError('Seu acesso não permite atribuir trabalho nesta empresa.');
      }
      if (response.status === 409) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (body.error === 'employee-work-uncertain') {
          throw new WorkRequestError(
            'A Wandora não pode confirmar se o trabalho foi despachado. Repetir preservará exatamente a mesma solicitação; não crie outra.',
            true,
          );
        }
        throw new WorkRequestError('Este trabalho precisa de reconciliação antes de qualquer nova tentativa.');
      }
      if (response.status === 503) {
        throw new WorkRequestError('A admissão de trabalho está temporariamente indisponível.');
      }
      if (!response.ok) throw new WorkRequestError('Não foi possível atribuir este trabalho agora.');
      return await response.json() as { work: WorkItem };
    },
    onSuccess: async () => {
      setPendingRequest(null);
      setTitle('');
      setDescription('');
      await query.refetch();
    },
    onError: (error) => {
      if (!(error instanceof WorkRequestError) || !error.retrySameRequest) {
        setPendingRequest(null);
      }
    },
  });

  const submit = () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedTitle || !normalizedDescription) return;
    const request = pendingRequest ?? {
      key: crypto.randomUUID(),
      title: normalizedTitle,
      description: normalizedDescription,
    };
    setPendingRequest(request);
    mutation.mutate(request);
  };

  const retrySame = () => {
    if (pendingRequest) mutation.mutate(pendingRequest);
  };

  const uncertain = mutation.error instanceof WorkRequestError
    && mutation.error.retrySameRequest
    && pendingRequest;

  return (
    <section className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
          <Bot className="size-4" />
        </span>
        <div>
          <h4 className="m-0 text-sm font-semibold text-slate-900">Dar trabalho para {employeeName}</h4>
          <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
            O resultado fica interno para sua revisão. Este fluxo não envia WhatsApp, e-mail nem executa outra ação externa.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <input
          value={uncertain ? pendingRequest.title : title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={Boolean(uncertain) || mutation.isPending}
          maxLength={200}
          placeholder="Ex.: Preparar resumo das oportunidades desta semana"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-300 disabled:bg-slate-50"
        />
        <textarea
          value={uncertain ? pendingRequest.description : description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={Boolean(uncertain) || mutation.isPending}
          maxLength={4000}
          rows={4}
          placeholder="Descreva o resultado interno que você quer receber. Não peça envio externo neste primeiro fluxo."
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-indigo-300 disabled:bg-slate-50"
        />
        {mutation.isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            {mutation.error instanceof Error ? mutation.error.message : 'Não foi possível atribuir o trabalho.'}
          </div>
        ) : null}
        {uncertain ? (
          <button
            type="button"
            onClick={retrySame}
            disabled={mutation.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-700 px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Repetir a mesma solicitação
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending || !title.trim() || !description.trim()}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Bot className="size-4" />}
            {mutation.isPending ? 'Atribuindo…' : 'Atribuir trabalho supervisionado'}
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-indigo-100 pt-4">
        <h5 className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Trabalhos recentes</h5>
        {query.isLoading ? (
          <p className="mt-3 text-xs text-slate-500">Carregando…</p>
        ) : query.isError ? (
          <p className="mt-3 text-xs text-rose-700">Não foi possível carregar os trabalhos recentes.</p>
        ) : !query.data?.items.length ? (
          <p className="mt-3 text-xs text-slate-500">Nenhum trabalho atribuído por este contrato ainda.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {query.data.items.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 text-sm font-semibold text-slate-800">{item.title}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {stateLabel[item.state]}
                  </span>
                </div>
                {item.result ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                    {item.result.summary}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
