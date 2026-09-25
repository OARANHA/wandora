import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageCircleMore,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { WorkResultContent } from '../components/WorkResultContent';

type HumanSendConfirmation = {
  recipientMasked: string;
  text: string;
  version: string;
};

type ProposalSendAction =
  | { state: 'ready'; confirmation: HumanSendConfirmation }
  | {
      state: 'unavailable';
      reason: 'role-required' | 'channel-unavailable' | 'proposal-not-current' | 'already-sent';
    }
  | { state: 'delivery-uncertain' };

type ReviewedSend = HumanSendConfirmation & {
  workItemId: string;
  proposalId: string;
};

type AttentionRequiredWork = {
  work: {
    id: string;
    kind: 'qualify-new-contact';
    status: 'attention-required';
    updatedAt: string;
  };
  employee: {
    id: string;
    name: string;
  };
  contact: {
    id: string;
    label: string;
  };
  conversation: {
    id: string;
  };
  latestCustomerMessage: {
    text: string;
    occurredAt: string;
  } | null;
  proposal: {
    id: string;
    kind: 'send-text';
    text: string;
    rationale: string;
    createdAt: string;
    sendAction?: ProposalSendAction;
  } | null;
};

type AttentionResponse = { items: AttentionRequiredWork[] };

type DigitalEmployee = { id: string; name: string };

type SupervisedWorkItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  state: 'submitting' | 'submitted' | 'uncertain' | 'executing' | 'review-ready' | 'execution-uncertain';
  result: { summary: string; model: string } | null;
  createdAt: string;
  updatedAt: string;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const supervisedStateLabel: Record<SupervisedWorkItem['state'], string> = {
  submitting: 'Preparando',
  submitted: 'Enviado',
  uncertain: 'Verificação necessária',
  executing: 'Em andamento',
  'review-ready': 'Pronto para sua revisão',
  'execution-uncertain': 'Execução em verificação',
};

const supervisedStateTone: Record<SupervisedWorkItem['state'], string> = {
  submitting: 'bg-[#f8f4e8]',
  submitted: 'bg-[#f8f4e8]',
  uncertain: 'bg-[#fdd030]',
  executing: 'bg-[#d2e823]',
  'review-ready': 'bg-[#d2e823]',
  'execution-uncertain': 'bg-[#fdd030]',
};

