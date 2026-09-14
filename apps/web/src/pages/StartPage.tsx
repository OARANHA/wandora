import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

const outcomes = [
  {
    id: 'new-contacts',
    title: 'Atender novos contatos',
    description: 'Responder rápido, entender a necessidade e organizar as oportunidades.',
    employee: 'Ana',
    role: 'Assistente Comercial Digital',
  },
  {
    id: 'customer-care',
    title: 'Cuidar do atendimento',
    description: 'Responder dúvidas, acompanhar solicitações e encaminhar exceções.',
    employee: 'Clara',
    role: 'Atendimento ao Cliente Digital',
  },
  {
    id: 'follow-up',
    title: 'Fazer acompanhamentos',
    description: 'Retomar conversas no momento certo e evitar contatos esquecidos.',
    employee: 'Ana',
    role: 'Assistente Comercial Digital',
  },
] as const;

type OutcomeId = (typeof outcomes)[number]['id'];

const steps = [
  'Sua empresa',
  'Primeiro objetivo',
  'Seu funcionário',
  'Ferramenta de trabalho',
  'Ensine o essencial',
  'Começar',
] as const;

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Etapa ${step + 1} de ${steps.length}`}>
      {steps.map((label, index) => (
        <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={`h-1.5 flex-1 rounded-full transition ${index <= step ? 'bg-indigo-500' : 'bg-slate-200'}`}
          />
        </div>
      ))}
    </div>
  );
}

function StepHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="m-0 text-sm font-semibold text-indigo-600">{eyebrow}</p>
      <h1 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">{title}</h1>
      <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function StartPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [companySite, setCompanySite] = useState('');
  const [outcomeId, setOutcomeId] = useState<OutcomeId>('new-contacts');
  const [connected, setConnected] = useState(false);
  const [businessSummary, setBusinessSummary] = useState('');
  const [businessHours, setBusinessHours] = useState('Segunda a sexta, 9h às 18h');
  const [importantRule, setImportantRule] = useState('');

  const outcome = useMemo(
    () => outcomes.find((item) => item.id === outcomeId) ?? outcomes[0],
    [outcomeId],
  );

  const canContinue =
    step === 0 ? companyName.trim().length >= 2 :
    step === 3 ? connected :
    step === 4 ? businessSummary.trim().length >= 8 : true;

  const next = () => setStep((current) => Math.min(current + 1, steps.length - 1));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">W</span>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-slate-950">Wandora</div>
              <div className="text-xs text-slate-400">Primeiro dia</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex">
            <Clock3 className="size-4" /> cerca de 5 minutos para começar
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Progress step={step} />
          <span className="text-xs font-semibold text-slate-400">{step + 1} de {steps.length}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-9">
            {step === 0 && (
              <div className="space-y-8">
                <StepHeader
                  eyebrow="Vamos começar pela sua empresa"
                  title="Como sua empresa se chama?"
                  description="Só precisamos do essencial agora. Você poderá completar e corrigir tudo depois, sem depender da nossa equipe."
                />
                <div className="grid gap-5">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Nome da empresa
                    <input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="Ex.: Acme Comércio"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 font-normal text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Site ou página da empresa <span className="font-normal text-slate-400">(opcional)</span>
                    <input
                      value={companySite}
                      onChange={(event) => setCompanySite(event.target.value)}
                      placeholder="www.suaempresa.com.br"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 font-normal text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8">
                <StepHeader
                  eyebrow="Escolha um resultado"
                  title="O que você quer tirar da sua mesa primeiro?"
                  description="Escolha a necessidade mais importante agora. A Wandora recomenda um funcionário para assumir essa responsabilidade."
                />
                <div className="grid gap-3">
                  {outcomes.map((item) => {
                    const selected = item.id === outcomeId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setOutcomeId(item.id)}
                        className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition sm:p-5 ${selected ? 'border-indigo-300 bg-indigo-50/60 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                          {selected ? <Check className="size-4" /> : <Sparkles className="size-4" />}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                          <span className="mt-1 block text-sm leading-6 text-slate-500">{item.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <StepHeader
                  eyebrow="Seu primeiro funcionário"
                  title={`${outcome.employee} é uma boa escolha para começar.`}
                  description={`Para “${outcome.title.toLowerCase()}”, você começa com uma responsabilidade clara e autonomia supervisionada.`}
                />
                <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-sm font-bold text-white">
                      {outcome.employee.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h2 className="m-0 text-xl font-semibold text-slate-950">{outcome.employee}</h2>
                      <p className="m-0 mt-1 text-sm text-slate-500">{outcome.role}</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                        <CheckCircle2 className="size-4" /> Começa fazendo
                      </div>
                      <p className="m-0 mt-2 text-sm leading-6 text-slate-600">Rotina segura baseada nas informações confirmadas da empresa.</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-600">
                        <ShieldCheck className="size-4" /> Chama você quando
                      </div>
                      <p className="m-0 mt-2 text-sm leading-6 text-slate-600">Uma decisão sai das regras ou cria um compromisso importante.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <StepHeader
                  eyebrow="Dê uma ferramenta de trabalho"
                  title="Conecte o WhatsApp da empresa."
                  description="Para esta primeira responsabilidade, basta conectar o canal onde o trabalho acontece. Outras ferramentas podem vir depois."
                />
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span className="grid size-12 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/70">
                        <MessageCircleMore className="size-5" />
                      </span>
                      <div>
                        <h2 className="m-0 text-base font-semibold text-slate-900">WhatsApp da empresa</h2>
                        <p className="m-0 mt-1 text-sm text-slate-500">Canal usado pelo seu novo funcionário.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConnected((value) => !value)}
                      className={`h-11 rounded-xl px-4 text-sm font-semibold transition ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-950 text-white hover:bg-slate-800'}`}
                    >
                      {connected ? 'Conectado' : 'Conectar WhatsApp'}
                    </button>
                  </div>
                </div>
                <p className="m-0 text-xs leading-5 text-slate-400">Nesta prova de experiência o botão apenas representa a conexão. A integração real será ligada ao fluxo de produção depois.</p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <StepHeader
                  eyebrow="Ensine só o essencial"
                  title={`O que ${outcome.employee} precisa saber para começar com segurança?`}
                  description="Não queremos um questionário de implantação. Informe o mínimo para o primeiro dia; o restante pode ser ensinado durante o trabalho."
                />
                <div className="grid gap-5">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    O que sua empresa vende ou resolve?
                    <textarea
                      value={businessSummary}
                      onChange={(event) => setBusinessSummary(event.target.value)}
                      rows={3}
                      placeholder="Ex.: Vendemos móveis planejados e fazemos projetos sob medida."
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal leading-6 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Horário normal de atendimento
                    <input
                      value={businessHours}
                      onChange={(event) => setBusinessHours(event.target.value)}
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 font-normal text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Existe alguma regra que não pode ser ignorada? <span className="font-normal text-slate-400">(opcional)</span>
                    <textarea
                      value={importantRule}
                      onChange={(event) => setImportantRule(event.target.value)}
                      rows={2}
                      placeholder="Ex.: Não prometer prazo de entrega sem confirmação."
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal leading-6 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>
                </div>
                {companySite && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm leading-6 text-indigo-700">
                    Depois, a Wandora poderá usar <strong>{companySite}</strong> como uma das fontes para preparar conhecimento e pedir sua confirmação antes de torná-lo orientação da empresa.
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <StepHeader
                  eyebrow="Pronto para o primeiro dia"
                  title={`${outcome.employee} pode começar supervisionada.`}
                  description="Você verá o trabalho acontecer e continuará no controle das decisões que ultrapassarem as regras da empresa."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Empresa</p>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">{companyName || 'Sua empresa'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Responsabilidade inicial</p>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">{outcome.title}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Ferramenta</p>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">WhatsApp conectado</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Autonomia inicial</p>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">Supervisionada</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  <strong>O primeiro dia não precisa ser perfeito.</strong> A Wandora preserva o histórico, permite correções e transforma orientações aprovadas em aprendizado da empresa ao longo do trabalho.
                </div>
              </div>
            )}

            <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <button
                onClick={back}
                disabled={step === 0}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-0"
              >
                <ArrowLeft className="size-4" /> Voltar
              </button>
              {step < steps.length - 1 ? (
                <button
                  onClick={next}
                  disabled={!canContinue}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Continuar <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate({ to: '/' })}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  Começar trabalho supervisionado <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </section>
          <aside className="h-fit rounded-[28px] bg-[#111827] p-6 text-white lg:sticky lg:top-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-white/10 text-indigo-300">
                <UserRound className="size-5" />
              </span>
              <div>
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Seu primeiro dia</p>
                <p className="m-0 mt-1 text-sm font-semibold text-white">Valor antes de configuração</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                ['Empresa', companyName || 'Ainda não informada'],
                ['Objetivo', outcome.title],
                ['Funcionário', `${outcome.employee} · ${outcome.role}`],
                ['Ferramenta', connected ? 'WhatsApp conectado' : 'WhatsApp a conectar'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                  <p className="m-0 mt-1.5 text-sm leading-5 text-slate-300">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Como o primeiro dia funciona</p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-400">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-400" />
                  <span>O funcionário começa com uma responsabilidade pequena e clara.</span>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="mt-1 size-4 shrink-0 text-amber-300" />
                  <span>Decisões fora das regras param e chegam até você.</span>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="mt-1 size-4 shrink-0 text-indigo-300" />
                  <span>Correções aprovadas podem virar orientação durável da empresa.</span>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="m-0 text-xs leading-5 text-slate-400">
                Você não precisa configurar tudo hoje. O objetivo é chegar ao primeiro trabalho útil e melhorar com uso real.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
