import {
  ArrowRight,
  CalendarCheck2,
  CircleDollarSign,
  Clock3,
  MessageSquareText,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const metrics = [
  { label: 'Conversas hoje', value: '18', note: '+6 desde ontem', icon: MessageSquareText },
  { label: 'Oportunidades', value: '5', note: '3 novas', icon: TrendingUp },
  { label: 'Reuniões marcadas', value: '3', note: 'próxima às 14h', icon: CalendarCheck2 },
  { label: 'Em negociação', value: 'R$ 8,4 mil', note: '4 oportunidades', icon: CircleDollarSign },
];

const activities: Array<{ name: string; text: string; time: string; icon: LucideIcon }> = [
  { name: 'Ana', text: 'Qualificou um novo interessado e criou uma oportunidade', time: 'há 3 min', icon: UserRoundCheck },
  { name: 'Clara', text: 'Concluiu um atendimento sem pendências', time: 'há 8 min', icon: MessageSquareText },
  { name: 'Ana', text: 'Agendou uma reunião comercial para amanhã às 10h', time: 'há 17 min', icon: CalendarCheck2 },
];

const employees = [
  {
    name: 'Ana',
    role: 'Assistente Comercial',
    initials: 'AN',
    status: 'Trabalhando agora',
    task: 'Respondendo um novo contato do WhatsApp',
    tone: 'bg-indigo-50 text-indigo-700',
  },
  {
    name: 'Clara',
    role: 'Atendimento ao Cliente',
    initials: 'CL',
    status: 'Disponível',
    task: 'Nenhuma pendência no momento',
    tone: 'bg-emerald-50 text-emerald-700',
  },
];

function MetricCard({ label, value, note, icon: Icon }: (typeof metrics)[number]) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-medium text-slate-500">{label}</p>
          <p className="m-0 mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-600">
          <Icon className="size-[18px]" strokeWidth={1.8} />
        </span>
      </div>
      <p className="m-0 mt-3 text-xs text-slate-400">{note}</p>
    </article>
  );
}

function EmployeeCard({ employee }: { employee: (typeof employees)[number] }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start gap-4">
        <div className={`grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-semibold ${employee.tone}`}>
          {employee.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="m-0 font-semibold text-slate-900">{employee.name}</h3>
              <p className="m-0 mt-0.5 text-sm text-slate-500">{employee.role}</p>
            </div>
            <span className="mt-1 size-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-50" />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{employee.status}</p>
            <p className="m-0 mt-1.5 text-sm leading-5 text-slate-600">{employee.task}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function DashboardPage() {
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            <Sparkles className="size-3.5" /> Sua empresa hoje
          </div>
          <h2 className="m-0 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[38px]">
            Bom dia. Sua equipe já está trabalhando.
          </h2>
          <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">
            Acompanhe o que está acontecendo, aprove o que precisa de você e veja os resultados sem entrar na operação.
          </p>
        </div>
        <button className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 xl:self-auto">
          Ver atividade da empresa <ArrowRight className="size-4" />
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="grid gap-5 2xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-semibold tracking-tight text-slate-900">Sua equipe</h2>
              <p className="m-0 mt-1 text-sm text-slate-400">Quem está disponível e no que está trabalhando.</p>
            </div>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Ver equipe</button>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {employees.map((employee) => <EmployeeCard key={employee.name} employee={employee} />)}
          </div>
        </div>

        <div className="rounded-3xl bg-[#111827] p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Precisa de você</p>
              <h2 className="m-0 mt-2 text-xl font-semibold tracking-tight">2 aprovações pendentes</h2>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-white/10 text-amber-300">
              <Clock3 className="size-5" />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <button className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-left transition hover:bg-white/[0.09]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-sm font-semibold text-white">Desconto de 12% para Mariana</p>
                  <p className="m-0 mt-1.5 text-xs leading-5 text-slate-400">Ana pede sua aprovação antes de enviar a proposta.</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-slate-500" />
              </div>
            </button>
            <button className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-left transition hover:bg-white/[0.09]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-sm font-semibold text-white">Exceção de prazo para João</p>
                  <p className="m-0 mt-1.5 text-xs leading-5 text-slate-400">Clara encontrou uma situação fora da política padrão.</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-slate-500" />
              </div>
            </button>
          </div>
          <button className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
            Revisar aprovações <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="m-0 text-lg font-semibold tracking-tight text-slate-900">Acontecendo agora</h2>
            <p className="m-0 mt-1 text-sm text-slate-400">Uma leitura simples do trabalho da empresa.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-400" /> Ao vivo
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {activities.map(({ name, text, time, icon: Icon }) => (
            <div key={`${name}-${time}`} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm leading-6 text-slate-600"><strong className="font-semibold text-slate-900">{name}</strong> {text}</p>
                <p className="m-0 mt-0.5 text-xs text-slate-400">{time}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
