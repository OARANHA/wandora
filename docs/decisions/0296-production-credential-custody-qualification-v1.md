# ADR 0296 — Production Credential Custody Qualification V1

Date: 2026-09-26

Status: **PARTIAL / BLOCKED ON OPERATOR CUSTODY COMPLETION / NO ACTIVATION / NO PRODUCTION EFFECT**

## Objective

Qualify the production credential-custody prerequisites left by ADR 0295 without activating Semantic Fast Read, changing runtime composition, calling a provider or reading any secret value.

This slice is deliberately narrower than the future immediate pre-mutation attestation. Fresh rollback evidence, Task Drain/quiescence, final live Core/Paperclip/Organization Adapter state and final artifact readback remain freshness-sensitive and are not captured here as deployment authorization.

Permanent guardrail:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## REAL NOW

Repository/GitHub reconciliation before the custody review proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open / draft / mergeable;
- PR #369 source head before this documentation checkpoint was `99fd0f6dfb6382fd706a0216449d924a9b0d0bf5`;
- its GitHub merge ref was `95d97d89f9b4c5607c7fb595fe6c6ae7c3d52512`;
- all **17/17** PR workflows on that source head were GREEN;
- PR #370 remained a separate documentation slice at `11fd59599b21493a0fe335f4c32354989a6083a2`, with its four workflows GREEN.

The exact ADR 0295 Paperclip artifact remains available:

- artifact ID: `10914008713`;
- name: `paperclip-v2026.916.1-fast-read-production-candidate-fd4d9373d3d7e4d9eca202abdf075fde8feeb8d0`;
- expired: `false`;
- artifact ZIP digest: `sha256:e43acc85e3f7f010b7189f11bd9c3622f9a7a9015765a50f315ca61a98c36a19`;
- expiry observed: `2026-10-03T19:39:15Z`.

This readback does not promote any later rebuild. ADR 0295 remains authoritative that the exact archived bytes, not a nominally identical rebuild, are the promotion unit.

## PROVEN EVIDENCE

### 1. TypeSafe/System One credential purpose is qualified

ADR 0287 qualifies the Core semantic provider as the official TypeSafe System One HTTPS API:

`POST https://api.typesafe.ai/v1/systemone`

with HTTP Bearer API-key authentication.

The production JEV service was inspected without reading the provider key. Its systemd unit separates MCP OAuth material from the TypeSafe provider credential and configures:

`TYPESAFE_API_KEY_FILE=/opt/wandora/ops-workspace/jev-mcp/data/prod/typesafe_api_key`

The service implementation independently proves that this provider file is consumed by `callSystemOne(...)`, which performs `POST /v1/systemone` with `Authorization: Bearer <provider-key>`. MCP inbound OAuth uses a separate `requireBearer` boundary.

Therefore the file's **purpose** is qualified as a real TypeSafe/System One provider Bearer credential. It is not merely a JEV MCP OAuth credential.

### 2. Existing TypeSafe physical custody is not a Core custody contract

Metadata-only stat of the current JEV provider credential proved:

- mode: `0600`;
- owner: `wandora-exec`;
- group: `ops-mcp`;
- type: regular file.

No secret bytes were read or emitted.

That custody is intentionally service-local. It is not directly readable through the Core runtime's existing supplemental group/custody boundary and must not be made cross-service by chmod, ownership widening or an ad-hoc bind.

The approved Core contract therefore remains the ADR 0295 file-backed mount:

`WANDORA_TYPESAFE_JEV_API_KEY_FILE_HOST -> /run/secrets/wandora/typesafe-jev.api-key:ro`

but the **Core-side production file material/custody is not yet installed or qualified**.

A future operator step may use a dedicated provider-issued System One key or a securely transferred equivalent provider credential, but no value may be copied through Git/chat/logs and the existing JEV file must not be weakened merely for reuse.

### 3. Distinct Fast Read intent HMAC remains required and is not yet created

ADR 0295 and Core runtime validation require the Wandora-owned `wfri1` signing HMAC to be distinct from:

- Gateway ingress HMAC;
- Core outbound HMAC;
- Paperclip execution-bridge HMAC;
- Organization Adapter HMAC.

The reviewed future mount remains:

`WANDORA_FAST_READ_INTENT_SECRET_FILE_HOST -> /run/secrets/wandora/fast-read-intent.hmac:ro`

The current Remote-Ops target deliberately does **not** allow writes to `/opt/wandora/stacks/core/secrets`. Creating the HMAC in `ops-workspace`, widening the Remote-Ops allowlist, or weakening the Core custody directory simply to finish this slice would create the wrong authority boundary.

Therefore the HMAC creation/metadata qualification is **blocked on an authorized operator-local Core custody step**. No HMAC was generated, printed, moved or mounted by this ADR.

### 4. Existing Mistral purpose remains qualified; exact current file metadata is not re-attested

