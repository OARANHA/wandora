import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArchiveX, BookOpenCheck, Check, Download, Eye, FileCheck2, FileUp, History, Lightbulb, LoaderCircle, PencilLine, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../AuthProvider';
import {
  GroundingCreateOperationError,
  clearGroundingCreateOperation,
  resolveGroundingCreateOperation,
} from '../customerGroundingOperation';
import {
  GROUNDING_SOURCE_ACCEPT,
  downloadGroundingSourceFile,
  isGroundingSourceFileRef,
  uploadGroundingSourceFile,
  validateGroundingSourceFile,
} from '../groundingSourceStorage';

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
type CreateDraft = { type: GroundingEntryType; content: string; approvedSource: boolean; sourceRef: string; sourceLabel: string; sourceFile: File | null };
type CorrectionDraft = { content: string; sourceRef: string; sourceLabel: string; sourceFile: File | null };

const emptyCreateDraft: CreateDraft = { type: 'fact', content: '', approvedSource: false, sourceRef: '', sourceLabel: '', sourceFile: null };

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
  const [selectedEntry, setSelectedEntry] = useState<GroundingEntry | null>(null);
  const [correction, setCorrection] = useState<CorrectionDraft>({ content: '', sourceRef: '', sourceLabel: '', sourceFile: null });

  useEffect(() => {
    if (!selectedEntry) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedEntry(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedEntry]);

  const query = useQuery({
    queryKey: ['organization-grounding', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch('/api/v1/organizations/' + activeOrganization!.id + '/grounding');
      if (response.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!response.ok) throw new Error('Não foi possível carregar as informações da empresa e as Regras da Casa.');
      return await response.json() as GroundingResponse;
    },
  });

  const canManage = activeOrganization?.role === 'owner' || activeOrganization?.role === 'admin';

  const createMutation = useMutation({
    mutationFn: async (input: CreateDraft) => {
      if (!activeOrganization) throw new GroundingCreateRequestError('Escolha uma empresa antes de registrar esta informação.');

      let sourceRef = input.sourceRef.trim();
      let sourceLabel = input.sourceLabel.trim();
      let approvedSource = input.approvedSource;

      if (input.sourceFile) {
        const uploaded = await uploadGroundingSourceFile(activeOrganization.id, input.sourceFile, authFetch);
        sourceRef = uploaded.sourceRef;
        sourceLabel = uploaded.sourceLabel;
        approvedSource = true;
      }

      const payload = {
        entryType: input.type,
        content: input.content.trim(),
        provenanceType: approvedSource ? 'approved_source' as const : 'owner_statement' as const,
        sourceRef: sourceRef || null,
        sourceLabel: sourceLabel || null,
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
          'O registro ficou sem confirmação conclusiva. Repita exatamente o mesmo conteúdo e a mesma fonte; a tentativa original será reutilizada com segurança.',
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
      if (!activeOrganization) throw new Error('Escolha uma empresa antes de alterar esta informação.');
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
      if (!activeOrganization) throw new Error('Escolha uma empresa antes de corrigir esta informação.');

      let sourceRef = input.sourceRef.trim();
      let sourceLabel = input.sourceLabel.trim();

      if (input.sourceFile) {
        const uploaded = await uploadGroundingSourceFile(activeOrganization.id, input.sourceFile, authFetch);
        sourceRef = uploaded.sourceRef;
        sourceLabel = uploaded.sourceLabel;
      }

      const response = await authFetch('/api/v1/organizations/' + activeOrganization.id + '/grounding/' + entry.id + '/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': mutationKey('correct') },
        body: JSON.stringify({ content: input.content.trim(), sourceRef, sourceLabel: sourceLabel || null }),
      });
      if (!response.ok) throw await groundingError(response, 'Não foi possível registrar esta correção.');
      return await response.json() as { entry: GroundingEntry };
    },
    onSuccess: async () => {
      setEditing(null);
      setCorrection({ content: '', sourceRef: '', sourceLabel: '', sourceFile: null });
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
    <div className="space-y-7">
      <PageHeader />

      {query.isLoading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border-[2.5px] border-[#09090b] bg-white text-sm font-black text-[#09090b]/55 wandora-pop">
          <LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando a empresa…
        </div>
      ) : query.isError ? (
        <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-6 wandora-pop">
          <h2 className="wandora-display m-0 text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.02]">NÃO CONSEGUIMOS CARREGAR AS INFORMAÇÕES.</h2>
          <p className="m-0 mt-3 text-sm leading-6 text-[#09090b]/65">{query.error instanceof Error ? query.error.message : 'Tente novamente.'}</p>
          <button type="button" onClick={() => void query.refetch()} className="mt-4 rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press">Tentar novamente</button>
        </section>
      ) : (
        <>
          <GroundingSection title="Regras da Casa" eyebrow={rules.length + (rules.length === 1 ? ' regra ativa' : ' regras ativas')}
            description="O jeito de trabalhar que vale para toda a equipe — humana e digital."
            empty="Nenhuma Regra da Casa foi registrada ainda." entries={rules} canManage={canManage}
            retiringId={retireMutation.isPending ? retireMutation.variables?.id : undefined}
            onRetire={(entry) => retireMutation.mutate(entry)}
            onCorrect={(entry) => { setEditing(entry); setCorrection({ content: entry.content, sourceRef: '', sourceLabel: entry.provenance.sourceLabel ?? '', sourceFile: null }); }}
            onOpen={setSelectedEntry}
            cardTone="rule"
          />

          {canManage ? (
            <section className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
              <CreatePanel draft={draft} setDraft={setDraft} pending={createMutation.isPending} error={createMutation.error}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!draft.content.trim() || (draft.approvedSource && !draft.sourceRef.trim() && !draft.sourceFile)) return;
                  createMutation.mutate(draft);
                }}
              />
              <HowItWorks />
            </section>
          ) : (
            <section className="rounded-2xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><div>
                <div className="font-black">Acesso somente leitura</div>
                <p className="m-0 mt-1 text-sm leading-6 text-[#09090b]/55">Você pode consultar as informações da empresa, mas somente proprietários e administradores podem alterá-las.</p>
              </div></div>
            </section>
          )}
          <GroundingSection title="Informações da empresa" eyebrow={facts.length + (facts.length === 1 ? ' informação confirmada' : ' informações confirmadas')}
            description="Fatos que sua equipe pode usar como verdade ao trabalhar e responder."
            empty="Nenhuma informação da empresa foi registrada ainda." entries={facts} canManage={canManage}
            retiringId={retireMutation.isPending ? retireMutation.variables?.id : undefined}
            onRetire={(entry) => retireMutation.mutate(entry)}
            onCorrect={(entry) => { setEditing(entry); setCorrection({ content: entry.content, sourceRef: '', sourceLabel: entry.provenance.sourceLabel ?? '', sourceFile: null }); }}
            onOpen={setSelectedEntry}
            cardTone="fact"
          />
          {retired.length ? <HistorySection entries={retired} /> : null}
          {retireMutation.isError ? <InlineError error={retireMutation.error} /> : null}
        </>
      )}

      {selectedEntry ? (
        <EntryDrawer
          entry={selectedEntry}
          canManage={canManage}
          retiring={retireMutation.isPending && retireMutation.variables?.id === selectedEntry.id}
          onClose={() => setSelectedEntry(null)}
          onCorrect={() => {
            setSelectedEntry(null);
            setEditing(selectedEntry);
            setCorrection({ content: selectedEntry.content, sourceRef: '', sourceLabel: selectedEntry.provenance.sourceLabel ?? '', sourceFile: null });
          }}
          onRetire={() => {
            retireMutation.mutate(selectedEntry, { onSuccess: () => setSelectedEntry(null) });
          }}
        />
      ) : null}

      {editing ? (
        <CorrectionPanel entry={editing} draft={correction} setDraft={setCorrection} pending={correctionMutation.isPending}
          error={correctionMutation.error}
          onCancel={() => { setEditing(null); setCorrection({ content: '', sourceRef: '', sourceLabel: '', sourceFile: null }); }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!correction.content.trim() || (!correction.sourceRef.trim() && !correction.sourceFile)) return;
            correctionMutation.mutate({ entry: editing, input: correction });
          }}
        />
      ) : null}
    </div>
  );
}

