import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArchiveX, BookOpenCheck, Check, FileCheck2, History, LoaderCircle, PencilLine, Plus, ShieldCheck } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../AuthProvider';
import {
  GroundingCreateOperationError,
  clearGroundingCreateOperation,
  resolveGroundingCreateOperation,
} from '../customerGroundingOperation';

type GroundingEntryType = 'fact' | 'rule';
type GroundingProvenanceType = 'owner_statement' | 'approved_source' | 'approved_correction';
type GroundingStatus = 'active' | 'retired';

type GroundingEntry = {
  id: string;
  type: GroundingEntryType;
  content: string;
  provenance: { type: GroundingProvenanceType; sourceRef: string | null; sourceLabel: string | null };
  supersedesEntryId: string | null;
  status: GroundingStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type GroundingResponse = { items: GroundingEntry[] };
type CreateDraft = { type: GroundingEntryType; content: string; approvedSource: boolean; sourceRef: string; sourceLabel: string };
type CorrectionDraft = { content: string; sourceRef: string; sourceLabel: string };

const emptyCreateDraft: CreateDraft = { type: 'fact', content: '', approvedSource: false, sourceRef: '', sourceLabel: '' };

function mutationKey(action: string): string {
  return 'company-grounding:' + action + ':' + crypto.randomUUID();
}

class GroundingCreateRequestError extends Error {
  constructor(message: string, readonly retrySameRequest = false) {
    super(message);
    this.name = 'GroundingCreateRequestError';
  }
}

async function groundingError(response: Response, fallback: string): Promise<Error> {
  let errorCode = '';
  try {
    const body = await response.json() as { error?: unknown };
    errorCode = typeof body.error === 'string' ? body.error : '';
  } catch {
    // Keep the customer-facing fallback when the response has no readable JSON body.
  }
  if (response.status === 400 && errorCode === 'invalid-grounding-request') {
    return new Error('Não conseguimos validar essa informação. Atualize a página e tente novamente.');
  }
  if (response.status === 403) return new Error('Seu acesso permite consultar, mas não alterar as informações da empresa.');
  if (response.status === 404) return new Error('Esta informação não existe mais ou não pertence a esta empresa.');
  if (response.status === 409) return new Error('Essa informação mudou enquanto você trabalhava. Atualize a página antes de tentar novamente.');
  if (response.status === 503) return new Error('As informações da empresa estão temporariamente indisponíveis.');
  return new Error(fallback);
}

export function CompanyPage() {
  const { activeOrganization, context, authFetch } = useAuth();
  const [draft, setDraft] = useState<CreateDraft>(emptyCreateDraft);
  const [editing, setEditing] = useState<GroundingEntry | null>(null);
  const [correction, setCorrection] = useState<CorrectionDraft>({ content: '', sourceRef: '', sourceLabel: '' });

  const query = useQuery({
    queryKey: ['organization-grounding', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch('/api/v1/organizations/' + activeOrganization!.id + '/grounding');
      if (response.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!response.ok) throw new Error('Não foi possível carregar os fatos e Regras da Casa.');
      return await response.json() as GroundingResponse;
    },
  });

  const canManage = activeOrganization?.role === 'owner' || activeOrganization?.role === 'admin';

  const createMutation = useMutation({
    mutationFn: async (input: CreateDraft) => {
      if (!activeOrganization) throw new GroundingCreateRequestError('Escolha uma empresa antes de registrar esta informação.');
      const payload = {
        entryType: input.type,
        content: input.content.trim(),
        provenanceType: input.approvedSource ? 'approved_source' as const : 'owner_statement' as const,
        sourceRef: input.sourceRef.trim() || null,
        sourceLabel: input.sourceLabel.trim() || null,
      };
      let operation;
      try {
        operation = resolveGroundingCreateOperation(activeOrganization.id, payload);
      } catch (error) {
        if (error instanceof GroundingCreateOperationError) {
          throw new GroundingCreateRequestError(error.message);
        }
        throw error;
      }

      let response: Response;
      try {
        response = await authFetch('/api/v1/organizations/' + activeOrganization.id + '/grounding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operation.idempotencyKey },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new GroundingCreateRequestError(
          'A Wandora não conseguiu confirmar a resposta. Repita exatamente o mesmo registro; a identidade original será reutilizada.',
          true,
        );
      }

      const body = await response.json().catch(() => null) as { entry?: GroundingEntry } | null;
      if (response.ok) {
        if (!body?.entry?.id || body.entry.type !== payload.entryType || body.entry.content !== payload.content) {
          throw new GroundingCreateRequestError(
            'A confirmação do registro ficou incompleta. Repita exatamente o mesmo registro para reconciliar com segurança.',
            true,
          );
        }
        clearGroundingCreateOperation(operation);
        return { entry: body.entry };
      }

      if (response.status === 400 || response.status === 403 || response.status === 404) {
        clearGroundingCreateOperation(operation);
        throw await groundingError(response, 'Não foi possível salvar esta informação.');
      }
      if (response.status === 409 || response.status === 503) {
        throw new GroundingCreateRequestError(
          'O registro ficou sem confirmação conclusiva. Repita exatamente o mesmo conteúdo e evidência; a identidade original será reutilizada.',
          true,
        );
      }
      throw new GroundingCreateRequestError(
        'A resposta ficou inconclusiva. Repita exatamente o mesmo registro; a Wandora reutilizará a identidade original.',
        true,
      );
    },
    onSuccess: async () => { setDraft(emptyCreateDraft); await query.refetch(); },
  });

  const retireMutation = useMutation({
    mutationFn: async (entry: GroundingEntry) => {
      if (!activeOrganization) throw new Error('Escolha uma empresa antes de alterar grounding.');
      const response = await authFetch('/api/v1/organizations/' + activeOrganization.id + '/grounding/' + entry.id + '/retire', {
        method: 'POST',
        headers: { 'Idempotency-Key': mutationKey('retire') },
      });
      if (!response.ok) throw await groundingError(response, 'Não foi possível retirar esta informação.');
      return await response.json() as { entry: GroundingEntry };
    },
    onSuccess: async () => { await query.refetch(); },
  });

  const correctionMutation = useMutation({
    mutationFn: async ({ entry, input }: { entry: GroundingEntry; input: CorrectionDraft }) => {
      if (!activeOrganization) throw new Error('Escolha uma empresa antes de corrigir grounding.');
      const response = await authFetch('/api/v1/organizations/' + activeOrganization.id + '/grounding/' + entry.id + '/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': mutationKey('correct') },
        body: JSON.stringify({ content: input.content.trim(), sourceRef: input.sourceRef.trim(), sourceLabel: input.sourceLabel.trim() || null }),
      });
      if (!response.ok) throw await groundingError(response, 'Não foi possível registrar esta correção.');
      return await response.json() as { entry: GroundingEntry };
    },
    onSuccess: async () => {
      setEditing(null);
      setCorrection({ content: '', sourceRef: '', sourceLabel: '' });
      await query.refetch();
    },
  });

  const entries = query.data?.items ?? [];
  const facts = useMemo(() => entries.filter((entry) => entry.status === 'active' && entry.type === 'fact'), [entries]);
  const rules = useMemo(() => entries.filter((entry) => entry.status === 'active' && entry.type === 'rule'), [entries]);
  const retired = useMemo(() => entries.filter((entry) => entry.status === 'retired'), [entries]);

  if (!activeOrganization) {
    return <div className="space-y-6"><PageHeader /><Notice title={(context?.organizations.length ?? 0) > 1 ? 'Escolha uma empresa para abrir' : 'Nenhuma empresa ativa'} /></div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader />
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Informações da empresa" value={facts.length} note="confirmadas e ativas" />
        <Metric label="Regras da Casa" value={rules.length} note="instruções oficiais ativas" />
        <Metric label="Histórico" value={retired.length} note="itens retirados preservados" />
      </section>

      {query.isLoading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border-[2.5px] border-[#09090b] bg-white text-sm font-black text-[#09090b]/55 wandora-pop">
          <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando a empresa…
        </div>
      ) : query.isError ? (
        <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-6 wandora-pop">
          <h2 className="wandora-display m-0 text-4xl">AS INFORMAÇÕES DA EMPRESA ESTÃO INDISPONÍVEIS.</h2>
          <p className="m-0 mt-3 text-sm leading-6 text-[#09090b]/65">{query.error instanceof Error ? query.error.message : 'Tente novamente.'}</p>
          <button type="button" onClick={() => void query.refetch()} className="mt-4 rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press">Tentar novamente</button>
        </section>
      ) : (
        <>
          {canManage ? (
            <CreatePanel draft={draft} setDraft={setDraft} pending={createMutation.isPending} error={createMutation.error}
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.content.trim() || (draft.approvedSource && !draft.sourceRef.trim())) return;
                createMutation.mutate(draft);
              }}
            />
          ) : (
            <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><div>
                <div className="font-black">Acesso somente leitura</div>
                <p className="m-0 mt-1 text-sm leading-6 text-[#09090b]/55">Você pode consultar o grounding oficial. Alterações ficam restritas a owner/admin ativos.</p>
              </div></div>
            </section>
          )}
          <GroundingSection title="Informações da empresa da empresa" eyebrow="verdade confirmada"
            description="Informações confirmadas que sua equipe digital pode usar como verdade sobre a empresa."
            empty="Nenhuma informação da empresa foi registrada ainda." entries={facts} canManage={canManage}
            retiringId={retireMutation.isPending ? retireMutation.variables?.id : undefined}
            onRetire={(entry) => retireMutation.mutate(entry)}
            onCorrect={(entry) => { setEditing(entry); setCorrection({ content: entry.content, sourceRef: '', sourceLabel: entry.provenance.sourceLabel ?? '' }); }}
          />
          <GroundingSection title="Regras da Casa" eyebrow="como trabalhamos aqui"
            description="Instruções oficiais da empresa. Elas orientam a equipe sem virar memória, inferência ou regra criada pelo modelo."
            empty="Nenhuma Regra da Casa foi registrada ainda." entries={rules} canManage={canManage}
            retiringId={retireMutation.isPending ? retireMutation.variables?.id : undefined}
            onRetire={(entry) => retireMutation.mutate(entry)}
            onCorrect={(entry) => { setEditing(entry); setCorrection({ content: entry.content, sourceRef: '', sourceLabel: entry.provenance.sourceLabel ?? '' }); }}
          />
          {retired.length ? <HistorySection entries={retired} /> : null}
          {retireMutation.isError ? <InlineError error={retireMutation.error} /> : null}
        </>
      )}

      {editing ? (
        <CorrectionPanel entry={editing} draft={correction} setDraft={setCorrection} pending={correctionMutation.isPending}
          error={correctionMutation.error}
          onCancel={() => { setEditing(null); setCorrection({ content: '', sourceRef: '', sourceLabel: '' }); }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!correction.content.trim() || !correction.sourceRef.trim()) return;
            correctionMutation.mutate({ entry: editing, input: correction });
          }}
        />
      ) : null}
    </div>
  );
}

