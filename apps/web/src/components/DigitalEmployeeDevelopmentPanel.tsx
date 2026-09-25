import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  LoaderCircle,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';

type DevelopmentEntryKind = 'responsibility' | 'behavior' | 'practice';
type DevelopmentProvenance = 'owner_statement' | 'approved_learning' | 'approved_correction';

type DevelopmentEntry = {
  id: string;
  employeeId: string;
  kind: DevelopmentEntryKind;
  content: string;
  provenance: {
    type: DevelopmentProvenance;
    sourceRef: string | null;
    sourceLabel: string | null;
  };
  supersedesEntryId: string | null;
  status: 'active' | 'retired';
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type DevelopmentResponse = { items: DevelopmentEntry[] };

type DevelopmentTab = 'responsibilities' | 'learning' | 'autonomy';

type Draft = {
  kind: DevelopmentEntryKind;
  content: string;
  idempotencyKey: string;
};

const provenanceLabel: Record<DevelopmentProvenance, string> = {
  owner_statement: 'Orientação direta',
  approved_learning: 'Aprendizado aprovado',
  approved_correction: 'Correção aprovada',
};

const kindLabel: Record<DevelopmentEntryKind, string> = {
  responsibility: 'Responsabilidade',
  behavior: 'Comportamento',
  practice: 'Prática de trabalho',
};

function newDraft(kind: DevelopmentEntryKind): Draft {
  return {
    kind,
    content: '',
    idempotencyKey: `employee-development-${globalThis.crypto.randomUUID()}`,
  };
}

export function DigitalEmployeeDevelopmentPanel({
  employeeId,
  employeeName,
  autonomy,
  canManage,
}: {
  employeeId: string;
  employeeName: string;
  autonomy: 'supervised';
  canManage: boolean;
}) {
  const { activeOrganization, authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<DevelopmentTab>('responsibilities');
  const [draft, setDraft] = useState<Draft | null>(null);

  const path = activeOrganization
    ? `/api/v1/organizations/${activeOrganization.id}/digital-employees/${employeeId}/development`
    : '';

  const query = useQuery({
    queryKey: ['digital-employee-development', activeOrganization?.id, employeeId],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(path);
      if (response.status === 403) throw new Error('Seu acesso não permite consultar o desenvolvimento desta funcionária.');
      if (response.status === 404) throw new Error('Esta funcionária não está disponível nesta empresa.');
      if (!response.ok) throw new Error('Não foi possível carregar o desenvolvimento desta funcionária.');
      return await response.json() as DevelopmentResponse;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Draft) => {
      const response = await authFetch(path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': input.idempotencyKey,
        },
        body: JSON.stringify({
          kind: input.kind,
          content: input.content.trim(),
          provenanceType: 'owner_statement',
          sourceRef: null,
          sourceLabel: null,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; entry?: DevelopmentEntry } | null;
      if (response.status === 400) throw new Error('Revise o texto antes de salvar esta orientação.');
      if (response.status === 403) throw new Error('Somente owner ou admin pode desenvolver esta funcionária.');
      if (response.status === 404) throw new Error('Esta funcionária não foi encontrada.');
      if (response.status === 409) throw new Error('Esta alteração precisa ser reconciliada antes de uma nova tentativa.');
      if (!response.ok || !payload?.entry) throw new Error('Não foi possível salvar esta orientação agora.');
      return payload.entry;
    },
    onSuccess: async () => {
      setDraft(null);
      await queryClient.invalidateQueries({
        queryKey: ['digital-employee-development', activeOrganization?.id, employeeId],
      });
    },
  });

  const activeEntries = useMemo(
    () => (query.data?.items ?? []).filter((entry) => entry.status === 'active'),
    [query.data?.items],
  );
  const responsibilities = activeEntries.filter((entry) => entry.kind === 'responsibility');
  const learnedWays = activeEntries.filter((entry) => entry.kind === 'behavior' || entry.kind === 'practice');

  const openDraft = (kind: DevelopmentEntryKind) => {
    createMutation.reset();
    setDraft(newDraft(kind));
  };

  const submitDraft = () => {
    if (!draft?.content.trim()) return;
    createMutation.mutate(draft);
  };

  return (
    <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">desenvolvimento · estado real</div>
          <h3 className="wandora-display m-0 mt-2 text-3xl">COMO {employeeName.toUpperCase()} CRESCE AQUI.</h3>
          <p className="m-0 mt-3 max-w-2xl text-sm leading-6 text-[#09090b]/55">
            Responsabilidades e jeitos de trabalhar aprovados pertencem a esta funcionária nesta empresa.
            Regras da Casa continuam separadas e valem para toda a equipe.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CountPill label="responsabilidades" value={responsibilities.length} />
          <CountPill label="aprendizados" value={learnedWays.length} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Desenvolvimento da funcionária">
        <TabButton active={tab === 'responsibilities'} onClick={() => setTab('responsibilities')}>
          Responsabilidades
        </TabButton>
        <TabButton active={tab === 'learning'} onClick={() => setTab('learning')}>
          Aprendizados
        </TabButton>
        <TabButton active={tab === 'autonomy'} onClick={() => setTab('autonomy')}>
          Autonomia
        </TabButton>
      </div>

      {query.isLoading ? (
        <div className="mt-5 flex min-h-32 items-center justify-center rounded-2xl border-2 border-dashed border-[#09090b]/15 text-sm font-bold text-[#09090b]/45">
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Carregando desenvolvimento…
        </div>
      ) : query.isError ? (
        <div className="mt-5 rounded-2xl border-2 border-[#09090b] bg-[#fdd030] p-4">
          <p className="m-0 text-sm font-black">
            {query.error instanceof Error ? query.error.message : 'Não foi possível carregar esta área.'}
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-3 rounded-xl border-2 border-[#09090b] bg-white px-3 py-2 text-xs font-black"
          >
            Tentar novamente
          </button>
        </div>
      ) : tab === 'autonomy' ? (
        <div className="mt-5 rounded-2xl border-2 border-[#09090b] bg-[#09090b] p-5 text-white">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d2e823] text-[#09090b]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <div className="text-sm font-black">Autonomia atual: {autonomy === 'supervised' ? 'com supervisão' : autonomy}</div>
              <p className="m-0 mt-2 text-sm leading-6 text-white/60">
                Aprendizado acumulado não altera a autonomia automaticamente. Níveis futuros continuam não clicáveis até existir contrato real para eles.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="m-0 text-sm font-black">
                {tab === 'responsibilities' ? 'O que ela é responsável por fazer' : 'Como ela aprendeu a trabalhar aqui'}
              </h4>
              <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/45">
                {tab === 'responsibilities'
                  ? 'Responsabilidades específicas desta funcionária, sem transformar isso em regra da empresa inteira.'
                  : 'Comportamentos e práticas aprovados para orientar trabalhos futuros.'}
              </p>
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={() => openDraft(tab === 'responsibilities' ? 'responsibility' : 'practice')}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-3 py-2 text-xs font-black"
              >
                <Plus className="size-4" />
                {tab === 'responsibilities' ? 'Adicionar responsabilidade' : 'Ensinar diretamente'}
              </button>
            ) : null}
          </div>

          <DevelopmentList entries={tab === 'responsibilities' ? responsibilities : learnedWays} />
        </div>
      )}

      {draft ? (
        <div className="mt-5 rounded-2xl border-[2.5px] border-[#09090b] bg-[#f8f4e8] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-black">
                {draft.kind === 'responsibility'
                  ? <BriefcaseBusiness className="size-4" />
                  : <GraduationCap className="size-4" />}
                {draft.kind === 'responsibility' ? 'Nova responsabilidade' : 'Ensinar uma forma de trabalhar'}
              </div>
              <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/50">
                Esta orientação será oficial para {employeeName}, mas não vira Regra da Casa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDraft(null)}
              aria-label="Cancelar orientação"
              className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-[#09090b] bg-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {draft.kind !== 'responsibility' ? (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDraft((current) => current ? { ...current, kind: 'practice' } : current)}
                className={`rounded-full border-2 border-[#09090b] px-3 py-1.5 text-[10px] font-black uppercase ${draft.kind === 'practice' ? 'bg-[#09090b] text-white' : 'bg-white'}`}
              >
                Prática
              </button>
              <button
                type="button"
                onClick={() => setDraft((current) => current ? { ...current, kind: 'behavior' } : current)}
                className={`rounded-full border-2 border-[#09090b] px-3 py-1.5 text-[10px] font-black uppercase ${draft.kind === 'behavior' ? 'bg-[#09090b] text-white' : 'bg-white'}`}
              >
                Comportamento
              </button>
            </div>
          ) : null}

          <textarea
            value={draft.content}
            onChange={(event) => setDraft((current) => current ? { ...current, content: event.target.value } : current)}
            maxLength={4000}
            rows={4}
            placeholder={draft.kind === 'responsibility'
              ? 'Ex.: Qualificar oportunidades antes de encaminhá-las para o vendedor.'
              : 'Ex.: Ao listar produtos, apresentar nome, código, preço e estoque nessa ordem.'}
            className="mt-4 w-full resize-y rounded-xl border-2 border-[#09090b]/20 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#09090b]"
          />

          {createMutation.isError ? (
            <div className="mt-3 rounded-xl border-2 border-[#09090b] bg-[#fdd030] p-3 text-xs leading-5">
              {createMutation.error instanceof Error ? createMutation.error.message : 'Não foi possível salvar.'}
            </div>
          ) : null}

          <button
            type="button"
            onClick={submitDraft}
            disabled={createMutation.isPending || !draft.content.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#09090b] px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            {createMutation.isPending ? 'Salvando…' : 'Salvar para trabalhos futuros'}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border-2 border-[#09090b] bg-[#f8f4e8] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.06em]">
      {label} · {value}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full border-2 border-[#09090b] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.06em] ${active ? 'bg-[#09090b] text-white' : 'bg-white'}`}
    >
      {children}
    </button>
  );
}

function DevelopmentList({ entries }: { entries: DevelopmentEntry[] }) {
  if (!entries.length) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-dashed border-[#09090b]/15 p-5 text-center">
        <BookOpenCheck className="mx-auto size-5 text-[#09090b]/30" />
        <p className="m-0 mt-2 text-sm font-black">Nada registrado aqui ainda.</p>
        <p className="m-0 mt-1 text-xs leading-5 text-[#09090b]/45">
          Esta área só mostra orientações reais já aprovadas para a funcionária.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 divide-y-2 divide-[#09090b]/10 rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8]">
      {entries.map((entry) => (
        <article key={entry.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="m-0 max-w-3xl text-sm font-bold leading-6 text-[#09090b]/80">{entry.content}</p>
            <span className="rounded-full border-2 border-[#09090b] bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.05em]">
              {kindLabel[entry.kind]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-[#09090b]/40">
            <span>{provenanceLabel[entry.provenance.type]}</span>
            {entry.provenance.sourceLabel ? <span>· {entry.provenance.sourceLabel}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
