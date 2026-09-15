import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Inbox, LoaderCircle, MessageCircleMore, Search } from 'lucide-react';
import { useAuth } from '../AuthProvider';

type ConversationListItem = {
  conversation: {
    id: string;
    status: 'open' | 'closed';
    lastActivityAt: string;
  };
  contact: {
    id: string;
    label: string;
  };
  employee: {
    id: string;
    name: string;
  } | null;
  latestMessage: {
    direction: 'inbound' | 'outbound';
    text: string;
    occurredAt: string;
  } | null;
};

type ConversationsResponse = { items: ConversationListItem[] };

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function initials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ConversationsPage() {
  const { activeOrganization, context, authFetch } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['conversations', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(`/api/v1/organizations/${activeOrganization!.id}/conversations`);
      if (response.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!response.ok) throw new Error('Não foi possível carregar as conversas da sua empresa.');
      return await response.json() as ConversationsResponse;
    },
  });

  const filtered = useMemo(() => {
    const items = query.data?.items ?? [];
    const needle = search.trim().toLocaleLowerCase('pt-BR');
    if (!needle) return items;
    return items.filter((item) => (
      item.contact.label.toLocaleLowerCase('pt-BR').includes(needle)
      || item.latestMessage?.text.toLocaleLowerCase('pt-BR').includes(needle)
      || item.employee?.name.toLocaleLowerCase('pt-BR').includes(needle)
    ));
  }, [query.data?.items, search]);

  const selected = query.data?.items.find((item) => item.conversation.id === selectedId) ?? null;

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
                  ? 'Sua conta possui mais de uma empresa ativa. Nenhuma empresa será escolhida silenciosamente.'
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
      <div className="grid min-h-[520px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] lg:grid-cols-[390px_1fr]">
        <div className="border-b border-slate-100 lg:border-b-0 lg:border-r">
          <div className="p-4">
            <label className="flex h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 focus-within:ring-2 focus-within:ring-indigo-100">
              <Search className="size-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar conversa"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          {query.isLoading ? (
            <div className="flex min-h-48 items-center justify-center px-6 text-sm font-medium text-slate-500">
              <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando conversas…
            </div>
          ) : query.isError ? (
            <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <p className="m-0 text-sm font-semibold">Não foi possível carregar Conversas</p>
              <p className="m-0 mt-2 text-xs leading-5">{query.error instanceof Error ? query.error.message : 'Tente novamente.'}</p>
              <button onClick={() => void query.refetch()} className="mt-3 rounded-xl bg-rose-900 px-3 py-2 text-xs font-semibold text-white">Tentar novamente</button>
            </div>
          ) : !query.data?.items.length ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <Inbox className="size-6 text-slate-300" />
              <p className="m-0 mt-3 text-sm font-semibold text-slate-700">Nenhuma conversa ainda</p>
              <p className="m-0 mt-1 text-xs leading-5 text-slate-400">As conversas canônicas da empresa aparecerão aqui.</p>
            </div>
          ) : !filtered.length ? (
            <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-slate-400">Nenhuma conversa corresponde à busca.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const active = item.conversation.id === selectedId;
                return (
                  <button
                    key={item.conversation.id}
                    onClick={() => setSelectedId(item.conversation.id)}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 ${active ? 'bg-slate-50/90' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">{initials(item.contact.label)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">{item.contact.label}</span>
                          <span className="shrink-0 text-[11px] text-slate-400">{dateFormatter.format(new Date(item.conversation.lastActivityAt))}</span>
                        </div>
                        <p className="m-0 mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {item.latestMessage?.text ?? 'Sem mensagens registradas.'}
                        </p>
                        <p className="m-0 mt-1 text-[11px] font-medium text-indigo-500">
                          {item.employee ? `Com ${item.employee.name}` : 'Sem funcionário responsável no momento'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden bg-slate-50/40 p-10 lg:flex lg:flex-col lg:items-center lg:justify-center">
          {selected ? (
            <div className="w-full max-w-lg">
              <div className="grid size-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70">
                <MessageCircleMore className="size-6" />
              </div>
              <h3 className="m-0 mt-5 text-lg font-semibold text-slate-900">{selected.contact.label}</h3>
              <p className="m-0 mt-1 text-sm text-slate-500">{selected.employee ? `Acompanhada por ${selected.employee.name}` : 'Sem funcionário responsável no momento'}</p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Última mensagem registrada</p>
                <p className="m-0 mt-3 text-sm leading-6 text-slate-700">{selected.latestMessage?.text ?? 'Ainda não há mensagem registrada nesta conversa.'}</p>
              </div>
              <p className="m-0 mt-4 text-xs leading-5 text-slate-400">Esta etapa mostra apenas o resumo canônico da conversa. O histórico completo e qualquer ação de resposta terão contratos próprios antes de serem liberados.</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70">
                <MessageCircleMore className="size-6" />
              </div>
              <h3 className="m-0 mt-5 text-lg font-semibold text-slate-900">Selecione uma conversa</h3>
              <p className="m-0 mt-2 max-w-md text-sm leading-6 text-slate-500">Veja o resumo canônico mais recente sem depender da interface do provedor de mensagens.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="m-0 text-sm font-semibold text-indigo-600">Relacionamentos</p>
      <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Conversas</h2>
      <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">Conversas da empresa aparecem aqui como contexto de negócio. O provedor usado por baixo continua fora da experiência do cliente.</p>
    </div>
  );
}