function PageHeader() {
  return (
    <section className="max-w-5xl">
      <div className="inline-flex rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1 wandora-pop-sm">
        <span className="wandora-mono text-[8px] font-black">a casa · informações e regras</span>
      </div>
      <h1 className="wandora-display m-0 mt-3 text-[clamp(1.9rem,3vw,3rem)] leading-[0.98] text-[#09090b]">
        AS REGRAS DA <span className="inline-block rounded-lg bg-[#d2e823] px-2">SUA CASA.</span>
      </h1>
      <p className="m-0 mt-3 max-w-3xl text-[15px] leading-7 text-[#09090b]/58">
        Aqui a empresa ensina como funciona. A equipe inteira, humana e digital, segue o mesmo manual.
      </p>
    </section>
  );
}

function Notice({ title }: { title: string }) {
  return <div className="rounded-3xl border-[2.5px] border-[#09090b] bg-[#fdd030] p-6 wandora-pop"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5" /><div><h3 className="m-0 text-sm font-black">{title}</h3><p className="m-0 mt-2 text-sm leading-6 text-[#09090b]/65">Informações da empresa e Regras da Casa sempre pertencem à empresa explicitamente selecionada.</p></div></div></div>;
}

function CreatePanel({ draft, setDraft, pending, error, onSubmit }: {
  draft: CreateDraft; setDraft: (draft: CreateDraft) => void; pending: boolean; error: Error | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-[22px] border-[2.5px] border-[#09090b] bg-[#09090b] p-5 text-white wandora-pop sm:p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-[#f47a24] text-sm">🤖</span>
        <span className="wandora-mono text-[9px] font-black text-white/70">ensinar à equipe</span>
      </div>
      <h2 className="m-0 mt-4 text-[17px] font-bold leading-6">Explique como você explicaria a um funcionário novo.</h2>
      <p className="m-0 mt-1 max-w-xl text-sm leading-6 text-white/55">Escolha se é uma informação sobre a empresa ou uma regra que todos devem seguir.</p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="flex flex-wrap gap-2">
          {(['fact', 'rule'] as const).map((type) => (
            <button key={type} type="button" onClick={() => setDraft({ ...draft, type })}
              className={'rounded-lg border-2 px-3 py-2 text-xs font-bold ' + (draft.type === type ? 'border-[#d2e823] bg-[#d2e823] text-[#09090b]' : 'border-white/25 bg-white/5 text-white/65')}>
              {type === 'fact' ? 'Sobre a empresa' : 'Regra de trabalho'}
            </button>
          ))}
        </div>
        <textarea
          aria-label="O que sua equipe deve saber"
          value={draft.content}
          onChange={(event) => setDraft({ ...draft, content: event.target.value })}
          maxLength={4000}
          rows={4}
          required
          placeholder={draft.type === 'rule' ? 'Ex.: Orçamento acima de R$ 5 mil sempre precisa de revisão.' : 'Ex.: Atendemos clínicas médicas e centralizamos agenda, pacientes e gestão financeira.'}
          className="w-full resize-y rounded-xl border-2 border-white/25 bg-white px-4 py-3.5 text-sm leading-6 text-[#09090b] outline-none placeholder:text-[#09090b]/28 focus:border-[#d2e823]"
        />
        <details className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3">
          <summary className="cursor-pointer text-xs font-bold text-white/65">Adicionar fonte ou documento (opcional)</summary>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 rounded-xl border border-white/15 bg-white/[0.04] p-3">
              <span className="flex items-center gap-2 text-xs font-bold text-white/75"><FileUp className="size-4" /> Arquivo da empresa</span>
              <input
                type="file"
                accept={GROUNDING_SOURCE_ACCEPT}
                onChange={(event) => {
                  const selected = event.currentTarget.files?.[0] ?? null;
                  if (!selected) {
                    setDraft({ ...draft, sourceFile: null });
                    return;
                  }
                  try {
                    validateGroundingSourceFile(selected);
                    event.currentTarget.setCustomValidity('');
                    setDraft({ ...draft, sourceFile: selected, approvedSource: true });
                  } catch (error) {
                    event.currentTarget.value = '';
                    event.currentTarget.setCustomValidity(error instanceof Error ? error.message : 'Arquivo inválido.');
                    event.currentTarget.reportValidity();
                  }
                }}
                className="block w-full text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-[#d2e823] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#09090b]"
              />
              <span className="text-[10px] leading-4 text-white/40">PDF, DOCX, XLSX, CSV, TXT, PNG ou JPG · até 10 MB. O arquivo fica privado e vinculado como evidência.</span>
              {draft.sourceFile ? <span className="text-xs font-bold text-[#d2e823]">Selecionado: {draft.sourceFile.name}</span> : null}
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={draft.approvedSource}
                onChange={(event) => setDraft({ ...draft, approvedSource: event.target.checked })}
                disabled={Boolean(draft.sourceFile)}
                className="mt-1 size-4"
              />
              <span className="text-xs leading-5 text-white/60">Esta informação veio de uma fonte oficial da empresa. Ao anexar um arquivo, esta opção fica ativa automaticamente.</span>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold text-white/60">Outra referência oficial {draft.approvedSource && !draft.sourceFile ? '(obrigatória)' : '(opcional)'}</span>
                <input
                  value={draft.sourceRef}
                  onChange={(event) => setDraft({ ...draft, sourceRef: event.target.value })}
                  maxLength={1024}
                  required={draft.approvedSource && !draft.sourceFile}
                  disabled={Boolean(draft.sourceFile)}
                  placeholder="Ex.: https://... ou referência interna"
                  className="rounded-lg border border-white/25 bg-white px-3 py-2.5 text-sm text-[#09090b] disabled:opacity-45"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold text-white/60">Nome da fonte (opcional)</span>
                <input
                  value={draft.sourceLabel}
                  onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })}
                  maxLength={255}
                  disabled={Boolean(draft.sourceFile)}
                  className="rounded-lg border border-white/25 bg-white px-3 py-2.5 text-sm text-[#09090b] disabled:opacity-45"
                />
              </label>
            </div>
          </div>
        </details>
        {error ? <InlineError error={error} dark /> : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || !draft.content.trim() || (draft.approvedSource && !draft.sourceRef.trim() && !draft.sourceFile)}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#d2e823] bg-[#d2e823] px-4 py-2.5 text-sm font-bold text-[#09090b] wandora-press disabled:opacity-50">
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? 'Salvando…' : 'Ensinar isso'}
          </button>
          <span className="wandora-mono text-[8px] text-white/35">vai para o manual da empresa</span>
        </div>
      </form>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    'Você ensina em uma frase, no seu jeito de falar.',
    'A regra ou informação fica disponível para a equipe digital.',
    'Se precisar corrigir, a versão anterior continua guardada no histórico.',
  ];

  return (
    <aside className="rounded-[22px] border-[2.5px] border-[#09090b] bg-[#d2e823] p-5 wandora-pop sm:p-6">
      <div className="inline-flex rounded-lg border-2 border-[#09090b] bg-white px-3 py-1.5"><span className="wandora-mono text-[8px] font-black">como funciona</span></div>
      <ol className="m-0 mt-5 grid list-none gap-4 p-0">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-6 text-[#09090b]/75">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg border-2 border-[#09090b] bg-white text-[11px] font-black">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-xl border-2 border-dashed border-[#09090b]/25 bg-[#f8f4e8]/80 p-4">
        <div className="flex gap-2"><Lightbulb className="mt-0.5 size-4 shrink-0" /><p className="m-0 text-xs leading-5 text-[#09090b]/65">Você continua no controle: nada criado pelo modelo vira regra oficial sozinho.</p></div>
      </div>
    </aside>
  );
}