ADR 0144 and ADR 0293 remain authoritative that the existing Mistral credential is a Wandora platform-owned provider secret and is purpose-compatible with the semantic selector. No selector-specific Mistral secret is justified.

Safe Docker inspection confirms the live Core still has the existing host file bound read-only to:

`/run/secrets/wandora/model-provider.api-key`

and the Core process receives the existing supplemental group used for operator-managed secret readability.

However, exact current owner/group/mode of the host file could not be re-read:

- the execution agent receives `PermissionError` below the `0700` Core secret directory;
- the read-only production target correctly returns `SECRET_PATH_DENIED` for that secret path.

The directory itself was metadata-only statted as:

- mode: `0700`;
- owner: `wandora-admin`;
- group: `wandora-ops`.

Historical ADR evidence records the Mistral file as `0640 wandora-admin:wandora-ops`, but this ADR does **not** substitute historical evidence for a current exact metadata readback.

The required current file metadata-only `stat` remains an operator-local prerequisite. The secret value must not be read.

### 5. Capability Authority / Reuse Gate

No new Wandora secret manager, provider registry, lifecycle, run mirror, retry engine, credential database or operational state machine is justified.

Authority remains:

- Wandora: semantic/product/effect authority and the `wfri1` signing secret purpose;
- Paperclip: workforce/run/tools/Connections/grants/secrets/audit operational authority;
- TypeSafe/System One: replaceable semantic-route provider;
- Mastra/Mistral: replaceable selector/runtime implementation;
- operator-controlled host files: current deployment custody mechanism for Wandora platform secrets.

The provider Exit Test remains PASS: replacing TypeSafe or Mistral changes provider adapter/configuration/credential binding, not customer-facing Wandora semantics.

## Decision

The refined decision is:

1. accept the existing JEV TypeSafe credential **purpose** as qualified evidence for the System One API;
2. reject directly mounting/repermissioning the JEV-owned `0600` file into Core;
3. preserve the ADR 0295 Core-side file-backed custody boundary and require an authorized operator-local installation/readback before activation;
4. create the distinct `wfri1` HMAC only inside that canonical Core custody boundary;
5. require metadata-only current `stat` for both the new HMAC and existing Mistral secret;
6. preserve exact Paperclip artifact `10914008713` as the frozen candidate;
7. do not capture freshness-sensitive pre-mutation evidence in this slice.

## Second adversarial review

The initial JEV review returned `deep_review`:

- deep_review: 0.57;
- proceed_fast: 0.24;
- split_task: 0.13;
- block: 0.06.

The deep review then proved the service-local TypeSafe custody and the Remote-Ops/secret-path restrictions above.

A second independent review of the refined decision returned:

- **block: 0.94**;
- deep_review: 0.04;
- proceed_fast: 0.01;
- split_task: 0.01.

The block is accepted. Completing HMAC/Mistral custody by bypassing those restrictions would weaken the reviewed authority boundary.

JEV remains advisory; the deterministic repository/runtime guardrails independently produce the same safe result.

## Production effect

None.

This slice did **not**:

- deploy or recreate a container;
- change Compose/runtime flags;
- promote Core/Paperclip/Organization Adapter;
- create/move/read a production credential value;
- widen Remote-Ops permissions;
- call TypeSafe/System One;
- call Mistral;
- call VendaERP;
- send WhatsApp/customer traffic;
- enable Human Send or Gateway outbound;
- change Task Drain.

Read-only runtime observations made during the custody deep review are **not** the future immediate pre-mutation attestation and must not be reused as such.

## Result

**PARTIAL / BLOCKED ON OPERATOR CUSTODY COMPLETION / NO ACTIVATION / NO PRODUCTION EFFECT.**

Qualified now:

- exact TypeSafe/System One credential purpose;
- separation of MCP OAuth from provider API-key purpose;
- existing TypeSafe JEV-file metadata/custody;
- requirement for separate Core-side custody rather than permission widening;
- Mistral reuse/no-new-secret decision;
- exact ADR 0295 artifact availability/identity;
- no-new-secret-authority / no-secret-manager decision.

Still required before the future Immediate Pre-Mutation Attestation:

1. install the Core-side TypeSafe/System One credential through an authorized operator-controlled secret path without emitting the value;
2. generate/install a cryptographically random, distinct `wfri1` HMAC in the same Core custody boundary;
3. metadata-only read back owner/group/mode/type for those two files;
4. metadata-only read back current owner/group/mode/type for `wandora_model_provider_api_key`;
5. keep all new Fast Read/semantic gates OFF.

Only after this custody completion is independently documented may the project enter **Immediate Pre-Mutation Attestation + Effect Authorization**, where rollback, Task Drain/quiescence, final live component state and final artifact identity must be freshly captured immediately adjacent to the proposed mutation.
