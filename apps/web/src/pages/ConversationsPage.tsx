import { MessageCircleMore, Search } from 'lucide-react';

const conversations = [
  { name: 'Mariana Souza', preview: 'Entendi. Se conseguirmos essa condição, podemos fechar hoje.', employee: 'Ana', time: 'agora', unread: true },
  { name: 'João Martins', preview: 'Preciso confirmar se a entrega pode acontecer ainda esta semana.', employee: 'Clara', time: '7 min', unread: false },
  { name: 'Carlos Lima', preview: 'Pode agendar para amanhã às 10h.', employee: 'Ana', time: '21 min', unread: false },
];

export function ConversationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="m-0 text-sm font-semibold text-indigo-600">Relacionamentos</p>
        <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Conversas</h2>
        <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">WhatsApp e futuros canais aparecem como conversas da empresa. O provedor usado por baixo não faz parte da experiência do cliente.</p>
      </div>
      <div className="grid min-h-[520px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] lg:grid-cols-[390px_1fr]">
        <div className="border-b border-slate-100 lg:border-b-0 lg:border-r">
          <div className="p-4">
            <div className="flex h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400">
              <Search className="size-4" />
              <span className="text-sm">Buscar conversa</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => (
              <button key={conversation.name} className="w-full p-4 text-left transition first:bg-slate-50/80 hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">{conversation.name.split(' ').map((part) => part[0]).slice(0,2)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-900">{conversation.name}</span><span className="text-[11px] text-slate-400">{conversation.time}</span></div>
                    <p className="m-0 mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{conversation.preview}</p>
                    <p className="m-0 mt-1 text-[11px] font-medium text-indigo-500">Com {conversation.employee}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="hidden flex-col items-center justify-center bg-slate-50/40 p-10 text-center lg:flex">
          <div className="grid size-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70">
            <MessageCircleMore className="size-6" />
          </div>
          <h3 className="m-0 mt-5 text-lg font-semibold text-slate-900">Conversa acompanhada pela Ana</h3>
          <p className="m-0 mt-2 max-w-md text-sm leading-6 text-slate-500">Aqui o gestor poderá acompanhar o contexto, assumir a conversa quando necessário ou orientar o funcionário sem lidar com telas da Evolution.</p>
        </div>
      </div>
    </div>
  );
}
