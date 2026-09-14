import { Check, Clock3, ShieldAlert, X } from 'lucide-react';

const approvals = [
  {
    employee: 'Ana',
    title: 'Desconto de 12% para Mariana',
    reason: 'O desconto padrão permitido é de até 8%. A cliente pediu uma condição especial para fechar hoje.',
    context: 'Oportunidade de R$ 2.480 · margem preservada acima do limite mínimo',
    waiting: 'há 11 min',
  },
  {
    employee: 'Clara',
    title: 'Prometer entrega para sexta-feira',
    reason: 'O prazo solicitado pelo cliente está fora do padrão e ainda precisa de confirmação operacional.',
    context: 'Pedido #1842 · cliente recorrente',
    waiting: 'há 24 min',
  },
];

export function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="m-0 text-sm font-semibold text-amber-600">Sua decisão</p>
        <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Aprovações</h2>
        <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">Seus funcionários param aqui quando uma ação ultrapassa a autonomia que você definiu.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {approvals.map((approval) => (
            <article key={approval.title} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                  <ShieldAlert className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{approval.employee} pede sua aprovação</p>
                      <h3 className="m-0 mt-2 text-lg font-semibold text-slate-950">{approval.title}</h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <Clock3 className="size-3.5" /> {approval.waiting}
                    </span>
                  </div>
                  <p className="m-0 mt-4 text-sm leading-6 text-slate-600">{approval.reason}</p>
                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">{approval.context}</div>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">
                      <Check className="size-4" /> Aprovar
                    </button>
                    <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600">
                      <X className="size-4" /> Recusar
                    </button>
                    <button className="h-10 rounded-xl px-3 text-sm font-semibold text-indigo-600">Conversar com {approval.employee}</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-3xl bg-[#111827] p-6 text-white">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Como funciona</p>
          <h3 className="m-0 mt-3 text-xl font-semibold tracking-tight">Você continua no controle.</h3>
          <p className="m-0 mt-3 text-sm leading-6 text-slate-400">Funcionários digitais executam o trabalho rotineiro. Quando uma decisão sai das regras, ela vem para você com contexto suficiente para decidir rápido.</p>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">Descontos acima do limite</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">Compromissos fora da política</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">Ações financeiras ou irreversíveis</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
