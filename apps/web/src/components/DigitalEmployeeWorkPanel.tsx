import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import {
  WorkOperationError,
  clearWorkOperation,
  resolveWorkOperation,
  type WorkOperationRef,
} from '../customerWorkOperation';

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

type WorkTab = 'new' | 'recent';

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

const PAGE_SIZE = 5;

export function DigitalEmployeeWorkPanel({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const { activeOrganization, authFetch } = useAuth();
  const [tab, setTab] = useState<WorkTab>('new');
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submittedWork, setSubmittedWork] = useState<WorkItem | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{
    key: string;
    title: string;
    description: string;
  } | null>(null);
  const workOperationRef = useRef<WorkOperationRef | null>(null);

  const path = activeOrganization
    ? `/api/v1/organizations/${activeOrganization.id}/digital-employees/${employeeId}/work`
    : '';

  const query = useQuery({
    queryKey: ['digital-employee-work', activeOrganization?.id, employeeId],
    enabled: Boolean(activeOrganization),
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const response = await authFetch(path);
      if (response.status === 403) throw new Error('Seu acesso não permite acompanhar este trabalho.');
      if (!response.ok) throw new Error('Não foi possível carregar o trabalho deste funcionário.');
      return await response.json() as { items: WorkItem[] };
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: { title: string; description: string }) => {
      if (!activeOrganization) throw new WorkRequestError('Escolha uma empresa antes de atribuir trabalho.');

      let operation: WorkOperationRef;
      try {
        operation = await resolveWorkOperation(
          activeOrganization.id,
          employeeId,
          input.title,
          input.description,
          workOperationRef.current,
        );
      } catch (error) {
        if (error instanceof WorkOperationError) {
          throw new WorkRequestError(error.message);
        }
        throw error;
      }

      workOperationRef.current = operation;
      setPendingRequest({
        key: operation.idempotencyKey,
        title: input.title,
        description: input.description,
      });

      let response: Response;
      try {
        response = await authFetch(path, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': operation.idempotencyKey,
          },
          body: JSON.stringify({ title: input.title, description: input.description }),
        });
      } catch {
        throw new WorkRequestError(
          'A Wandora não conseguiu confirmar a resposta. Repita exatamente a mesma solicitação; a identidade original será reutilizada.',
          true,
        );
      }

      const body = await response.json().catch(() => null) as { error?: string; work?: WorkItem } | null;
      if (response.ok) {
        if (!body?.work?.id || body.work.employeeId !== employeeId) {
          throw new WorkRequestError(
            'A Wandora recebeu uma confirmação incompleta. Repita exatamente a mesma solicitação para reconciliar com segurança.',
            true,
          );
        }
        clearWorkOperation(operation);
        workOperationRef.current = null;
        return { work: body.work };
      }

      if (response.status === 400 || response.status === 403 || response.status === 404) {
        clearWorkOperation(operation);
        workOperationRef.current = null;
      }
      if (response.status === 400) {
        throw new WorkRequestError('Revise o pedido antes de atribuir este trabalho.');
      }
      if (response.status === 403) {
        throw new WorkRequestError('Seu acesso não permite atribuir trabalho nesta empresa.');
      }
      if (response.status === 404) {
        throw new WorkRequestError('A admissão de trabalho ainda não está habilitada para este funcionário.');
      }
      if (response.status === 409) {
        if (body?.error === 'employee-work-uncertain') {
          throw new WorkRequestError(
            'A Wandora não pode confirmar se o trabalho foi despachado. Repetir preservará exatamente a mesma solicitação; não crie outra.',
            true,
          );
        }
        throw new WorkRequestError(
          'Este trabalho precisa de reconciliação. Não crie outra solicitação; repita a original ou revise os trabalhos recentes.',
          true,
        );
      }
      if (response.status === 503) {
        throw new WorkRequestError(
          'A admissão está temporariamente indisponível. Repita exatamente a mesma solicitação; a identidade original será reutilizada.',
          true,
        );
      }
      throw new WorkRequestError(
        'A resposta ficou inconclusiva. Repita exatamente a mesma solicitação; a Wandora reutilizará a identidade original.',
        true,
      );
    },
    onSuccess: async ({ work }) => {
      setSubmittedWork(work);
      setPendingRequest(null);
      setTitle('');
      setDescription('');
      setPage(1);
      await query.refetch();
    },
    onError: (error) => {
      if (!(error instanceof WorkRequestError) || !error.retrySameRequest) {
        setPendingRequest(null);
      }
    },
  });

  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const visibleItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );

  const submit = () => {
    const normalizedRequest = title.trim();
    const normalizedDetails = description.trim();
    if (!normalizedRequest) return;

    const canonicalDescription = normalizedDetails
      ? `${normalizedRequest}\n\nDetalhes adicionais:\n${normalizedDetails}`
      : normalizedRequest;

    mutation.mutate({
      title: normalizedRequest,
      description: canonicalDescription,
    });
  };

  const retrySame = () => {
    if (pendingRequest) {
      mutation.mutate({
        title: pendingRequest.title,
        description: pendingRequest.description,
      });
    }
  };

  const uncertainRequest = mutation.error instanceof WorkRequestError
    && mutation.error.retrySameRequest
    ? pendingRequest
    : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-[#09090b] bg-[#f8f4e8] p-1.5">
        <WorkTabButton
          active={tab === 'new'}
          onClick={() => setTab('new')}
          icon={<Bot className="size-4" />}
        >
          Novo trabalho
        </WorkTabButton>
        <WorkTabButton
          active={tab === 'recent'}
          onClick={() => setTab('recent')}
          icon={<History className="size-4" />}
        >
          Trabalhos recentes
        </WorkTabButton>
      </div>

      {tab === 'new' ? (
        <section className="mt-5">
          <div>
            <h4 className="m-0 text-lg font-black">O que você quer que {employeeName} faça?</h4>
            <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/50">
              O resultado fica interno para sua revisão. Nada é enviado para cliente, WhatsApp ou e-mail neste fluxo.
            </p>
          </div>

          {submittedWork ? (
            <div role="status" aria-live="polite" className="mt-4 rounded-2xl border-2 border-[#09090b] bg-[#d2e823] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="m-0 text-sm font-black">Trabalho enviado para {employeeName}</p>
                  <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/65">
                    Acompanhe aqui pelos recentes ou abra a área Trabalho para ver o resultado completo.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('recent')}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-black underline decoration-2 underline-offset-4"
                  >
                    Ver trabalhos recentes <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <input
              value={uncertainRequest ? uncertainRequest.title : title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={Boolean(uncertainRequest) || mutation.isPending}
              maxLength={200}
              placeholder={`Ex.: Qual o valor do Desenvolvimento Web?`}
              className="h-11 w-full rounded-xl border-2 border-[#09090b]/15 bg-white px-3 text-sm outline-none transition focus:border-[#09090b] disabled:bg-[#f8f4e8]"
            />
            <textarea
              value={uncertainRequest ? uncertainRequest.description : description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={Boolean(uncertainRequest) || mutation.isPending}
              maxLength={4000}
              rows={5}
              placeholder="Detalhes adicionais (opcional). Ex.: informe também código, preço e estoque."
              className="w-full resize-none rounded-xl border-2 border-[#09090b]/15 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#09090b] disabled:bg-[#f8f4e8]"
            />

            {mutation.isError ? (
              <div className="rounded-xl border-2 border-[#09090b] bg-[#fdd030] p-3 text-xs leading-5">
                {mutation.error instanceof Error ? mutation.error.message : 'Não foi possível atribuir o trabalho.'}
              </div>
            ) : null}

            {uncertainRequest ? (
              <button
                type="button"
                onClick={retrySame}
                disabled={mutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#fdd030] px-4 text-xs font-black disabled:opacity-60"
              >
                {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                Repetir a mesma solicitação
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={mutation.isPending || !title.trim()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#09090b] px-4 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Bot className="size-4" />}
                {mutation.isPending ? 'Atribuindo…' : `Dar trabalho para ${employeeName}`}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="mt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h4 className="m-0 text-lg font-black">Trabalhos recentes</h4>
              <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/50">
                Até 5 por página. O resultado completo continua na área Trabalho.
              </p>
            </div>
            {!query.isLoading && !query.isError ? (
              <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#09090b]/40">
                {items.length} recentes
              </span>
            ) : null}
          </div>

          {query.isLoading ? (
            <div className="mt-5 flex min-h-32 items-center justify-center text-xs font-bold text-[#09090b]/45">
              <LoaderCircle className="mr-2 size-4 animate-spin" /> Carregando…
            </div>
          ) : query.isError ? (
            <div className="mt-5 rounded-xl border-2 border-[#09090b] bg-[#fdd030] p-3 text-xs">
              Não foi possível carregar os trabalhos recentes.
            </div>
          ) : !items.length ? (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-[#09090b]/15 p-5 text-center text-xs text-[#09090b]/50">
              Nenhum trabalho atribuído por este contrato ainda.
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-2.5">
                {visibleItems.map((item) => (
                  <article key={item.id} className="rounded-2xl border-2 border-[#09090b]/15 bg-white p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-black text-[#09090b]">{item.title}</p>
                        <p className="m-0 mt-1 line-clamp-2 text-xs leading-5 text-[#09090b]/45">
                          {item.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#09090b]/20 bg-[#f8f4e8] px-2 py-1 text-[9px] font-black uppercase">
                        {stateLabel[item.state]}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold text-[#09090b]/35">
                        {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                      <Link
                        to="/work"
                        className="text-xs font-black underline decoration-2 underline-offset-4"
                      >
                        {item.result ? 'Abrir resultado' : 'Ver trabalho'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}

function WorkTabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition ${active ? 'bg-[#09090b] text-white' : 'bg-transparent text-[#09090b]/55'}`}
    >
      {icon}
      {children}
    </button>
  );
}

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Paginação dos trabalhos recentes" className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#09090b]/10 pt-4">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="inline-flex items-center gap-1 rounded-lg border-2 border-[#09090b] bg-white px-2.5 py-2 text-[10px] font-black disabled:opacity-30"
      >
        <ChevronLeft className="size-3.5" /> Anterior
      </button>

      <div className="flex flex-wrap justify-center gap-1">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => (
          <button
            key={value}
            type="button"
            aria-current={value === page ? 'page' : undefined}
            onClick={() => onPageChange(value)}
            className={`grid size-8 place-items-center rounded-lg border-2 border-[#09090b] text-[10px] font-black ${value === page ? 'bg-[#d2e823]' : 'bg-white'}`}
          >
            {value}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={page === pageCount}
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        className="inline-flex items-center gap-1 rounded-lg border-2 border-[#09090b] bg-white px-2.5 py-2 text-[10px] font-black disabled:opacity-30"
      >
        Próximo <ChevronRight className="size-3.5" />
      </button>
    </nav>
  );
}
