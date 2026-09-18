import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';

type HiredEmployee = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
};

type HireResponse = { employee: HiredEmployee };

class HireError extends Error {
  constructor(readonly code: string, message: string, readonly retrySameKey = false) {
    super(message);
    this.name = 'HireError';
  }
}


const HIRE_CATALOG_KEY = 'ana-commercial-v1' as const;
const IDEMPOTENCY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type HireOperationRef = {
  organizationId: string;
  catalogKey: typeof HIRE_CATALOG_KEY;
  idempotencyKey: string;
  storageKey: string;
};

function resolveHireOperation(
  organizationId: string,
  current: HireOperationRef | null,
): HireOperationRef {
  if (current?.organizationId === organizationId && current.catalogKey === HIRE_CATALOG_KEY) {
    return current;
  }

  const storageKey =
    `wandora:customer-hire:idempotency:v1:${organizationId}:${HIRE_CATALOG_KEY}`;

  let idempotencyKey: string | null = null;
  try {
    idempotencyKey = window.sessionStorage.getItem(storageKey)?.trim() || null;
  } catch {
    throw new HireError(
      'idempotency-storage-unavailable',
      'A contratação não pode começar neste navegador porque a operação segura não pôde ser preservada.',
    );
  }

  if (idempotencyKey && !IDEMPOTENCY_UUID_RE.test(idempotencyKey)) {
    throw new HireError(
      'idempotency-storage-invalid',
      'A contratação segura desta sessão precisa ser reiniciada antes de continuar.',
    );
  }

  if (!idempotencyKey) {
    idempotencyKey = crypto.randomUUID();
    try {
      window.sessionStorage.setItem(storageKey, idempotencyKey);
    } catch {
      throw new HireError(
        'idempotency-storage-unavailable',
        'A contratação não pode começar neste navegador porque a operação segura não pôde ser preservada.',
      );
    }
  }

  return {
    organizationId,
    catalogKey: HIRE_CATALOG_KEY,
    idempotencyKey,
    storageKey,
  };
}

function clearHireOperation(operation: HireOperationRef): void {
  try {
    window.sessionStorage.removeItem(operation.storageKey);
  } catch {
    // A stale opaque key is safe: the backend will replay the completed catalog operation.
  }
}

