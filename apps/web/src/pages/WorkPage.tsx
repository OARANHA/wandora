import { useEffect, useState } from 'react';
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

type ProposalSendAction =
  | { state: 'ready' }
  | {
      state: 'unavailable';
      reason: 'role-required' | 'channel-unavailable' | 'proposal-not-current' | 'already-sent';
    }
  | { state: 'delivery-uncertain' };

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

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function WorkPage() {
  const { activeOrganization, context, authFetch } = useAuth();
  const [sendSuccess, setSendSuccess] = useState(false);
  const query = useQuery({
    queryKey: ['attention-required', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(`/api/v1/organizations/${activeOrganization!.id}/work/attention-required`);
      if (response.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!response.ok) throw new Error('Não foi possível carregar o trabalho da sua equipe.');
      return await response.json() as AttentionResponse;
    },
  });

  useEffect(() => {
    setSendSuccess(false);
  }, [activeOrganization?.id]);

  if (!activeOrganization) {
    const hasMultiple = (context?.organizations.length ?? 0) > 1;
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <h3 className="m-0 text-sm font-semibold">{hasMultiple ? 'Escolha de empresa necessária' : 'Nenhuma empresa ativa'}</h3>
              <p className="m-0 mt-2 text-sm leading-6 text-amber-800/80">
                {hasMultiple
                  ? 'Sua conta possui mais de uma empresa ativa. Escolha explicitamente uma empresa no seletor para continuar.'
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

      {sendSuccess ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="m-0 text-sm font-semibold">Mensagem enviada com sucesso</p>
            <p className="m-0 mt-1 text-sm leading-5 text-emerald-700/80">
              O envio foi registrado pela Wandora. O trabalho foi atualizado e não precisa de um novo clique.
            </p>
          </div>
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="flex min-h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm font-medium text-slate-500">
          <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando trabalho real da equipe…
        </div>
      ) : query.isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h3 className="m-0 text-sm font-semibold">Não foi possível carregar Trabalho</h3>
          <p className="m-0 mt-2 text-sm leading-6">{query.error instanceof Error ? query.error.message : 'Tente novamente.'}</p>
          <button onClick={() => void query.refetch()} className="mt-4 rounded-xl bg-rose-900 px-4 py-2 text-sm font-semibold text-white">Tentar novamente</button>
        </div>
      ) : !query.data?.items.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-5" /></span>
          <h3 className="m-0 mt-4 text-base font-semibold text-slate-900">Nada aguardando sua atenção</h3>
          <p className="m-0 mt-2 text-sm text-slate-500">Quando um funcionário digital precisar de revisão humana, o trabalho aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {query.data.items.map((item) => (
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
  );
}

function PageHeader() {
  return (
    <div>
      <p className="m-0 text-sm font-semibold text-indigo-600">Operação</p>
      <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Trabalho</h2>
      <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">O que sua equipe está fazendo e o que realmente precisa da sua atenção.</p>
    </div>
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

function maskContactLabel(label: string): string {
  const compact = label.replace(/[\s()-]/g, '');
  if (!/^\+?\d{10,15}$/.test(compact)) return label;
  const prefixLength = compact.startsWith('+') ? 5 : 4;
  if (compact.length <= prefixLength + 4) return label;
  const hiddenLength = compact.length - prefixLength - 4;
  return `${compact.slice(0, prefixLength)}${'•'.repeat(hiddenLength)}${compact.slice(-4)}`;
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!item.proposal) throw new Error('Não existe proposta para enviar.');
      const response = await authFetch(
        `/api/v1/organizations/${organizationId}/work/${item.work.id}/proposals/${item.proposal.id}/send`,
        { method: 'POST' },
      );
      if (response.status === 403) {
        throw new Error('Seu perfil não pode autorizar este envio.');
      }
      if (response.status === 404) {
        throw new Error('O envio supervisionado ainda não está habilitado para este trabalho.');
      }
      if (response.status === 409) {
        const payload = await response.json().catch(() => ({})) as { error?: string; retry?: boolean };
        if (payload.error === 'delivery-uncertain') {
          throw new Error('Entrega incerta. A Wandora bloqueou o reenvio automático para evitar mensagem duplicada.');
        }
        if (payload.error === 'proposal-not-current') {
          throw new Error('A proposta ficou desatualizada. Atualize Trabalho antes de enviar.');
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
      setConfirmOpen(false);
      onSent();
      await queryClient.invalidateQueries({ queryKey: ['attention-required', organizationId] });
    },
  });

  const action = item.proposal?.sendAction;
  const actionStatus = action ? actionMessage(action) : null;

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Clock3 className="size-[19px]" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-base font-semibold text-slate-950">Qualificação de {item.contact.label}</h3>
                <p className="m-0 mt-1 text-xs text-slate-400">{item.employee.name} · atualizado em {dateFormatter.format(new Date(item.work.updatedAt))}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">Aguardando você</span>
            </div>

            {item.latestCustomerMessage ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><MessageCircleMore className="size-4" /> Última mensagem do cliente</div>
                <p className="m-0 text-sm leading-6 text-slate-700">{item.latestCustomerMessage.text}</p>
              </div>
            ) : null}

            {item.proposal ? (
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-700"><Sparkles className="size-4" /> Proposta de {item.employee.name}</div>
                <p className="m-0 text-sm leading-6 text-slate-800">{item.proposal.text}</p>
                <p className="m-0 mt-3 text-xs leading-5 text-slate-500">{item.proposal.rationale}</p>

                {action?.state === 'ready' ? (
                  <div className="mt-4 border-t border-indigo-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        sendMutation.reset();
                        setConfirmOpen(true);
                      }}
                      disabled={sendMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="size-4" />
                      Revisar e enviar
                    </button>
                    <p className="m-0 mt-2 text-xs leading-5 text-slate-500">O envio só acontece depois de uma confirmação final com destinatário e texto.</p>
                  </div>
                ) : actionStatus ? (
                  <div className="mt-4 flex items-start gap-2 border-t border-indigo-100 pt-4 text-xs leading-5 text-slate-500">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{actionStatus}</span>
                  </div>
                ) : null}

                {sendMutation.isError && !confirmOpen ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                    {sendMutation.error instanceof Error ? sendMutation.error.message : 'Não foi possível concluir o envio.'}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </article>

      {confirmOpen && item.proposal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-send-${item.proposal.id}`}
            className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Send className="size-5" /></span>
              <div>
                <h3 id={`confirm-send-${item.proposal.id}`} className="m-0 text-lg font-semibold text-slate-950">Confirmar envio</h3>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">Confira o destinatário e a mensagem. O segundo botão abaixo é o único que efetivamente envia.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Destinatário</p>
                <p className="m-0 mt-1 text-sm font-semibold text-slate-800">{maskContactLabel(item.contact.label)}</p>
              </div>
              <div>
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Mensagem exata</p>
                <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.proposal.text}</p>
              </div>
            </div>

            {sendMutation.isError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                {sendMutation.error instanceof Error ? sendMutation.error.message : 'Não foi possível concluir o envio.'}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={sendMutation.isPending}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
