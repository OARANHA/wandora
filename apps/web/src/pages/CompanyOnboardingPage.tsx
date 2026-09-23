import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, LoaderCircle, MapPin, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import {
  normalizeCnpj,
  onlyDigits,
  validPostalCode,
  validTaxId,
  type CompanyEntityType,
} from '../companyProfileValidation';

type Draft = {
  organizationDisplayName: string;
  entityType: CompanyEntityType;
  legalName: string;
  taxId: string;
  responsibleName: string;
  contactEmail: string;
  phone: string;
  postalCode: string;
  addressLine1: string;
  addressNumber: string;
  addressComplement: string;
  district: string;
  city: string;
  stateCode: string;
  website: string;
  businessSegment: string;
  timezone: string;
};

const emptyDraft: Draft = {
  organizationDisplayName: '',
  entityType: 'pj',
  legalName: '',
  taxId: '',
  responsibleName: '',
  contactEmail: '',
  phone: '',
  postalCode: '',
  addressLine1: '',
  addressNumber: '',
  addressComplement: '',
  district: '',
  city: '',
  stateCode: '',
  website: '',
  businessSegment: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
};

function operationKey(): string {
  const key = 'wandora.company-onboarding-operation-v1';
  const current = sessionStorage.getItem(key);
  if (current) return current;
  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}

