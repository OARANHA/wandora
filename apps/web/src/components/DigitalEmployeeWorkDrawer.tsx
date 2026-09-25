import { Bot, X } from 'lucide-react';
import { DigitalEmployeeWorkPanel } from './DigitalEmployeeWorkPanel';

export function DigitalEmployeeWorkDrawer({
  open,
  employeeId,
  employeeName,
  onClose,
}: {
  open: boolean;
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Fechar painel de trabalho"
        onClick={onClose}
        className="absolute inset-0 bg-[#09090b]/55"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Trabalho com ${employeeName}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[36rem] flex-col border-l-[3px] border-[#09090b] bg-[#f8f4e8] shadow-[-14px_0_40px_rgba(0,0,0,0.18)]"
      >
        <header className="flex items-start justify-between gap-4 border-b-[2.5px] border-[#09090b] bg-white p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-[#09090b] bg-[#ff7a1a] text-white">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="wandora-mono text-[8px] font-black uppercase tracking-[0.09em] text-[#09090b]/40">
                trabalho supervisionado
              </div>
              <h2 className="wandora-display m-0 mt-1 truncate text-2xl uppercase">
                TRABALHAR COM {employeeName.toUpperCase()}
              </h2>
              <p className="m-0 mt-1 text-xs font-bold text-[#09090b]/45">
                Ativa · com supervisão
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-[#09090b] bg-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:p-6">
          <DigitalEmployeeWorkPanel
            employeeId={employeeId}
            employeeName={employeeName}
          />
        </div>
      </aside>
    </div>
  );
}
