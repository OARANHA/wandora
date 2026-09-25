import { Link } from '@tanstack/react-router';
import { BriefcaseBusiness, CheckCircle2, ShieldCheck } from 'lucide-react';

export function ApprovalsPage() {
  return (
    <div className="space-y-7">
      <section>
        <div className="inline-flex rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1.5 wandora-pop-sm">
          <span className="wandora-mono text-[9px] font-black">aprovações · estado real</span>
        </div>
        <h1 className="wandora-display m-0 mt-4 max-w-4xl text-[clamp(2.35rem,4.2vw,4rem)] leading-[0.96] text-[#09090b]">
          SEM APROVAÇÃO <span className="inline-block rounded-xl bg-[#fdd030] px-2">INVENTADA.</span>
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-7 text-[#09090b]/60">
          A Wandora só mostrará uma aprovação aqui quando existir um contrato canônico real para essa decisão.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-7 text-center wandora-pop">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border-2 border-[#09090b] bg-[#d2e823]">
            <CheckCircle2 className="size-6" />
          </span>
          <h2 className="wandora-display m-0 mt-5 text-3xl">NENHUMA APROVAÇÃO CANÔNICA PENDENTE.</h2>
          <p className="m-0 mx-auto mt-3 max-w-xl text-sm leading-6 text-[#09090b]/55">
            Trabalhos supervisionados, resultados internos e casos que pedem atenção humana continuam em Trabalho.
            Esta página não usa exemplos fictícios para parecer ocupada.
          </p>
          <Link
            to="/work"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press"
          >
            <BriefcaseBusiness className="size-4" />
            Abrir Trabalho
          </Link>
        </div>

        <aside className="h-fit rounded-3xl border-[2.5px] border-[#09090b] bg-[#09090b] p-6 text-white wandora-pop">
          <div className="flex items-center gap-2 text-[#d2e823]">
            <ShieldCheck className="size-5" />
            <span className="font-black">Controle humano continua separado</span>
          </div>
          <p className="m-0 mt-3 text-sm leading-6 text-white/60">
            Uma futura aprovação poderá representar desconto excepcional, compromisso operacional ou outro efeito
            autorizado. Até esse contrato existir, a Wandora não simula decisões nem cria estado paralelo.
          </p>
        </aside>
      </section>
    </div>
  );
}