export function WorkPage() {
  const { activeOrganization, context, authFetch } = useAuth();
  const [sendSuccess, setSendSuccess] = useState(false);

  const supervisedQuery = useQuery({
    queryKey: ['customer-supervised-work-overview', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const employeeResponse = await authFetch(
        `/api/v1/organizations/${activeOrganization!.id}/digital-employees`,
      );
      if (employeeResponse.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!employeeResponse.ok) throw new Error('Não foi possível carregar sua equipe.');
      const employeePayload = await employeeResponse.json() as { items?: DigitalEmployee[] };
      const employees = employeePayload.items ?? [];

      const groups = await Promise.all(employees.map(async (employee) => {
        const response = await authFetch(
          `/api/v1/organizations/${activeOrganization!.id}/digital-employees/${employee.id}/work`,
        );
        if (response.status === 403) throw new Error('Seu acesso não permite acompanhar este trabalho.');
        if (!response.ok) throw new Error(`Não foi possível carregar os trabalhos de ${employee.name}.`);
        const payload = await response.json() as {
          items?: Omit<SupervisedWorkItem, 'employeeName'>[];
        };
        return (payload.items ?? []).map((item) => ({ ...item, employeeName: employee.name }));
      }));

      return groups.flat().sort((a, b) => (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    },
  });

  const attentionQuery = useQuery({
    queryKey: ['attention-required', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(`/api/v1/organizations/${activeOrganization!.id}/work/attention-required`);
      if (response.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!response.ok) throw new Error('Não foi possível carregar o trabalho que precisa da sua atenção.');
      return await response.json() as AttentionResponse;
    },
  });

  useEffect(() => {
    setSendSuccess(false);
  }, [activeOrganization?.id]);

  const groups = useMemo(() => {
    const items = supervisedQuery.data ?? [];
    return {
      reviewReady: items.filter((item) => item.state === 'review-ready'),
      running: items.filter((item) => ['submitting', 'submitted', 'executing'].includes(item.state)),
      uncertain: items.filter((item) => ['uncertain', 'execution-uncertain'].includes(item.state)),
      recent: items,
    };
  }, [supervisedQuery.data]);

  if (!activeOrganization) {
    const hasMultiple = (context?.organizations.length ?? 0) > 1;
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <h3 className="m-0 text-sm font-black">{hasMultiple ? 'Escolha de empresa necessária' : 'Nenhuma empresa ativa'}</h3>
              <p className="m-0 mt-2 text-sm leading-6 text-[#09090b]/65">
                {hasMultiple
                  ? 'Escolha explicitamente a empresa no menu para acompanhar a equipe certa.'
                  : 'Sua conta está vinculada à Wandora, mas ainda não possui uma empresa ativa.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader />

      {sendSuccess ? (
        <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border-[2.5px] border-[#09090b] bg-[#d2e823] px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="m-0 text-sm font-black">Mensagem enviada com sucesso</p>
            <p className="m-0 mt-1 text-sm leading-5 text-[#09090b]/65">
              O envio foi registrado pela Wandora. O trabalho foi atualizado e não precisa de um novo clique.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Em andamento" value={groups.running.length} copy="Trabalhos que sua equipe está executando agora." />
        <SummaryCard label="Prontos para revisão" value={groups.reviewReady.length} copy="Resultados internos disponíveis para você abrir." />
        <SummaryCard label="Em verificação" value={groups.uncertain.length} copy="Casos em que a Wandora preservou segurança antes de concluir." />
      </section>

      {supervisedQuery.isLoading ? (
        <LoadingCard label="Carregando os trabalhos reais da equipe…" />
      ) : supervisedQuery.isError ? (
        <ErrorCard
          title="Não foi possível carregar os trabalhos supervisionados"
          message={supervisedQuery.error instanceof Error ? supervisedQuery.error.message : 'Tente novamente.'}
          onRetry={() => void supervisedQuery.refetch()}
        />
      ) : !groups.recent.length ? (
        <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-7 text-center wandora-pop">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border-2 border-[#09090b] bg-[#f8f4e8]"><Clock3 className="size-5" /></span>
          <h3 className="wandora-display m-0 mt-4 text-2xl">AINDA NÃO HÁ TRABALHO SUPERVISIONADO.</h3>
          <p className="m-0 mx-auto mt-2 max-w-xl text-sm leading-6 text-[#09090b]/55">
            Quando você atribuir um trabalho pela página Equipe, ele aparecerá aqui com o estado real até o resultado ficar pronto.
          </p>
        </section>
      ) : (
        <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">trabalho supervisionado</div>
              <h2 className="wandora-display m-0 mt-2 text-3xl">ACOMPANHE DO PEDIDO AO RESULTADO.</h2>
            </div>
            <span className="text-xs font-bold text-[#09090b]/45">Atualização automática nesta página</span>
          </div>
          <div className="mt-5 space-y-4">
            {groups.recent.slice(0, 20).map((item) => <SupervisedWorkCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#09090b] p-5 text-white wandora-pop sm:p-6">
        <div className="wandora-mono text-[9px] font-black text-white/45">atenção humana</div>
        <h2 className="wandora-display m-0 mt-2 text-3xl text-white">SÓ INTERROMPE VOCÊ QUANDO PRECISA.</h2>
        <p className="m-0 mt-3 max-w-2xl text-sm leading-6 text-white/60">
          Esta área é diferente do histórico acima: aqui entram apenas trabalhos cujo contrato exige uma decisão ou revisão humana específica.
        </p>

        <div className="mt-5">
          {attentionQuery.isLoading ? (
            <div className="flex min-h-32 items-center justify-center rounded-2xl border-2 border-white/15 text-sm font-bold text-white/55">
              <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando atenção necessária…
            </div>
          ) : attentionQuery.isError ? (
            <div className="rounded-2xl border-2 border-[#fdd030] bg-[#fdd030] p-4 text-[#09090b]">
              <div className="font-black">Não foi possível carregar esta fila.</div>
              <p className="m-0 mt-1 text-sm">{attentionQuery.error instanceof Error ? attentionQuery.error.message : 'Tente novamente.'}</p>
              <button onClick={() => void attentionQuery.refetch()} className="mt-3 rounded-xl border-2 border-[#09090b] bg-white px-3 py-2 text-xs font-black">Tentar novamente</button>
            </div>
          ) : !attentionQuery.data?.items.length ? (
            <div className="rounded-2xl border-2 border-dashed border-white/25 p-5 text-center">
              <CheckCircle2 className="mx-auto size-6 text-[#d2e823]" />
              <p className="m-0 mt-3 text-sm font-black">Nada aguardando uma decisão sua agora.</p>
              <p className="m-0 mt-1 text-xs leading-5 text-white/50">Isso não significa que sua equipe esteja parada; acompanhe os trabalhos no histórico acima.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attentionQuery.data.items.map((item) => (
                <WorkCard
                  key={item.work.id}
                  item={item}
                  organizationId={activeOrganization.id}
                  onSent={() => setSendSuccess(true)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PageHeader() {
  return (
    <section>
      <div className="inline-flex rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1.5 wandora-pop-sm">
        <span className="wandora-mono text-[9px] font-black">operação · estado real</span>
      </div>
      <h1 className="wandora-display m-0 mt-4 max-w-4xl text-[clamp(2.35rem,4.2vw,4rem)] leading-[0.96] text-[#09090b]">
        SAIBA O QUE ESTÁ <span className="inline-block rounded-xl bg-[#fdd030] px-2">ACONTECENDO.</span>
      </h1>
      <p className="m-0 mt-4 max-w-2xl text-[15px] leading-7 text-[#09090b]/60">
        Acompanhe o trabalho que você deu à equipe, abra resultados internos e veja separadamente o que realmente exige sua atenção.
      </p>
    </section>
  );
}

function SummaryCard({ label, value, copy }: { label: string; value: number; copy: string }) {
  return (
    <div className="rounded-2xl border-[2.5px] border-[#09090b] bg-white p-4 wandora-pop-sm">
      <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">{label}</div>
      <div className="wandora-display mt-2 text-4xl">{value}</div>
      <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/50">{copy}</p>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-3xl border-[2.5px] border-[#09090b] bg-white text-sm font-black text-[#09090b]/55 wandora-pop">
      <LoaderCircle className="mr-2 size-5 animate-spin" /> {label}
    </div>
  );
}

function ErrorCard({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-6">
      <h3 className="m-0 text-sm font-black">{title}</h3>
      <p className="m-0 mt-2 text-sm leading-6 text-[#09090b]/70">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl border-2 border-[#09090b] bg-white px-4 py-2 text-sm font-black">Tentar novamente</button>
    </div>
  );
}

function SupervisedWorkCard({ item }: { item: SupervisedWorkItem }) {
  return (
    <article className="rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-black text-[#09090b]">{item.title}</h3>
          <p className="m-0 mt-1 text-xs text-[#09090b]/45">
            {item.employeeName} · atualizado em {dateFormatter.format(new Date(item.updatedAt))}
          </p>
        </div>
        <span className={`rounded-full border-2 border-[#09090b] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.06em] ${supervisedStateTone[item.state]}`}>
          {supervisedStateLabel[item.state]}
        </span>
      </div>
      <p className="m-0 mt-3 text-sm leading-6 text-[#09090b]/60">{item.description}</p>
      {item.result ? (
        <div className="mt-4 rounded-2xl border-[2.5px] border-[#09090b] bg-white p-4">
          <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">resultado interno · revise antes de qualquer efeito externo</div>
          <div className="mt-3">
            <WorkResultContent value={item.result.summary} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function actionMessage(action: ProposalSendAction): string | null {
  if (action.state === 'ready') return null;
  if (action.state === 'delivery-uncertain') {
    return 'Entrega incerta. A Wandora bloqueou o reenvio automático até existir reconciliação segura.';
  }
  if (action.reason === 'role-required') return 'Somente owner ou admin pode enviar respostas nesta versão.';
  if (action.reason === 'channel-unavailable') return 'Este canal ainda não está habilitado para envio supervisionado.';
  if (action.reason === 'already-sent') return 'Esta resposta já foi enviada.';
  return 'A proposta ficou desatualizada e precisa ser recalculada antes de qualquer envio.';
}

function WorkCard({
  item,
  organizationId,
  onSent,
}: {
  item: AttentionRequiredWork;
  organizationId: string;
  onSent: () => void;
}) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [reviewedSend, setReviewedSend] = useState<ReviewedSend | null>(null);
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!reviewedSend) throw new Error('Revise novamente o destinatário e a mensagem antes de enviar.');
      const response = await authFetch(
        `/api/v1/organizations/${organizationId}/work/${reviewedSend.workItemId}/proposals/${reviewedSend.proposalId}/send`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ confirmationVersion: reviewedSend.version }),
        },
      );
      if (response.status === 400) throw new Error('A confirmação canônica não é mais válida. Atualize Trabalho e revise novamente.');
      if (response.status === 403) throw new Error('Seu perfil não pode autorizar este envio.');
      if (response.status === 404) throw new Error('O envio supervisionado ainda não está habilitado para este trabalho.');
      if (response.status === 409) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (payload.error === 'delivery-uncertain') {
          throw new Error('Entrega incerta. A Wandora bloqueou o reenvio automático para evitar mensagem duplicada.');
        }
        if (payload.error === 'proposal-not-current') {
          throw new Error('A proposta ficou desatualizada. Atualize Trabalho antes de enviar.');
        }
        if (payload.error === 'confirmation-stale') {
          throw new Error('O destinatário ou a mensagem mudaram desde sua revisão. Atualize Trabalho e revise novamente antes de enviar.');
        }
        if (payload.error === 'send-unavailable') {
          throw new Error('O canal não está disponível para este envio supervisionado.');
        }
        throw new Error('O envio não pode mais ser executado neste estado.');
      }
      if (!response.ok) throw new Error('Não foi possível concluir o envio supervisionado.');
      return await response.json() as { status: 'sent'; proposalId: string; conversationId: string };
    },
    onSuccess: async () => {
      setReviewedSend(null);
      onSent();
      await queryClient.invalidateQueries({ queryKey: ['attention-required', organizationId] });
    },
  });

  const action = item.proposal?.sendAction;
  const actionStatus = action ? actionMessage(action) : null;
  const readyConfirmation = action?.state === 'ready' ? action.confirmation : null;
  const missingConfirmation = action?.state === 'ready' && !readyConfirmation
    ? 'Atualize Trabalho para carregar a confirmação canônica antes de enviar.'
    : null;

  return (
    <>
      <article className="overflow-hidden rounded-2xl border-2 border-white/20 bg-white text-[#09090b]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#fdd030]"><Clock3 className="size-[19px]" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-base font-black">Qualificação de {item.contact.label}</h3>
                <p className="m-0 mt-1 text-xs text-[#09090b]/45">{item.employee.name} · atualizado em {dateFormatter.format(new Date(item.work.updatedAt))}</p>
              </div>
              <span className="rounded-full border-2 border-[#09090b] bg-[#fdd030] px-3 py-1.5 text-xs font-black">Aguardando você</span>
            </div>

            {item.latestCustomerMessage ? (
              <div className="mt-5 rounded-2xl bg-[#f8f4e8] p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-[#09090b]/55"><MessageCircleMore className="size-4" /> Última mensagem do cliente</div>
                <p className="m-0 text-sm leading-6 text-[#09090b]/75">{item.latestCustomerMessage.text}</p>
              </div>
            ) : null}

            {item.proposal ? (
              <div className="mt-4 rounded-2xl border-2 border-[#09090b]/15 bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-black"><Sparkles className="size-4" /> Proposta de {item.employee.name}</div>
                <p className="m-0 text-sm leading-6">{item.proposal.text}</p>
                <p className="m-0 mt-3 text-xs leading-5 text-[#09090b]/50">{item.proposal.rationale}</p>

                {readyConfirmation ? (
                  <div className="mt-4 border-t-2 border-[#09090b]/10 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        sendMutation.reset();
                        setReviewedSend({
                          ...readyConfirmation,
                          workItemId: item.work.id,
                          proposalId: item.proposal!.id,
                        });
                      }}
                      disabled={sendMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="size-4" />
                      Revisar e enviar
                    </button>
                    <p className="m-0 mt-2 text-xs leading-5 text-[#09090b]/50">O envio só acontece depois de uma confirmação final emitida pelo Core com destinatário e texto canônicos.</p>
                  </div>
                ) : actionStatus || missingConfirmation ? (
                  <div className="mt-4 flex items-start gap-2 border-t-2 border-[#09090b]/10 pt-4 text-xs leading-5 text-[#09090b]/55">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{actionStatus ?? missingConfirmation}</span>
                  </div>
                ) : null}

                {sendMutation.isError && !reviewedSend ? (
                  <div className="mt-3 rounded-xl border-2 border-[#09090b] bg-[#fdd030] px-3 py-2 text-xs leading-5">
                    {sendMutation.error instanceof Error ? sendMutation.error.message : 'Não foi possível concluir o envio.'}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </article>

      {reviewedSend ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/50 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-send-${reviewedSend.proposalId}`}
            className="w-full max-w-xl rounded-3xl border-[2.5px] border-[#09090b] bg-white p-6 shadow-[8px_8px_0_#09090b]"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-[#09090b] bg-[#d2e823]"><Send className="size-5" /></span>
              <div>
                <h3 id={`confirm-send-${reviewedSend.proposalId}`} className="m-0 text-lg font-black">Confirmar envio</h3>
                <p className="m-0 mt-1 text-sm leading-6 text-[#09090b]/55">Confira o destinatário e a mensagem canônicos. O segundo botão abaixo é o único que efetivamente envia.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4 rounded-2xl bg-[#f8f4e8] p-4">
              <div>
                <p className="wandora-mono m-0 text-[9px] font-black text-[#09090b]/40">destinatário</p>
                <p className="m-0 mt-1 text-sm font-black">{reviewedSend.recipientMasked}</p>
              </div>
              <div>
                <p className="wandora-mono m-0 text-[9px] font-black text-[#09090b]/40">mensagem exata</p>
                <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-6">{reviewedSend.text}</p>
              </div>
            </div>

            {sendMutation.isError ? (
              <div className="mt-4 rounded-xl border-2 border-[#09090b] bg-[#fdd030] px-3 py-2 text-xs leading-5">
                {sendMutation.error instanceof Error ? sendMutation.error.message : 'Não foi possível concluir o envio.'}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReviewedSend(null)}
                disabled={sendMutation.isPending}
                className="rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-black disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black disabled:opacity-60"
              >
                {sendMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                {sendMutation.isPending ? 'Enviando…' : 'Confirmar e enviar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