function PageHeader() {
  return (
    <section>
      <div className="inline-flex rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1.5 wandora-pop-sm"><span className="wandora-mono text-[9px] font-black">empresa · informações e regras</span></div>
      <h1 className="wandora-display m-0 mt-5 max-w-5xl text-[clamp(3rem,6vw,6rem)] leading-[0.86] text-[#09090b]">ENSINE SUA EMPRESA À <span className="inline-block rounded-xl bg-[#fdd030] px-2">EQUIPE DIGITAL.</span></h1>
      <p className="m-0 mt-4 max-w-3xl text-[15px] leading-7 text-[#09090b]/60">Ensine à sua equipe digital o que ela precisa saber sobre sua empresa e como deve trabalhar.</p>
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className="rounded-2xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop"><div className="wandora-mono text-[9px] font-black text-[#09090b]/40">{label}</div><div className="wandora-display mt-2 text-5xl">{value}</div><div className="mt-1 text-xs font-bold text-[#09090b]/45">{note}</div></div>;
}

function Notice({ title }: { title: string }) {
  return <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-6 wandora-pop"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5" /><div><h3 className="m-0 text-sm font-black">{title}</h3><p className="m-0 mt-2 text-sm leading-6 text-[#09090b]/65">Informações da empresa e Regras da Casa sempre pertencem à empresa explicitamente selecionada.</p></div></div></div>;
}

function CreatePanel({ draft, setDraft, pending, error, onSubmit }: {
  draft: CreateDraft; setDraft: (draft: CreateDraft) => void; pending: boolean; error: Error | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#09090b] p-6 text-white wandora-pop">
      <div className="wandora-mono text-[9px] font-black text-white/45">gestão da empresa</div>
      <h2 className="wandora-display m-0 mt-2 text-4xl">O QUE SUA EQUIPE DIGITAL PRECISA SABER?</h2>
      <p className="m-0 mt-3 max-w-2xl text-sm leading-6 text-white/60">Adicione uma informação sobre a empresa ou uma regra de como sua equipe digital deve trabalhar.</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="flex flex-wrap gap-2">
          {(['fact', 'rule'] as const).map((type) => (
            <button key={type} type="button" onClick={() => setDraft({ ...draft, type })}
              className={'rounded-full border-2 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] ' + (draft.type === type ? 'border-[#d2e823] bg-[#d2e823] text-[#09090b]' : 'border-white/30 bg-white/5 text-white/65')}>
              {type === 'fact' ? 'Informação da empresa' : 'Regra da Casa'}
            </button>
          ))}
        </div>
        <label className="grid gap-2"><span className="text-xs font-black text-white/70">O que sua equipe deve saber</span>
          <textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} maxLength={4000} rows={4} required
            className="w-full resize-y rounded-2xl border-2 border-white/30 bg-white px-4 py-3 text-sm leading-6 text-[#09090b] outline-none focus:border-[#d2e823]" />
        </label>
        <label className="flex items-start gap-3 rounded-2xl border-2 border-white/20 bg-white/5 p-4">
          <input type="checkbox" checked={draft.approvedSource} onChange={(event) => setDraft({ ...draft, approvedSource: event.target.checked })} className="mt-1 size-4" />
          <span><span className="block text-sm font-black">Esta informação veio de um documento ou fonte da empresa</span><span className="mt-1 block text-xs leading-5 text-white/50">Use esta opção quando a informação veio de um site, documento, manual, tabela ou outra fonte oficial da empresa.</span></span>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2"><span className="text-xs font-black text-white/70">Onde essa informação está registrada? {draft.approvedSource ? '(obrigatória)' : '(opcional)'}</span><input value={draft.sourceRef} onChange={(event) => setDraft({ ...draft, sourceRef: event.target.value })} maxLength={1024} required={draft.approvedSource} className="rounded-xl border-2 border-white/30 bg-white px-3 py-2.5 text-sm text-[#09090b]" /></label>
          <label className="grid gap-2"><span className="text-xs font-black text-white/70">Nome da fonte (opcional)</span><input value={draft.sourceLabel} onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })} maxLength={255} className="rounded-xl border-2 border-white/30 bg-white px-3 py-2.5 text-sm text-[#09090b]" /></label>
        </div>
        {error ? <InlineError error={error} dark /> : null}
        <div><button type="submit" disabled={pending || !draft.content.trim() || (draft.approvedSource && !draft.sourceRef.trim())}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-[#d2e823] bg-[#d2e823] px-4 py-2.5 text-sm font-black text-[#09090b] wandora-press disabled:opacity-50">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? 'Salvando…' : 'Adicionar à empresa'}
        </button></div>
      </form>
    </section>
  );
}

