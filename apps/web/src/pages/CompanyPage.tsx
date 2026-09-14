import { BookOpenText, Building2, Cable, CreditCard, UsersRound } from 'lucide-react';

const sections = [
  { title: 'Dados da empresa', description: 'Nome, segmento, horários, unidades e informações usadas pela equipe.', icon: Building2 },
  { title: 'Pessoas', description: 'Quem faz parte da empresa e quais responsabilidades possui.', icon: UsersRound },
  { title: 'Conhecimento', description: 'Políticas, produtos, documentos e orientações que os funcionários devem conhecer.', icon: BookOpenText },
  { title: 'Ferramentas e conexões', description: 'WhatsApp, agenda, e-mail e outras ferramentas da empresa.', icon: Cable },
  { title: 'Plano e cobrança', description: 'Funcionários contratados, uso e informações do plano Wandora.', icon: CreditCard },
];

export function CompanyPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="m-0 text-sm font-semibold text-indigo-600">Sua empresa</p>
        <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Empresa</h2>
        <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">O lugar para ensinar à Wandora como sua empresa funciona, usando a mesma linguagem do seu negócio.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ title, description, icon: Icon }) => (
          <button key={title} className="group min-h-44 rounded-3xl border border-slate-200/80 bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-50 text-slate-600 transition group-hover:bg-indigo-50 group-hover:text-indigo-600"><Icon className="size-5" /></span>
            <h3 className="m-0 mt-5 text-base font-semibold text-slate-900">{title}</h3>
            <p className="m-0 mt-2 text-sm leading-6 text-slate-500">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
