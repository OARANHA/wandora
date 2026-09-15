import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, MessageCircleMore, Sparkles } from 'lucide-react';
import { useAuth } from '../AuthProvider';

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
                  ? 'Sua conta possui mais de uma empresa ativa. O seletor multiempresa será tratado em uma slice própria; nenhuma empresa será escolhida silenciosamente.'
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
          {query.data.items.map((item) => <WorkCard key={item.work.id} item={item} />)}
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

function WorkCard({ item }: { item: AttentionRequiredWork }) {
  return (
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
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