export function CompanyOnboardingPage() {
  const { authFetch, getAccountEmail, retryBootstrap, signOut } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [lookup, setLookup] = useState<'cep' | 'cnpj' | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getAccountEmail()
      .then((email) => {
        if (active) setDraft((current) => ({ ...current, contactEmail: email }));
      })
      .catch(() => {
        if (active) setError('Não foi possível confirmar o e-mail desta conta. Entre novamente.');
      });
    return () => { active = false; };
  }, [getAccountEmail]);

  const taxIdValid = useMemo(() => !draft.taxId || validTaxId(draft.entityType, draft.taxId), [draft.entityType, draft.taxId]);
  const postalValid = useMemo(() => !draft.postalCode || validPostalCode(draft.postalCode), [draft.postalCode]);

  const patch = (values: Partial<Draft>) => setDraft((current) => ({ ...current, ...values }));

  const lookupCep = async () => {
    if (!validPostalCode(draft.postalCode)) {
      setError('Informe um CEP válido antes da consulta.');
      return;
    }
    const cep = onlyDigits(draft.postalCode);
    setLookup('cep');
    setError(null);
    try {
      const response = await authFetch('/api/v1/onboarding/lookup/cep/' + cep);
      if (!response.ok) throw new Error('lookup-unavailable');
      const data = await response.json() as { found: boolean; stateCode?: string; city?: string; district?: string; street?: string };
      if (!data.found) {
        setError('CEP não encontrado. Você pode preencher o endereço manualmente.');
        return;
      }
      patch({
        postalCode: cep,
        stateCode: data.stateCode ?? draft.stateCode,
        city: data.city ?? draft.city,
        district: data.district ?? draft.district,
        addressLine1: data.street ?? draft.addressLine1,
      });
    } catch {
      setError('A consulta de CEP está indisponível. O cadastro pode continuar manualmente.');
    } finally {
      setLookup(null);
    }
  };

  const lookupCnpj = async () => {
    if (draft.entityType !== 'pj' || !validTaxId('pj', draft.taxId)) {
      setError('Informe um CNPJ válido antes da consulta.');
      return;
    }
    const cnpj = normalizeCnpj(draft.taxId);
    setLookup('cnpj');
    setError(null);
    try {
      const response = await authFetch('/api/v1/onboarding/lookup/cnpj/' + encodeURIComponent(cnpj));
      if (!response.ok) throw new Error('lookup-unavailable');
      const data = await response.json() as {
        found: boolean;
        legalName?: string;
        displayName?: string;
        postalCode?: string;
        stateCode?: string;
        city?: string;
        district?: string;
        street?: string;
        addressNumber?: string;
        addressComplement?: string;
        phone?: string;
        email?: string;
        businessSegment?: string;
      };
      if (!data.found) {
        setError('O CNPJ é válido, mas a consulta cadastral não encontrou dados. Preencha manualmente.');
        return;
      }
      patch({
        taxId: cnpj,
        legalName: data.legalName ?? draft.legalName,
        organizationDisplayName: data.displayName || data.legalName || draft.organizationDisplayName,
        postalCode: data.postalCode ?? draft.postalCode,
        stateCode: data.stateCode ?? draft.stateCode,
        city: data.city ?? draft.city,
        district: data.district ?? draft.district,
        addressLine1: data.street ?? draft.addressLine1,
        addressNumber: data.addressNumber ?? draft.addressNumber,
        addressComplement: data.addressComplement ?? draft.addressComplement,
        phone: data.phone ?? draft.phone,
        businessSegment: data.businessSegment ?? draft.businessSegment,
      });
    } catch {
      setError('O CNPJ é válido, mas a consulta cadastral está indisponível. O cadastro pode continuar manualmente.');
    } finally {
      setLookup(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!validTaxId(draft.entityType, draft.taxId)) {
      setError(draft.entityType === 'pj' ? 'CNPJ inválido.' : 'CPF inválido.');
      return;
    }
    if (!validPostalCode(draft.postalCode)) {
      setError('CEP inválido.');
      return;
    }
    setSaving(true);
    try {
      const response = await authFetch('/api/v1/onboarding/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operationKey() },
        body: JSON.stringify({
          ...draft,
          taxId: draft.entityType === 'pj' ? normalizeCnpj(draft.taxId) : onlyDigits(draft.taxId),
          postalCode: onlyDigits(draft.postalCode),
          addressComplement: draft.addressComplement.trim() || null,
          website: draft.website.trim() || null,
          businessSegment: draft.businessSegment.trim() || null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        if (response.status === 409) throw new Error('Esta conta já está vinculada a outra empresa. Atualize a sessão.');
        if (response.status === 503) throw new Error('O cadastro da empresa está temporariamente indisponível.');
        throw new Error(body?.error === 'invalid-company-profile' ? 'Revise os dados informados.' : 'Não foi possível concluir o cadastro.');
      }
      sessionStorage.removeItem('wandora.company-onboarding-operation-v1');
      await retryBootstrap();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir o cadastro.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'h-11 rounded-xl border-2 border-[#09090b]/20 bg-white px-3 text-sm outline-none focus:border-[#09090b]';

  return (
    <main className="min-h-screen bg-[#f5f2ea] px-4 py-8 text-[#09090b] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#09090b] bg-[#d2e823] px-3 py-1 text-xs font-black">
              <Building2 className="size-4" /> primeiro acesso
            </div>
            <h1 className="wandora-display m-0 mt-4 text-[clamp(2rem,5vw,4rem)] leading-[.95]">VAMOS PREPARAR SUA EMPRESA.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#09090b]/60">
              Esses dados formam o perfil oficial da empresa na Wandora. Funcionários, ferramentas e automações continuam separados e não são criados por este cadastro.
            </p>
          </div>
          <button type="button" onClick={() => void signOut()} className="rounded-xl border-2 border-[#09090b] bg-white px-3 py-2 text-xs font-black">Sair</button>
        </div>

        <form onSubmit={submit} className="grid gap-5">
          <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 sm:p-6">
            <h2 className="m-0 text-lg font-black">Identidade</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold">Tipo
                <select value={draft.entityType} onChange={(e) => patch({ entityType: e.target.value as CompanyEntityType, taxId: '' })} className={inputClass}>
                  <option value="pj">Pessoa jurídica</option><option value="pf">Pessoa física</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold">{draft.entityType === 'pj' ? 'CNPJ' : 'CPF'}
                <div className="flex gap-2">
                  <input required value={draft.taxId} onChange={(e) => patch({ taxId: e.target.value })} className={inputClass + ' min-w-0 flex-1'} />
                  {draft.entityType === 'pj' ? (
                    <button aria-label="Consultar CNPJ" type="button" onClick={() => void lookupCnpj()} disabled={lookup !== null} className="grid size-11 place-items-center rounded-xl border-2 border-[#09090b] bg-white disabled:opacity-40">
                      {lookup === 'cnpj' ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                    </button>
                  ) : null}
                </div>
                {!taxIdValid ? <span className="text-[11px] text-red-700">Formato ou dígitos verificadores inválidos.</span> : null}
              </label>
              <label className="grid gap-1.5 text-xs font-bold">Nome que aparece na Wandora<input required value={draft.organizationDisplayName} onChange={(e) => patch({ organizationDisplayName: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">{draft.entityType === 'pj' ? 'Razão social' : 'Nome completo'}<input required value={draft.legalName} onChange={(e) => patch({ legalName: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Responsável<input required value={draft.responsibleName} onChange={(e) => patch({ responsibleName: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">E-mail da conta<input required readOnly type="email" value={draft.contactEmail} className={inputClass + ' bg-[#f5f2ea] text-[#09090b]/65'} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Telefone / WhatsApp<input required value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Segmento (opcional)<input value={draft.businessSegment} onChange={(e) => patch({ businessSegment: e.target.value })} className={inputClass} /></label>
            </div>
          </section>

          <section className="rounded-3xl border-[2.5px] border-[#09090b] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2"><MapPin className="size-5" /><h2 className="m-0 text-lg font-black">Endereço</h2></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold">CEP
                <div className="flex gap-2">
                  <input required value={draft.postalCode} onChange={(e) => patch({ postalCode: e.target.value })} className={inputClass + ' min-w-0 flex-1'} />
                  <button aria-label="Consultar CEP" type="button" onClick={() => void lookupCep()} disabled={lookup !== null} className="grid size-11 place-items-center rounded-xl border-2 border-[#09090b] bg-white disabled:opacity-40">
                    {lookup === 'cep' ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                  </button>
                </div>
                {!postalValid ? <span className="text-[11px] text-red-700">CEP deve ter 8 dígitos.</span> : null}
              </label>
              <label className="grid gap-1.5 text-xs font-bold">UF<input required maxLength={2} value={draft.stateCode} onChange={(e) => patch({ stateCode: e.target.value.toUpperCase() })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Logradouro<input required value={draft.addressLine1} onChange={(e) => patch({ addressLine1: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Número<input required value={draft.addressNumber} onChange={(e) => patch({ addressNumber: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Bairro<input required value={draft.district} onChange={(e) => patch({ district: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Cidade<input required value={draft.city} onChange={(e) => patch({ city: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Complemento (opcional)<input value={draft.addressComplement} onChange={(e) => patch({ addressComplement: e.target.value })} className={inputClass} /></label>
              <label className="grid gap-1.5 text-xs font-bold">Site (opcional)<input value={draft.website} onChange={(e) => patch({ website: e.target.value })} className={inputClass} /></label>
            </div>
          </section>

          {error ? <div className="rounded-2xl border-2 border-red-800 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}

          <section className="flex flex-col gap-3 rounded-3xl border-[2.5px] border-[#09090b] bg-[#09090b] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 text-[#d2e823]" /><p className="m-0 max-w-xl text-sm leading-6 text-white/65">CPF/CNPJ e CEP são validados localmente. A consulta externa só ajuda a preencher dados e pode falhar sem bloquear um cadastro válido. Nenhum funcionário, integração ou envio é criado aqui.</p></div>
            <button disabled={saving || !taxIdValid || !postalValid} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d2e823] px-5 text-sm font-black text-[#09090b] disabled:opacity-40">
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}{saving ? 'Preparando…' : 'Preparar minha empresa'}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
