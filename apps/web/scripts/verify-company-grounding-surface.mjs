import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = await readFile(
  new URL('../src/pages/CompanyPage.tsx', import.meta.url),
  'utf8',
);

assert(source.includes('/grounding'), 'company_grounding_read_contract_missing');
assert(source.includes('/retire'), 'company_grounding_retire_contract_missing');
assert(source.includes('/correct'), 'company_grounding_correction_contract_missing');
assert(source.includes("'Idempotency-Key'"), 'company_grounding_idempotency_missing');
assert(source.includes('resolveGroundingCreateOperation'), 'company_grounding_persisted_create_idempotency_missing');
assert(source.includes('operation.idempotencyKey'), 'company_grounding_create_key_reuse_missing');
assert(source.includes('clearGroundingCreateOperation'), 'company_grounding_create_clear_missing');
assert(!source.includes("mutationKey('create')"), 'company_grounding_create_random_key_per_retry_forbidden');
assert(source.includes("activeOrganization?.role === 'owner'"), 'company_grounding_owner_gate_missing');
assert(source.includes("activeOrganization?.role === 'admin'"), 'company_grounding_admin_gate_missing');
assert(source.includes('Acesso somente leitura'), 'company_grounding_member_read_only_missing');
assert(source.includes('Fatos oficiais da empresa'), 'company_grounding_facts_surface_missing');
assert(source.includes('Regras da Casa'), 'company_grounding_house_rules_surface_missing');
assert(source.includes('CORRIGIR SEM APAGAR O PASSADO.'), 'company_grounding_history_semantics_missing');
assert(source.includes('Itens retirados'), 'company_grounding_retired_history_missing');
assert(source.includes("provenanceType: input.approvedSource ? 'approved_source' as const : 'owner_statement' as const"), 'company_grounding_provenance_contract_missing');
assert(source.includes("sourceRef: input.sourceRef.trim() || null"), 'company_grounding_owner_statement_source_evidence_missing');
assert(source.includes("required={draft.approvedSource}"), 'company_grounding_approved_source_reference_required_missing');
assert(source.includes("Referência de evidência"), 'company_grounding_evidence_field_missing');
assert(!source.includes('{entry.provenance.sourceRef}'), 'company_grounding_source_ref_must_not_render');
assert(!source.includes('paperclip'), 'company_grounding_provider_name_leaked');
assert(!source.includes('mastra'), 'company_grounding_runtime_provider_name_leaked');
assert(!source.includes('supabase'), 'company_grounding_direct_data_provider_leaked');
assert(!source.includes('DELETE'), 'company_grounding_hard_delete_surface_forbidden');

console.log('WANDORA_WEB_COMPANY_GROUNDING_SURFACE_V1_OK');
