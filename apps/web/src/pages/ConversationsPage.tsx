import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  MessageCircleMore,
  Search,
} from 'lucide-react';
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

type ConversationDetail = {
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
  messages: Array<{
    direction: 'inbound' | 'outbound';
    text: string;
    occurredAt: string;
  }>;
  hasEarlierMessages: boolean;
};

type ConversationsResponse = { items: ConversationListItem[] };

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const messageTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
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

function conversationStatusLabel(status: ConversationListItem['conversation']['status']): string {
  return status === 'open' ? 'em andamento' : 'encerrada';
}

export function ConversationsPage() {
  const { activeOrganization, context, authFetch } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['conversations', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/organizations/${activeOrganization!.id}/conversations`,
      );
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

  const selected = query.data?.items.find(
    (item) => item.conversation.id === selectedId,
  ) ?? null;

  const detailQuery = useQuery({
    queryKey: ['conversation-detail', activeOrganization?.id, selected?.conversation.id],
    enabled: Boolean(activeOrganization && selected),
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/organizations/${activeOrganization!.id}/conversations/${selected!.conversation.id}`,
      );
      if (response.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (response.status === 404) throw new Error('Esta conversa não está mais disponível nesta empresa.');
      if (!response.ok) throw new Error('Não foi possível carregar o histórico desta conversa.');
      return await response.json() as ConversationDetail;
    },
  });

  if (!activeOrganization) {
    const hasMultiple = (context?.organizations.length ?? 0) > 1;
    return (
      <div className="space-y-7">
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
                  ? 'As conversas sempre são carregadas no contexto explícito da empresa selecionada.'
                  : 'Sua conta está autenticada, mas ainda não possui uma empresa ativa.'}
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

      <section className="grid min-h-[600px] overflow-hidden rounded-[2rem] border-[2.5px] border-[#09090b] bg-white wandora-pop lg:grid-cols-[390px_1fr]">
        <aside className="border-b-[2.5px] border-[#09090b] bg-[#f8f4e8] lg:border-b-0 lg:border-r-[2.5px]">
          <div className="border-b-2 border-[#09090b]/10 p-4">
            <label className="flex h-11 items-center gap-2 rounded-xl border-2 border-[#09090b] bg-white px-3 wandora-pop-sm">
              <Search className="size-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por pessoa ou conteúdo"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#09090b] outline-none placeholder:text-[#09090b]/35"
              />
            </label>
            <div className="wandora-mono mt-3 text-[9px] font-black text-[#09090b]/40">
              até 100 conversas mais recentes
            </div>
          </div>

          {query.isLoading ? (
            <div className="flex min-h-48 items-center justify-center px-6 text-sm font-black text-[#09090b]/50">
              <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando conversas…
            </div>
          ) : query.isError ? (
            <div className="m-4 rounded-2xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-4">
              <p className="m-0 text-sm font-black">Não foi possível carregar Conversas</p>
              <p className="m-0 mt-2 text-xs leading-5 text-[#09090b]/65">
                {query.error instanceof Error ? query.error.message : 'Tente novamente.'}
              </p>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="mt-3 rounded-xl border-2 border-[#09090b] bg-white px-3 py-2 text-xs font-black wandora-pop-sm wandora-press"
              >
                Tentar novamente
              </button>
            </div>
          ) : !query.data?.items.length ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <span className="grid size-12 place-items-center rounded-2xl border-2 border-[#09090b] bg-white">
                <Inbox className="size-5" />
              </span>
              <p className="m-0 mt-4 text-sm font-black">Nenhuma conversa ainda</p>
              <p className="m-0 mt-1 max-w-xs text-xs leading-5 text-[#09090b]/45">
                As conversas canônicas da empresa aparecerão aqui quando existirem.
              </p>
            </div>
          ) : !filtered.length ? (
            <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm font-semibold text-[#09090b]/40">
              Nenhuma conversa corresponde à busca.
            </div>
          ) : (
            <div className="divide-y-2 divide-[#09090b]/10">
              {filtered.map((item) => {
                const active = item.conversation.id === selectedId;
                return (
                  <button
                    key={item.conversation.id}
                    type="button"
                    onClick={() => setSelectedId(item.conversation.id)}
                    className={`w-full p-4 text-left transition ${active ? 'bg-[#d2e823]' : 'bg-transparent hover:bg-white'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`grid size-11 shrink-0 place-items-center rounded-xl border-2 border-[#09090b] text-xs font-black ${active ? 'bg-white' : 'bg-[#ff7a1a] text-white'}`}>
                        {initials(item.contact.label)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-[#09090b]">
                              {item.contact.label}
                            </div>
                            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#09090b]/45">
                              {conversationStatusLabel(item.conversation.status)}
                            </div>
                          </div>
                          <time className="shrink-0 text-[10px] font-bold text-[#09090b]/40">
                            {dateFormatter.format(new Date(item.conversation.lastActivityAt))}
                          </time>
                        </div>
                        <p className="m-0 mt-2 line-clamp-2 text-xs leading-5 text-[#09090b]/60">
                          {item.latestMessage?.text ?? 'Sem mensagens registradas.'}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-[#09090b]/55">
                          {item.employee ? (
                            <>
                              <Bot className="size-3.5" />
                              <span>Com {item.employee.name}</span>
                            </>
                          ) : (
                            <span>Sem funcionária responsável no momento</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main className="bg-white p-5 sm:p-7 lg:p-9">
          {selected ? (
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
              <header className="border-b-2 border-[#09090b]/10 pb-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl border-[2.5px] border-[#09090b] bg-[#d2e823] wandora-pop-sm">
                      <MessageCircleMore className="size-6" />
                    </span>
                    <div>
                      <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">
                        conversa canônica
                      </div>
                      <h2 className="wandora-display m-0 mt-1 text-3xl">
                        {selected.contact.label}
                      </h2>
                      <p className="m-0 mt-1 text-sm font-semibold text-[#09090b]/50">
                        {selected.employee
                          ? `Acompanhada por ${selected.employee.name}`
                          : 'Sem funcionária responsável no momento'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border-2 border-[#09090b] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] ${selected.conversation.status === 'open' ? 'bg-[#d2e823]' : 'bg-[#f8f4e8]'}`}>
                      {conversationStatusLabel(selected.conversation.status)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#09090b] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em]">
                      <LockKeyhole className="size-3.5" />
                      somente leitura
                    </span>
                  </div>
                </div>
              </header>

              {detailQuery.isLoading ? (
                <div className="flex min-h-64 flex-1 items-center justify-center text-sm font-black text-[#09090b]/50">
                  <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando histórico…
                </div>
              ) : detailQuery.isError ? (
                <div className="mt-6 rounded-2xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-5">
                  <p className="m-0 text-sm font-black">Não foi possível carregar o histórico</p>
                  <p className="m-0 mt-2 text-xs leading-5 text-[#09090b]/65">
                    {detailQuery.error instanceof Error ? detailQuery.error.message : 'Tente novamente.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void detailQuery.refetch()}
                    className="mt-3 rounded-xl border-2 border-[#09090b] bg-white px-3 py-2 text-xs font-black wandora-pop-sm wandora-press"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : detailQuery.data ? (
                <div className="mt-6 flex min-h-0 flex-1 flex-col">
                  {detailQuery.data.hasEarlierMessages ? (
                    <div className="mb-4 rounded-2xl border-2 border-[#09090b] bg-[#fdd030] px-4 py-3 text-xs font-bold leading-5">
                      Esta conversa possui mensagens anteriores. Esta visão mostra apenas as 100 mensagens canônicas mais recentes.
                    </div>
                  ) : null}

                  {!detailQuery.data.messages.length ? (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#09090b]/25 bg-[#f8f4e8] px-6 text-center">
                      <Inbox className="size-6 text-[#09090b]/35" />
                      <p className="m-0 mt-3 text-sm font-black">Ainda não há mensagens</p>
                      <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/45">
                        Quando houver mensagens canônicas nesta conversa, elas aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-4 wandora-scrollbar sm:p-5">
                      {detailQuery.data.messages.map((message, index) => {
                        const outbound = message.direction === 'outbound';
                        return (
                          <div
                            key={`${message.occurredAt}-${index}`}
                            className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[86%] rounded-2xl border-2 border-[#09090b] px-4 py-3 ${outbound ? 'bg-[#09090b] text-white' : 'bg-white text-[#09090b]'}`}>
                              <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.09em] ${outbound ? 'text-white/50' : 'text-[#09090b]/40'}`}>
                                <span>{outbound ? 'Enviada' : 'Recebida'}</span>
                                <span>•</span>
                                <time>{messageTimeFormatter.format(new Date(message.occurredAt))}</time>
                              </div>
                              <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-6">
                                {message.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-4">
                    <div className="flex items-start gap-3">
                      <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                      <div>
                        <div className="text-xs font-black">Histórico para contexto, não para ação.</div>
                        <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/50">
                          Responder, editar, enviar ou assumir uma conversa continua indisponível até existir um contrato humano específico para essas ações.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
              <span className="grid size-16 place-items-center rounded-[1.4rem] border-[2.5px] border-[#09090b] bg-[#d2e823] wandora-pop">
                <MessageCircleMore className="size-7" />
              </span>
              <div className="wandora-mono mt-5 text-[9px] font-black text-[#09090b]/40">
                escolha uma conversa
              </div>
              <h2 className="wandora-display m-0 mt-2 text-4xl">VEJA O CONTEXTO REAL.</h2>
              <p className="m-0 mt-3 max-w-md text-sm leading-6 text-[#09090b]/55">
                Selecione uma conversa para abrir o histórico recente da empresa sem depender da interface do provedor de mensagens.
              </p>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

function PageHeader() {
  return (
    <section>
      <div className="inline-flex rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1.5 wandora-pop-sm">
        <span className="wandora-mono text-[9px] font-black">conversas · estado real</span>
      </div>
      <h1 className="wandora-display m-0 mt-4 max-w-4xl text-[clamp(2.35rem,4.2vw,4rem)] leading-[0.96] text-[#09090b]">
        CONTEXTO SEM <span className="inline-block rounded-xl bg-[#fdd030] px-2">TROCAR DE PAINEL.</span>
      </h1>
      <p className="m-0 mt-4 max-w-2xl text-[15px] leading-7 text-[#09090b]/60">
        Veja as conversas canônicas da empresa e o histórico recente que sua equipe já pode usar como contexto. Sem presença inventada, sem takeover e sem envio automático.
      </p>
    </section>
  );
}