function GroundingSection({ title, eyebrow, description, empty, entries, canManage, retiringId, onRetire, onCorrect, onOpen, cardTone }: {
  title: string; eyebrow: string; description: string; empty: string; entries: GroundingEntry[]; canManage: boolean;
  retiringId: string | undefined; onRetire: (entry: GroundingEntry) => void; onCorrect: (entry: GroundingEntry) => void;
  onOpen: (entry: GroundingEntry) => void;
  cardTone: 'rule' | 'fact';
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="wandora-display m-0 text-[clamp(1.35rem,2vw,1.85rem)] leading-none">{title.toUpperCase()}</h2>
          <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-[#09090b]/50">{description}</p>
        </div>
        <div className="wandora-mono text-[8px] text-[#09090b]/35">{eyebrow}</div>
      </div>

      {!entries.length ? (
        <div className="mt-4 rounded-[20px] border-2 border-dashed border-[#09090b]/25 bg-white/55 p-6 text-center">
          <BookOpenCheck className="mx-auto size-5 text-[#09090b]/30" />
          <p className="m-0 mt-2 text-sm font-bold text-[#09090b]/55">{empty}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {entries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              canManage={canManage}
              retiring={retiringId === entry.id}
              onRetire={() => onRetire(entry)}
              onCorrect={() => onCorrect(entry)}
              onOpen={() => onOpen(entry)}
              tone={cardTone === 'rule' ? (index % 3 === 0 ? 'sun' : index % 3 === 1 ? 'white' : 'lime') : (index % 2 === 0 ? 'white' : 'lime')}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EntryCard({ entry, canManage, retiring, onRetire, onCorrect, onOpen, tone }: {
  entry: GroundingEntry; canManage: boolean; retiring: boolean; onRetire: () => void; onCorrect: () => void; onOpen: () => void;
  tone: 'lime' | 'sun' | 'white';
}) {
  const toneClass = tone === 'lime' ? 'bg-[#d2e823]' : tone === 'sun' ? 'bg-[#fdd030]' : 'bg-white';

  return (
    <article className={'relative min-h-[170px] rounded-[18px] border-[2.5px] border-[#09090b] p-4 wandora-pop-sm sm:p-5 ' + toneClass}>
      <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full border-2 border-[#09090b] bg-white" aria-hidden="true" />

      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={entry.type === 'rule' ? 'Abrir Regra da Casa' : 'Abrir informação da empresa'}
      >
        <p className="m-0 line-clamp-4 whitespace-pre-wrap text-[13px] font-bold leading-[1.55] text-[#09090b]/88">“{entry.content}”</p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#09090b]/55">
          <Eye className="size-3.5" /> Ver detalhes
        </div>
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="wandora-mono text-[8px] text-[#09090b]/42">{provenanceLabel(entry.provenance.type)}</span>
        {entry.provenance.sourceLabel ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#09090b]/45"><FileCheck2 className="size-3" />{entry.provenance.sourceLabel}</span> : null}
      </div>

      {canManage ? (
        <div className="mt-3 flex gap-2 border-t border-[#09090b]/12 pt-3">
          <button type="button" onClick={onCorrect} className="inline-flex items-center gap-1.5 rounded-lg border border-[#09090b] bg-white/75 px-2.5 py-1.5 text-[11px] font-bold wandora-press"><PencilLine className="size-3" /> Corrigir</button>
          <button type="button" onClick={onRetire} disabled={retiring} className="inline-flex items-center gap-1.5 rounded-lg border border-[#09090b] bg-white/75 px-2.5 py-1.5 text-[11px] font-bold wandora-press disabled:opacity-50">{retiring ? <LoaderCircle className="size-3 animate-spin" /> : <ArchiveX className="size-3" />}{retiring ? 'Retirando…' : 'Retirar'}</button>
        </div>
      ) : null}
    </article>
  );
}

function EntryDrawer({ entry, canManage, retiring, onClose, onCorrect, onRetire }: {
  entry: GroundingEntry;
  canManage: boolean;
  retiring: boolean;
  onClose: () => void;
  onCorrect: () => void;
  onRetire: () => void;
}) {
  const { authFetch } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const hasStoredFile = isGroundingSourceFileRef(entry.provenance.sourceRef);

  const downloadSource = async () => {
    if (!entry.provenance.sourceRef || !hasStoredFile) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { blob, fileName } = await downloadGroundingSourceFile(
        entry.provenance.sourceRef,
        entry.provenance.sourceLabel,
        authFetch,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Não foi possível baixar este arquivo.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={entry.type === 'rule' ? 'Detalhes da Regra da Casa' : 'Detalhes da informação da empresa'}>
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[#09090b]/35" aria-label="Fechar detalhes" />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l-[2.5px] border-[#09090b] bg-[#f8f4e8] shadow-[-14px_0_0_rgba(9,9,11,0.08)]">
        <div className="flex items-center justify-between border-b-2 border-[#09090b]/12 px-5 py-4">
          <div>
            <div className="wandora-mono text-[8px] font-black text-[#09090b]/40">
              {entry.type === 'rule' ? 'regra da casa' : 'informação da empresa'}
            </div>
            <div className="mt-1 text-sm font-black">{entry.status === 'active' ? 'Ativa agora' : 'No histórico'}</div>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl border-2 border-[#09090b] bg-white wandora-press" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="rounded-2xl border-[2.5px] border-[#09090b] bg-white p-5">
            <p className="m-0 whitespace-pre-wrap text-[15px] font-semibold leading-7 text-[#09090b]/85">{entry.content}</p>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-xl border-2 border-[#09090b]/12 bg-white p-4">
              <div className="wandora-mono text-[8px] font-black text-[#09090b]/38">confirmada como</div>
              <div className="mt-1 text-sm font-bold">{provenanceLabel(entry.provenance.type)}</div>
            </div>

            {entry.provenance.sourceLabel ? (
              <div className="rounded-xl border-2 border-[#09090b]/12 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold"><FileCheck2 className="size-4" /> Fonte registrada</div>
                <p className="m-0 mt-2 text-sm leading-6 text-[#09090b]/55">{entry.provenance.sourceLabel}</p>
                {hasStoredFile ? (
                  <button
                    type="button"
                    onClick={() => void downloadSource()}
                    disabled={downloading}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 border-[#09090b] bg-[#f8f4e8] px-3 py-2 text-xs font-bold wandora-press disabled:opacity-50"
                  >
                    {downloading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                    {downloading ? 'Baixando…' : 'Baixar arquivo'}
                  </button>
                ) : null}
                {downloadError ? <p className="m-0 mt-2 text-xs font-bold text-[#9a281a]">{downloadError}</p> : null}
              </div>
            ) : null}

            <div className="rounded-xl border-2 border-[#09090b]/12 bg-white p-4">
              <div className="wandora-mono text-[8px] font-black text-[#09090b]/38">última atualização</div>
              <div className="mt-1 text-sm font-bold">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.updatedAt))}</div>
            </div>
          </div>
        </div>

        {canManage && entry.status === 'active' ? (
          <div className="border-t-2 border-[#09090b]/12 bg-white p-4">
            <div className="flex gap-2">
              <button type="button" onClick={onCorrect} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-bold wandora-press">
                <PencilLine className="size-4" /> Corrigir / anexar
              </button>
              <button type="button" onClick={onRetire} disabled={retiring} className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-bold wandora-press disabled:opacity-50">
                {retiring ? <LoaderCircle className="size-4 animate-spin" /> : <ArchiveX className="size-4" />}
                {retiring ? 'Retirando…' : 'Retirar'}
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function HistorySection({ entries }: { entries: GroundingEntry[] }) {
  return (
    <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 wandora-pop sm:p-6">
      <div className="flex items-center gap-3"><History className="size-5" /><div><div className="wandora-mono text-[9px] font-black text-[#09090b]/40">história preservada</div><h2 className="m-0 mt-1 text-base font-black">Itens retirados</h2></div></div>
      <div className="mt-5 grid gap-3">{entries.map((entry) => <div key={entry.id} className="rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-4">
        <div className="text-[9px] font-black uppercase tracking-[0.08em] text-[#09090b]/40">{entry.type === 'fact' ? 'informação' : 'regra'} · retirado{entry.provenance.sourceLabel ? ' · ' + entry.provenance.sourceLabel : ''}</div>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#09090b]/55 p-4" role="dialog" aria-modal="true" aria-label="Corrigir informação da empresa">
      <form onSubmit={onSubmit} className="w-full max-w-2xl rounded-3xl border-[2.5px] border-[#09090b] bg-white p-6 wandora-pop">
        <div className="wandora-mono text-[9px] font-black text-[#09090b]/40">correção com histórico preservado</div>
        <h2 className="wandora-display m-0 mt-2 text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.02]">CORRIGIR SEM APAGAR O PASSADO.</h2>
        <p className="m-0 mt-3 text-sm leading-6 text-[#09090b]/55">A versão anterior ficará no histórico e esta correção será salva como a nova versão confirmada.</p>
        <div className="mt-5 rounded-2xl border-2 border-[#09090b]/15 bg-[#f8f4e8] p-4"><div className="text-[9px] font-black uppercase tracking-[0.08em] text-[#09090b]/40">versão atual</div><p className="m-0 mt-2 text-sm leading-6 text-[#09090b]/60">{entry.content}</p></div>
        <label className="mt-5 grid gap-2"><span className="text-xs font-black">Conteúdo corrigido</span><textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} maxLength={4000} rows={4} required className="w-full resize-y rounded-2xl border-2 border-[#09090b] bg-white px-4 py-3 text-sm leading-6" /></label>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 rounded-xl border-2 border-[#09090b]/12 bg-[#f8f4e8] p-4">
            <span className="flex items-center gap-2 text-xs font-black"><FileUp className="size-4" /> Anexar arquivo oficial</span>
            <input
              type="file"
              accept={GROUNDING_SOURCE_ACCEPT}
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0] ?? null;
                if (!selected) {
                  setDraft({ ...draft, sourceFile: null });
                  return;
                }
                try {
                  validateGroundingSourceFile(selected);
                  event.currentTarget.setCustomValidity('');
                  setDraft({ ...draft, sourceFile: selected });
                } catch (fileError) {
                  event.currentTarget.value = '';
                  event.currentTarget.setCustomValidity(fileError instanceof Error ? fileError.message : 'Arquivo inválido.');
                  event.currentTarget.reportValidity();
                }
              }}
              className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#d2e823] file:px-3 file:py-2 file:text-xs file:font-bold"
            />
            <span className="text-[10px] leading-4 text-[#09090b]/45">PDF, DOCX, XLSX, CSV, TXT, PNG ou JPG · até 10 MB.</span>
            {draft.sourceFile ? <span className="text-xs font-bold">Selecionado: {draft.sourceFile.name}</span> : null}
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-black">Ou informar outra referência oficial</span>
              <input
                value={draft.sourceRef}
                onChange={(event) => setDraft({ ...draft, sourceRef: event.target.value })}
                maxLength={1024}
                required={!draft.sourceFile}
                disabled={Boolean(draft.sourceFile)}
                className="rounded-xl border-2 border-[#09090b] bg-white px-3 py-2.5 text-sm disabled:opacity-45"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black">Nome da fonte (opcional)</span>
              <input
                value={draft.sourceLabel}
                onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })}
                maxLength={255}
                disabled={Boolean(draft.sourceFile)}
                className="rounded-xl border-2 border-[#09090b] bg-white px-3 py-2.5 text-sm disabled:opacity-45"
              />
            </label>
          </div>
        </div>
        {error ? <InlineError error={error} /> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-xl border-2 border-[#09090b] bg-white px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={pending || !draft.content.trim() || (!draft.sourceRef.trim() && !draft.sourceFile)} className="inline-flex items-center gap-2 rounded-xl border-2 border-[#09090b] bg-[#d2e823] px-4 py-2.5 text-sm font-black wandora-pop-sm wandora-press disabled:opacity-50">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? 'Corrigindo…' : 'Salvar correção'}</button>
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

[executed on device: wandora-vps-01 (d266af26-d31e-4f0c-9840-ca03bb02b603)]