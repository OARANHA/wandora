import { CheckCircle2, CircleDashed, Clock3 } from 'lucide-react';

const work = [
  { title: 'Retorno comercial para Mariana', owner: 'Ana', state: 'Em andamento', icon: CircleDashed, note: 'Aguardando aprovação de desconto' },
  { title: 'Qualificação de novo contato', owner: 'Ana', state: 'Em andamento', icon: CircleDashed, note: 'Coletando necessidade e prazo' },
  { title: 'Revisão do pedido #1842', owner: 'Clara', state: 'Aguardando você', icon: Clock3, note: 'Exceção de prazo' },
  { title: 'Atendimento de pós-venda', owner: 'Clara', state: 'Concluído', icon: CheckCircle2, note: 'Resolvido sem pendências' },
];

export function WorkPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="m-0 text-sm font-semibold text-indigo-600">Operação</p>
        <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Trabalho</h2>
        <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">Uma visão do que sua equipe está fazendo, sem transformar a empresa em um gerenciador de workflows.</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {work.map(({ title, owner, state, icon: Icon, note }, index) => (
          <div key={title} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${index ? 'border-t border-slate-100' : ''}`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500"><Icon className="size-[18px]" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-sm font-semibold text-slate-900">{title}</h3>
              <p className="m-0 mt-1 text-xs text-slate-400">{owner} · {note}</p>
            </div>
            <span className="self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:self-auto">{state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