export function StartPage() {
  const { activeOrganization, context, authFetch } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hireOperationRef = useRef<HireOperationRef | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeOrganization) throw new HireError('organization-required', 'Escolha uma empresa antes de contratar.');
      if (activeOrganization.role !== 'owner' && activeOrganization.role !== 'admin') {
        throw new HireError('forbidden', 'Somente owner ou admin pode contratar um funcionário digital.');
      }

      const operation = resolveHireOperation(activeOrganization.id, hireOperationRef.current);
      hireOperationRef.current = operation;
      const response = await authFetch(
        `/api/v1/organizations/${activeOrganization.id}/digital-employees`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': operation.idempotencyKey,
          },
          body: JSON.stringify({ catalogKey: HIRE_CATALOG_KEY }),
        },
      );

      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (response.ok) {
        const employee = payload?.employee as HiredEmployee | undefined;
        if (!employee?.id || employee.name !== 'Ana') {
          throw new HireError('invalid-response', 'A Wandora retornou uma resposta de contratação inválida.');
        }
        clearHireOperation(operation);
        hireOperationRef.current = null;
        return { employee, organizationId: operation.organizationId };
      }

      const code = typeof payload?.error === 'string' ? payload.error : 'unexpected';
      if (response.status === 403) {
        throw new HireError(code, 'Seu perfil não pode contratar funcionários nesta empresa.');
      }
      if (response.status === 404 && code === 'not-found') {
        throw new HireError(code, 'A contratação ainda não está habilitada para esta empresa.');
      }
      if (response.status === 404) {
        throw new HireError(code, 'Este funcionário ainda não está disponível para contratação.');
      }
      if (response.status === 503) {
        throw new HireError(code, 'A contratação ainda não está preparada para esta empresa.');
      }
      if (response.status === 409 && code === 'employee-hiring-uncertain') {
        throw new HireError(
          code,
          'A confirmação da contratação ficou inconclusiva. Tente novamente: a Wandora reutilizará a mesma operação com segurança.',
          true,
        );
      }
      if (response.status === 409) {
        throw new HireError(code, 'A contratação entrou em conflito com uma operação já existente.');
      }
      throw new HireError(code, 'Não foi possível concluir a contratação agora.');
    },
    onSuccess: async ({ organizationId }) => {
      await queryClient.invalidateQueries({ queryKey: ['digital-employees', organizationId] });
      await navigate({ to: '/team' });
    },
  });

  if (!activeOrganization) {
    const hasMultiple = (context?.organizations.length ?? 0) > 1;
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <h3 className="m-0 text-sm font-semibold">
                {hasMultiple ? 'Escolha a empresa primeiro' : 'Nenhuma empresa ativa'}
              </h3>
              <p className="m-0 mt-2 text-sm leading-6 text-amber-800/80">
                {hasMultiple
                  ? 'Use o seletor da Wandora para escolher explicitamente em qual empresa Ana fará parte da equipe.'
                  : 'Sua conta ainda não possui uma empresa ativa para receber funcionários digitais.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canHire = activeOrganization.role === 'owner' || activeOrganization.role === 'admin';
  const error = mutation.error instanceof HireError ? mutation.error : null;

  return (
    <div className="space-y-6">
      <PageHeader />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-8">
          <p className="m-0 text-sm font-semibold text-indigo-600">Catálogo V1</p>
          <div className="mt-5 flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-sm font-bold text-white">
              AN
            </span>
            <div>
              <h2 className="m-0 text-xl font-semibold text-slate-950">Ana</h2>
              <p className="m-0 mt-1 text-sm text-slate-500">Assistente Comercial Digital</p>
            </div>
          </div>

          <p className="m-0 mt-6 max-w-2xl text-[15px] leading-7 text-slate-600">
            Ana entra na equipe com autonomia supervisionada. A contratação cria e vincula o funcionário de forma
            segura, mas <strong>não inicia trabalho e não envia mensagens</strong>.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                <Bot className="size-4" /> Estado inicial
              </div>
              <p className="m-0 mt-2 text-sm font-semibold text-slate-900">Contratada · aguardando ativação</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                <ShieldCheck className="size-4" /> Autonomia
              </div>
              <p className="m-0 mt-2 text-sm font-semibold text-slate-900">Supervisionada</p>
            </div>
          </div>

          {!canHire ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Somente owner ou admin pode contratar um funcionário digital para <strong>{activeOrganization.name}</strong>.
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
              <strong>Não foi possível concluir.</strong> {error.message}
              {error.retrySameKey ? (
                <div className="mt-2 text-xs text-rose-700">
                  O botão abaixo reutiliza a mesma chave da tentativa anterior.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={!canHire || mutation.isPending}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {mutation.isPending ? 'Contratando Ana…' : 'Contratar Ana'}
            </button>
            <button
              type="button"
              onClick={() => void navigate({ to: '/team' })}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Voltar para Equipe
            </button>
          </div>
        </div>

        <aside className="h-fit rounded-3xl bg-slate-950 p-6 text-white">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Empresa selecionada</p>
          <p className="m-0 mt-2 text-base font-semibold">{activeOrganization.name}</p>
          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">O que acontece agora</p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-400" />
                <span>Ana passa a existir na equipe com identidade Wandora estável.</span>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 size-4 shrink-0 text-amber-300" />
                <span>Ela permanece pausada até existir uma ativação explícita e segura.</span>
              </div>
              <div className="flex gap-3">
                <ArrowRight className="mt-1 size-4 shrink-0 text-indigo-300" />
                <span>Nenhuma mensagem ou compromisso externo é enviado por esta ação.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="m-0 text-sm font-semibold text-indigo-600">Novo funcionário</p>
      <h2 className="m-0 mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
        Contrate o primeiro funcionário digital
      </h2>
      <p className="m-0 mt-3 max-w-2xl text-[15px] leading-6 text-slate-500">
        A contratação adiciona o funcionário à equipe. Ativação e execução de trabalho são etapas separadas.
      </p>
    </div>
  );
}
