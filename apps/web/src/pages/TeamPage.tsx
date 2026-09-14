import { ArrowRight, CircleCheck, Plus, ShieldCheck, Sparkles } from 'lucide-react';

const team = [
  {
    name: 'Ana',
    role: 'Assistente Comercial Digital',
    status: 'Trabalhando agora',
    summary: 'Atende novos contatos, qualifica interessados e agenda reuniões comerciais.',
    autonomy: 'Supervisionada',
    learned: 82,
    initials: 'AN',
  },
  {
    name: 'Clara',
    role: 'Atendimento ao Cliente Digital',
    status: 'Disponível',
    summary: 'Responde dúvidas, acompanha solicitações e encaminha exceções para sua equipe.',
    autonomy: 'Supervisionada',
    learned: 68,
    initials: 'CL',
  },
];

export function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="m-0 text-sm font-semibold text-indigo-600">Sua equipe</p>
          <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Pessoas e funcionários digitais, juntos.</h2>
          <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">Veja responsabilidades, trabalho atual, autonomia e evolução de cada funcionário.</p>
        </div>
        <button className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm">
          <Plus className="size-4" /> Contratar funcionário
        </button>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {team.map((employee) => (
          <article key={employee.name} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-700">{employee.initials}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="m-0 text-lg font-semibold text-slate-950">{employee.name}</h3>
                    <p className="m-0 mt-1 text-sm text-slate-500">{employee.role}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <span className="size-2 rounded-full bg-emerald-400" /> {employee.status}
                  </span>
                </div>
                <p className="m-0 mt-5 text-sm leading-6 text-slate-600">{employee.summary}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <ShieldCheck className="size-4" /> Autonomia
                </div>
                <p className="m-0 mt-2 text-sm font-semibold text-slate-800">{employee.autonomy}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <Sparkles className="size-4" /> Integração à empresa
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-800">{employee.learned}%</span>
                  <span className="text-xs text-slate-400">em evolução</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${employee.learned}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <CircleCheck className="size-4 text-emerald-500" /> Trabalhando dentro das regras da empresa
              </div>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Abrir perfil <ArrowRight className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
