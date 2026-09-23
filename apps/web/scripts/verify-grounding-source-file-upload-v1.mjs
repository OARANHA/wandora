import { readFileSync } from 'node:fs';

const storage = readFileSync(new URL('../src/groundingSourceStorage.ts', import.meta.url), 'utf8');
const company = readFileSync(new URL('../src/pages/CompanyPage.tsx', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(storage.includes("organization-grounding-sources"), 'grounding_source_bucket_missing');
assert(storage.includes("wandora:grounding-source:v1:"), 'grounding_source_provider_neutral_ref_missing');
assert(storage.includes("10 * 1024 * 1024"), 'grounding_source_size_limit_missing');
for (const mime of [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
]) {
  assert(storage.includes(mime), 'grounding_source_mime_missing:' + mime);
}
assert(storage.includes("crypto.subtle.digest('SHA-256'"), 'grounding_source_sha256_missing');
assert(storage.includes("'x-upsert': 'false'"), 'grounding_source_immutable_upload_missing');
assert(storage.includes("/storage/v1/object/authenticated/"), 'grounding_source_private_download_route_missing');
assert(storage.includes("function storageUploadUrl"), 'grounding_source_upload_route_missing');
assert(storage.includes('verifyExistingObject'), 'grounding_source_ambiguous_retry_verification_missing');
assert(storage.includes('actualSha256 !== descriptor.sha256'), 'grounding_source_download_integrity_missing');
assert(!storage.includes('service_role'), 'grounding_source_service_role_forbidden');
assert(!storage.includes('/object/public/'), 'grounding_source_public_object_forbidden');

assert(company.includes('type="file"'), 'grounding_source_file_input_missing');
assert(company.includes('GROUNDING_SOURCE_ACCEPT'), 'grounding_source_accept_filter_missing');
assert(company.includes('uploadGroundingSourceFile'), 'grounding_source_upload_adapter_missing');
assert(company.includes('downloadGroundingSourceFile'), 'grounding_source_download_adapter_missing');
assert(company.includes('Baixar arquivo'), 'grounding_source_download_action_missing');
assert(company.includes('Corrigir / anexar'), 'grounding_source_versioned_attachment_action_missing');
assert(company.includes('sourceFile: File | null'), 'grounding_source_draft_file_state_missing');
assert(company.includes("provenanceType: approvedSource ? 'approved_source'"), 'grounding_source_create_provenance_missing');
assert(company.includes("'/correct'"), 'grounding_source_correction_association_missing');

console.log('WANDORA_WEB_GROUNDING_SOURCE_FILE_UPLOAD_V1_OK');

[executed on device: wandora-vps-01 (d266af26-d31e-4f0c-9840-ca03bb02b603)]