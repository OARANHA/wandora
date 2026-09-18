import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  HIRE_CATALOG_KEY,
  HireError,
  clearHireOperation,
  peekHireOperation,
  resolveHireOperation,
  type HireOperationRef,
} from '../customerHireOperation';

type HiredEmployee = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
};

type HireAvailability = {
  catalogKey: typeof HIRE_CATALOG_KEY;
  available: boolean;
  state: 'available' | 'already-hired' | 'reconciliation-required' | 'unavailable';
};

type DigitalEmployeesResponse = {
  items: HiredEmployee[];
  hire: HireAvailability;
};

export function StartPage() {
  const { activeOrganization, context, authFetch } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hireOperationRef = useRef<HireOperationRef | null>(null);
  const activeOrganizationIdRef = useRef<string | null>(null);
  activeOrganizationIdRef.current = activeOrganization?.id ?? null;

  const availabilityQuery = useQuery({
    queryKey: ['digital-employees', activeOrganization?.id],
    enabled: Boolean(activeOrganization),
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/organizations/${activeOrganization!.id}/digital-employees`,
      );
      if (response.status === 403) throw new Error('Seu acesso a esta empresa não está ativo.');
      if (!response.ok) throw new Error('Não foi possível verificar a contratação para esta empresa.');
      return await response.json() as DigitalEmployeesResponse;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeOrganization) {
        throw new HireError('organization-required', 'Escolha uma empresa antes de contratar.');
      }
      if (activeOrganization.role !== 'owner' && activeOrganization.role !== 'admin') {
        throw new HireError(
          'forbidden',
          'Somente owner ou admin pode contratar um funcionário digital.',
          false,
          activeOrganization.id,
        );
      }

      const hire = availabilityQuery.data?.hire;
      if (!hire || hire.catalogKey !== HIRE_CATALOG_KEY) {
        throw new HireError(
          'hire-availability-unavailable',
          'A Wandora ainda não conseguiu confirmar se a contratação está disponível.',
          false,
          activeOrganization.id,
        );
      }

      let operation: HireOperationRef;
      if (hire.state === 'reconciliation-required') {
        const current = hireOperationRef.current;
        const persisted = current?.organizationId === activeOrganization.id
          ? current
          : peekHireOperation(activeOrganization.id);
        if (!persisted) {
          throw new HireError(
            'reconciliation-session-missing',
            'Existe uma contratação em verificação, mas esta sessão não possui a chave original para retomá-la com segurança.',
            false,
            activeOrganization.id,
          );
        }
        operation = persisted;
      } else {
        if (!hire.available || hire.state !== 'available') {
          throw new HireError(
            hire.state === 'already-hired' ? 'already-hired' : 'hire-not-available',
            hire.state === 'already-hired'
              ? 'Ana já faz parte da equipe desta empresa.'
              : 'A contratação de Ana ainda não está disponível para esta empresa.',
            false,
            activeOrganization.id,
          );
        }
        operation = resolveHireOperation(activeOrganization.id, hireOperationRef.current);
      }

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
          throw new HireError(
            'invalid-response',
            'A Wandora retornou uma resposta de contratação inválida.',
            false,
            operation.organizationId,
          );
        }
        clearHireOperation(operation);
        hireOperationRef.current = null;
        return { employee, organizationId: operation.organizationId };
      }

      const code = typeof payload?.error === 'string' ? payload.error : 'unexpected';
      if (response.status === 403) {
        throw new HireError(
          code,
          'Seu perfil não pode contratar funcionários nesta empresa.',
          false,
          operation.organizationId,
        );
      }
      if (response.status === 404) {
        throw new HireError(
          code,
          'Este funcionário ainda não está disponível para contratação nesta empresa.',
          false,
          operation.organizationId,
        );
      }
      if (response.status === 503) {
        throw new HireError(
          code,
          'A contratação ainda não está preparada para esta empresa.',
          false,
          operation.organizationId,
        );
      }
      if (response.status === 409 && code === 'employee-hiring-uncertain') {
        throw new HireError(
          code,
          'A confirmação da contratação ficou inconclusiva. Tente novamente: a Wandora reutilizará a mesma operação com segurança.',
          true,
          operation.organizationId,
        );
      }
      if (response.status === 409) {
        throw new HireError(
          code,
          'A contratação entrou em conflito com uma operação já existente.',
          false,
          operation.organizationId,
        );
      }
      throw new HireError(
        code,
        'Não foi possível concluir a contratação agora.',
        false,
        operation.organizationId,
      );
    },
    onSuccess: async ({ organizationId }) => {
      await queryClient.invalidateQueries({ queryKey: ['digital-employees', organizationId] });
      if (activeOrganizationIdRef.current === organizationId) {
        await navigate({ to: '/team' });
      }
    },
    onError: async (error) => {
      if (error instanceof HireError && error.retrySameKey && error.organizationId) {
        await queryClient.invalidateQueries({
          queryKey: ['digital-employees', error.organizationId],
        });
      }
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

  const canHireRole = activeOrganization.role === 'owner' || activeOrganization.role === 'admin';
  const hire = availabilityQuery.data?.hire;
  const error = mutation.error instanceof HireError ? mutation.error : null;
  const errorOrganization = error?.organizationId
    ? context?.organizations.find((organization) => organization.id === error.organizationId) ?? null
    : null;
  const retryOrganizationMismatch = Boolean(
    error?.retrySameKey
      && error.organizationId
      && error.organizationId !== activeOrganization.id,
  );

  let persistedReconciliation: HireOperationRef | null = null;
  let reconciliationStorageError: HireError | null = null;
  if (hire?.state === 'reconciliation-required') {
    try {
      persistedReconciliation = hireOperationRef.current?.organizationId === activeOrganization.id
        ? hireOperationRef.current
        : peekHireOperation(activeOrganization.id);
    } catch (storageError) {
      reconciliationStorageError = storageError instanceof HireError
        ? storageError
        : new HireError(
          'idempotency-storage-unavailable',
          'A contratação em verificação não pode ser retomada nesta sessão.',
          false,
          activeOrganization.id,
        );
    }
  }

  const canStartNew = Boolean(canHireRole && hire?.available && hire.state === 'available');
  const canResume = Boolean(
    canHireRole
      && hire?.state === 'reconciliation-required'
      && persistedReconciliation
      && !reconciliationStorageError,
  );
  const actionEnabled = canStartNew || canResume;
  const availabilityPending = availabilityQuery.isLoading || !availabilityQuery.data;

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

          {!canHireRole ? (
            <Notice>
              Somente owner ou admin pode contratar um funcionário digital para <strong>{activeOrganization.name}</strong>.
            </Notice>
          ) : null}

          {availabilityQuery.isError ? (
            <Notice>
              Não foi possível confirmar a disponibilidade da contratação. Nenhuma operação será iniciada até a consulta ser concluída com segurança.
            </Notice>
          ) : null}

          {hire?.state === 'unavailable' && canHireRole ? (
            <Notice>
              A contratação de Ana ainda não está liberada para <strong>{activeOrganization.name}</strong>.
            </Notice>
          ) : null}

          {hire?.state === 'already-hired' ? (
            <Notice>
              Ana já faz parte da equipe desta empresa. A contratação não será repetida.
            </Notice>
          ) : null}

          {hire?.state === 'reconciliation-required' ? (
            <Notice>
              {persistedReconciliation && !reconciliationStorageError
                ? 'Existe uma contratação em verificação nesta sessão. O botão abaixo retomará exatamente a mesma operação.'
                : 'Existe uma contratação em verificação, mas esta sessão não possui a chave original. Nenhuma nova operação será criada.'}
            </Notice>
          ) : null}

          {reconciliationStorageError ? (
            <Notice>{reconciliationStorageError.message}</Notice>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
              <strong>Não foi possível concluir.</strong> {error.message}
              {error.retrySameKey ? (
                <div className="mt-2 text-xs text-rose-700">
                  {retryOrganizationMismatch
                    ? `A tentativa inconclusiva pertence a ${errorOrganization?.name ?? 'outra empresa'}. Selecione essa empresa para repetir a mesma operação com segurança.`
                    : 'O botão abaixo reutiliza a mesma chave da tentativa anterior.'}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={
                availabilityPending
                || !actionEnabled
                || mutation.isPending
                || retryOrganizationMismatch
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {mutation.isPending || availabilityQuery.isLoading
                ? <LoaderCircle className="size-4 animate-spin" />
                : <CheckCircle2 className="size-4" />}
              {mutation.isPending
                ? 'Contratando Ana…'
                : availabilityQuery.isLoading
                  ? 'Verificando disponibilidade…'
                  : retryOrganizationMismatch
                    ? 'Selecione a empresa da tentativa'
                    : canResume
                      ? 'Retomar contratação'
                      : hire?.state === 'already-hired'
                        ? 'Ana já está na equipe'
                        : 'Contratar Ana'}
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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      {children}
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