function GroundingSection({ title, eyebrow, description, empty, entries, canManage, retiringId, onRetire, onCorrect }: {
  title: string; eyebrow: string; description: string; empty: string; entries: GroundingEntry[]; canManage: boolean;
  retiringId: string | undefined; onRetire: (entry: GroundingEntry) => void; onCorrect: (entry: GroundingEntry) => void;
}) {
  return (
    <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop sm:p-6">
      <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">{eyebrow}</div>
      <h2 className="wandora-display m-0 mt-2 text-4xl">{title}</h2>
      <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-[#09090b]/55">{description}</p>
      {!entries.length ? <div className="mt-6 rounded-2xl border-2 border-dashed border-[#09090b]/25 bg-[#f8f4e8] p-6 text-center"><BookOpenCheck className="mx-auto size-6 text-[#09090b]/35" /><p className="m-0 mt-3 text-sm font-black">{empty}</p></div> :
        <div className="mt-6 grid gap-4">{entries.map((entry) => <EntryCard key={entry.id} entry={entry} canManage={canManage} retiring={retiringId === entry.id} onRetire={() => onRetire(entry)} onCorrect={() => onCorrect(entry)} />)}</div>}
    </section>
  );
}

function EntryCard({ entry, canManage, retiring, onRetire, onCorrect }: {
  entry: GroundingEntry; canManage: boolean; retiring: boolean; onRetire: () => void; onCorrect: () => void;
}) {
  return (
    <article className="rounded-2xl border-2 border-[#09090b] bg-[#f8f4e8] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <span className={'rounded-full border-2 border-[#09090b] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] ' + (entry.type === 'fact' ? 'bg-[#d2e823]' : 'bg-[#fdd030]')}>{entry.type === 'fact' ? 'informação da empresa' : 'regra da casa'}</span>
          <span className="rounded-full border-2 border-[#09090b]/30 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#09090b]/55">{provenanceLabel(entry.provenance.type)}</span>
        </div>
        <p className="m-0 mt-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#09090b]/85">{entry.content}</p>
        {entry.provenance.sourceLabel ? <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#09090b]/45"><FileCheck2 className="size-4" /> Fonte: {entry.provenance.sourceLabel}</div> : null}
      </div>
      {canManage ? <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onCorrect} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#09090b] bg-white px-3 py-2 text-xs font-black wandora-pop-sm wandora-press"><PencilLine className="size-3.5" /> Corrigir</button>
        <button type="button" onClick={onRetire} disabled={retiring} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#09090b] bg-white px-3 py-2 text-xs font-black wandora-pop-sm wandora-press disabled:opacity-50">{retiring ? <LoaderCircle className="size-3.5 animate-spin" /> : <ArchiveX className="size-3.5" />}{retiring ? 'Retirando…' : 'Retirar'}</button>
      </div> : null}</div>
    </article>
  );
}

function HistorySection({ entries }: { entries: GroundingEntry[] }) {
  return (
    <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop sm:p-6">
      <div className="flex items-center gap-3"><History className="size-5" /><div><div className="wandora-mono text-[9px] font-black text-[#09090b]/40">história preservada</div><h2 className="m-0 mt-1 text-base font-black">Itens retirados</h2></div></div>
      <div className="mt-5 grid gap-3">{entries.map((entry) => <div key={entry.id} className="rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-4">
        <div className="text-[9px] font-black uppercase tracking-[0.08em] text-[#09090b]/40">{entry.type === 'fact' ? 'fato' : 'regra'} · retirado{entry.provenance.sourceLabel ? ' · ' + entry.provenance.sourceLabel : ''}</div>
        <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-[#09090b]/55">{entry.content}</p>
      </div>)}</div>
    </section>
  );
}

function CorrectionPanel({ entry, draft, setDraft, pending, error, onCancel, onSubmit }: {
  entry: GroundingEntry; draft: CorrectionDraft; setDraft: (draft: CorrectionDraft) => void; pending: boolean; error: Error | null;
  onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#09090b]/55 p-4" role="dialog" aria-modal="true" aria-label="Corrigir informação oficial da empresa">
      <form onSubmit={onSubmit} className="w-full max-w-2xl rounded-3xl border-[2.5px] border-[#09090b] bg-white p-6 wandora-pop">
        <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">correção com histórico preservado</div>
        <h2 className="wandora-display m-0 mt-2 text-4xl">CORRIGIR SEM APAGAR O PASSADO.</h2>
        <p className="m-0 mt-3 text-sm leading-6 text-[#09090b]/55">A versão anterior será retirada e esta correção será registrada como uma nova entrada oficial.</p>
        <div className="mt-5 rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-4"><div className="text-[9px] font-black uppercase tracking-[0.08em] text-[#09090b]/40">versão atual</div><p className="m-0 mt-2 text-sm leading-6 text-[#09090b]/60">{entry.content}</p></div>
        <label className="mt-5 grid gap-2"><span className="text-xs font-black">Conteúdo corrigido</span><textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} maxLength={4000} rows={4} required className="w-full resize-y rounded-2xl border-2 border-[#09090b] bg-white px-4 py-3 text-sm leading-6" /></label>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2"><span className="text-xs font-black">Onde a correção foi confirmada</span><input value={draft.sourceRef} onChange={(event) => setDraft({ ...draft, sourceRef: event.target.value })} maxLength={1024} required className="rounded-xl border-2 border-[#09090b] bg-white px-3 py-2.5 text-sm" /></label>
          <label className="grid gap-2"><span className="text-xs font-black">Nome da fonte (opcional)</span><input value={draft.sourceLabel} onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })} maxLength={255} className="rounded-xl border-2 border-[#09090b] bg-white px-3 py-2.5 text-sm" /></label>
        </div>
        {error ? <InlineError error={error} /> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={pending || !draft.content.trim() || !draft.sourceRef.trim()} className="inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press disabled:opacity-50">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? 'Corrigindo…' : 'Registrar correção'}</button>
        </div>
      </form>
    </div>
  );
}

function InlineError({ error, dark = false }: { error: Error | null; dark?: boolean }) {
  if (!error) return null;
  return <div className={'mt-4 rounded-2xl border-2 p-3 text-sm font-bold ' + (dark ? 'border-[#fdd030] bg-[#fdd030] text-[#09090b]' : 'border-[#09090b] bg-[#fdd030] text-[#09090b]')}>{error.message}</div>;
}

function provenanceLabel(type: GroundingProvenanceType): string {
  if (type === 'approved_source') return 'fonte da empresa';
  if (type === 'approved_correction') return 'correção confirmada';
  return 'confirmado pelo proprietário';
}
