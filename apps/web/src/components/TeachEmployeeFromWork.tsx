import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, GraduationCap, LoaderCircle, X } from 'lucide-react';
import { useAuth } from '../AuthProvider';

type LearningKind = 'responsibility' | 'behavior' | 'practice';

type LearningDraft = {
  kind: LearningKind;
  content: string;
  idempotencyKey: string;
};

function createDraft(): LearningDraft {
  return {
    kind: 'practice',
    content: '',
    idempotencyKey: `work-learning-${globalThis.crypto.randomUUID()}`,
  };
}

export function TeachEmployeeFromWork({
  organizationId,
  employeeId,
  employeeName,
  workId,
  workTitle,
  canManage,
}: {
  organizationId: string;
  employeeId: string;
  employeeName: string;
  workId: string;
  workTitle: string;
  canManage: boolean;
}) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<LearningDraft | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async (input: LearningDraft) => {
      const response = await authFetch(
        `/api/v1/organizations/${organizationId}/digital-employees/${employeeId}/development`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': input.idempotencyKey,
          },
          body: JSON.stringify({
            kind: input.kind,
            content: input.content.trim(),
            provenanceType: 'approved_learning',
            sourceRef: `work:${workId}`,
            sourceLabel: `Trabalho “${workTitle}”`,
          }),
        },
      );

      const payload = await response.json().catch(() => null) as { error?: string; entry?: { id: string } } | null;
      if (response.status === 400) throw new Error('Revise o aprendizado antes de salvar.');
      if (response.status === 403) throw new Error('Somente owner ou admin pode aprovar um aprendizado.');
      if (response.status === 404) throw new Error('A funcionária ou este contrato de desenvolvimento não está disponível.');
      if (response.status === 409) throw new Error('Esta aprovação precisa ser reconciliada antes de uma nova tentativa.');
      if (!response.ok || !payload?.entry?.id) throw new Error('Não foi possível guardar este aprendizado agora.');
      return payload.entry;
    },
    onSuccess: async () => {
      setDraft(null);
      setSaved(true);
      await queryClient.invalidateQueries({
        queryKey: ['digital-employee-development', organizationId, employeeId],
      });
    },
  });

  if (!canManage) return null;

  return (
    <section className="rounded-2xl border-[2.5px] border-[#09090b] bg-[#d2e823] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-[#09090b] bg-white">
          <GraduationCap className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black">Isso deve orientar {employeeName} nos próximos trabalhos?</div>
          <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/60">
            Você decide o que vale guardar. O resultado deste trabalho não vira aprendizado automaticamente.
          </p>

          {saved ? (
            <div role="status" className="mt-3 flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-white px-3 py-2 text-xs font-black">
              <Check className="size-4" /> Aprendizado aprovado e guardado para {employeeName}.
            </div>
          ) : draft ? (
            <div className="mt-4 rounded-xl border-2 border-[#09090b] bg-[#f8f4e8] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black">Escreva exatamente o que deve ser aprendido.</div>
                  <p className="m-0 mt-1 text-[11px] leading-5 text-[#09090b]/50">
                    A origem ficará ligada a “{workTitle}”, mas somente o texto abaixo vira orientação oficial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    mutation.reset();
                    setDraft(null);
                  }}
                  aria-label="Cancelar aprendizado"
                  className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-[#09090b] bg-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ['practice', 'Prática'],
                  ['behavior', 'Comportamento'],
                  ['responsibility', 'Responsabilidade'],
                ] as const).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setDraft((current) => current ? { ...current, kind } : current)}
                    className={`rounded-full border-2 border-[#09090b] px-3 py-1.5 text-[10px] font-black uppercase ${draft.kind === kind ? 'bg-[#09090b] text-white' : 'bg-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <textarea
                value={draft.content}
                onChange={(event) => setDraft((current) => current ? { ...current, content: event.target.value } : current)}
                rows={4}
                maxLength={4000}
                placeholder="Ex.: Ao listar produtos, apresentar nome, código, preço e estoque nessa ordem."
                className="mt-3 w-full resize-y rounded-xl border-2 border-[#09090b]/20 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#09090b]"
              />

              {mutation.isError ? (
                <div className="mt-3 rounded-xl border-2 border-[#09090b] bg-[#fdd030] p-3 text-xs leading-5">
                  {mutation.error instanceof Error ? mutation.error.message : 'Não foi possível salvar.'}
                </div>
              ) : null}

              <button
                type="button"
                disabled={mutation.isPending || !draft.content.trim()}
                onClick={() => mutation.mutate(draft)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#09090b] px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                {mutation.isPending ? 'Guardando…' : 'Ensinar à Ana'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                mutation.reset();
                setDraft(createDraft());
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-black"
            >
              <GraduationCap className="size-4" />
              Ensinar à Ana
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
