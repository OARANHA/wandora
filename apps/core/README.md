# Wandora Core

`apps/core` owns Wandora business semantics and authorization. It is the customer-product layer allowed to coordinate canonical data, the Agent Runtime, Messaging Gateway and approval/policy boundaries.

The first promoted workflow is **Ana — Assistente Comercial Digital / inbound new contact V1**. Core now also owns the authenticated human read APIs used by Wandora Web.

## Current responsibilities

Core currently owns these production paths:

1. supervised provider-neutral inbound ingestion from Messaging Gateway;
2. canonical contact/conversation/message/work persistence;
3. deterministic Mastra proposal generation behind the Wandora-owned `AgentRuntime` adapter;
4. canonical `wandora.work_proposals` persistence for `commitment=none` proposals;
5. human Supabase ES256/JWKS session verification;
6. external Auth subject → canonical Wandora user resolution;
7. active organization + active membership authorization;
8. tenant-scoped customer reads for `Trabalho`, `Conversas` list and canonical conversation history.

The outbound-capable domain package is **not** the production Gateway entry point. The live Gateway ingress uses the narrower supervised service so the current `supervised` autonomy mode cannot be bypassed merely because outbound-capable code exists elsewhere.

## Safety boundaries

- No provider/runtime ID becomes a customer-facing Wandora identity.
- Unknown delivery state becomes `delivery-uncertain`; Core does not auto-resend.
- Discount, special price, delivery deadline, payment terms and contractual commitments require the stronger approval boundary.
- `owner`/`admin` may decide the currently reviewed V1 commitment approvals; another tenant cannot.
- Browser clients do not receive direct grants to Core-owned workflow/private state.
- Transactional facts live in PostgreSQL, not only in model memory.
- The live supervised ingress does not enable autonomous outbound traffic.
- Human read routes remain read-only; reply/send/edit-send/dismiss/takeover require separate reviewed contracts.

## Gateway → Core supervised ingress

ADR 0012 defines the production-shaped inbound boundary:

- private route `POST /internal/v1/gateway/inbound`;
- disabled unless explicitly configured;
- available only in database mode when `WANDORA_GATEWAY_INGRESS_ENABLED=true`;
- Gateway secret loaded only from `WANDORA_GATEWAY_INGRESS_SECRET_FILE`;
- HMAC-SHA256 signature over `<unix-seconds>.<raw-body>`;
- request timestamp must be within five minutes;
- only Wandora-normalized/canonical organization, connection and inbound-text fields are accepted.

The private Docker network is not caller authentication. A valid HMAC proves the caller holds the dedicated Gateway secret; transaction-local tenant scope plus RLS independently prove that the supplied canonical connection belongs to the supplied organization.

A new supervised inbound event persists canonical contact/conversation/message/work/audit state, produces a safe proposal, moves the work item to `attention-required` and completes the durable receipt with `supervision-required`.

The controlled production cutover and real handset proof completed on 2026-09-15 with zero approvals and zero outbound attempts. See `docs/infra/messaging-gateway-supervised-live-v1.md`.

A completed duplicate returns the stored durable result. Invalid/stale authentication fails before durable state. When the ingress feature is not configured, the private route returns 404.

## Deterministic Mastra supervised proposal

ADR 0014 introduces the Core → Agent Runtime Adapter → Mastra integration without a model-provider credential.

Activation is explicit:

```text
WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic
```

The default is `disabled`. Deterministic mode is valid only in database mode with the authenticated supervised Gateway ingress enabled.

Only normalized customer text crosses into the Mastra workflow. Organization IDs, phone/customer address, connection IDs and provider IDs are not Mastra workflow input. Mastra-specific workflow/run metadata does not cross the Wandora adapter boundary.

ADR 0016 superseded the earlier receipt-only proposal representation. A safe `commitment=none` result is now persisted canonically in `wandora.work_proposals` in the same transaction that leaves work at `attention-required` and completes the receipt as `supervision-required`.

This current path deliberately creates:

- one canonical safe proposal when applicable;
- no approval row for `commitment=none`;
- no outbound-attempt row;
- no outbound message;
- no real model-provider call.

Stronger commercial commitments remain on `wandora.approvals`.

The Compose activation overlay is `infra/stacks/core/compose.agent-runtime-deterministic.yaml`.

## Model-backed supervised assigned work

ADR 0142 introduces a second Agent Runtime mode for Paperclip-assigned internal work without changing the supervised inbound/WhatsApp path:

```text
WANDORA_AGENT_RUNTIME_MODE=mastra-supervised-model
```

V1 approves only:

```text
provider = mistral
model    = mistral-small-2603
base URL = https://api.mistral.ai/v1
logical customer-facing model = wandora-supervised-v1
```

The provider credential is read only from the absolute mounted file configured by `WANDORA_MODEL_API_KEY_FILE`; it is never committed, logged or passed in browser/customer contracts. The reviewed Compose overlay is `infra/stacks/core/compose.agent-runtime-model.yaml`.

The model-backed runtime is deliberately asymmetric:

- `proposeCommercialReply(...)` delegates to the existing deterministic runtime, so inbound customer/WhatsApp content does not gain model-provider egress from this slice;
- only `executeAssignedTask(...)`, reached through the authenticated Paperclip execution bridge for an already-active supervised employee, calls the external model;
- assigned work enters the model through the provider-neutral grounding snapshot `officialFacts[] + houseRules[] + workContext`;
- only active official Wandora facts/rules are projected; retired entries are excluded and unknown information remains unknown;
- work title/description stays inside `workContext` and never becomes official truth merely by reaching the model;
- the projection is tenant-scoped/read-only and fails closed before durable work preparation if grounding cannot be loaded;
- Wandora organization/employee IDs, grounding row IDs, Paperclip IDs/run tokens, customer address/phone and provider-control metadata do not enter the model prompt;
- model output is schema-validated to one bounded internal `summary`;
- `maxOutputTokens=768`, model request timeout = 45 seconds and automatic model retries = 0;
- `wandora_mastra` bridge timeout = 60 seconds, so Core is expected to terminate first;
- Human Send and Gateway outbound remain separate capabilities and are not enabled by model-backed execution.

Provider/model identity remains operational metadata. Customer work results expose the logical Wandora model identifier `wandora-supervised-v1`, not the concrete model vendor/model name.

ADR 0171 adds only this read projection. It does not make Core a RAG, memory, retrieval, vector, embedding, chunking or generic context-assembly engine. The execution-bridge readiness check now also requires the migration-017 grounding read boundary before reporting ready.

## Semantic Fast Read product selector runtime

ADR 0293 composes the ADR 0292 semantic product selector into Human Fast Read without making Mastra/Mistral part of the customer contract.

Runtime activation remains layered and disabled by default:

```text
WANDORA_SEMANTIC_FAST_READ_ENABLED=false
WANDORA_SEMANTIC_SELECTOR_ENABLED=false
```

When a future separately authorized environment enables the selector gate, Core reuses the platform-owned file-backed `WANDORA_MODEL_API_KEY_FILE` credential and instantiates the qualified `MastraMistralSemanticSelectorProvider`. No selector-specific secret store or provider registry exists.

Optional selector timeout:

```text
WANDORA_SEMANTIC_SELECTOR_TIMEOUT_MS=3000
```

Allowed range is 250..10000 ms. Provider/model details remain internal runtime configuration. Missing selector configuration, provider uncertainty or invalid selector output remains fail-closed before the signed Fast Read intent can authorize an ERP read.

This runtime wiring does not connect WhatsApp to Fast Read and does not authorize a live provider/VendaERP call or production activation.

## Human session and read APIs

ADRs 0017–0021 define the current customer human read boundary.

Supabase Auth remains identity/session infrastructure. Core validates Bearer access tokens with public ES256/JWKS plus issuer, audience and time checks. Core does not receive `service_role` or JWT signing material merely to validate human sessions.

The external JWT `sub` is resolved through narrow Core-owned database functions to canonical Wandora identity. Browser-supplied organization/conversation IDs are selectors only; tenant access still requires active organization + active membership under transaction-local `wandora.organization_id` and RLS.

Current reviewed routes are:

```text
GET /api/v1/me
GET /api/v1/organizations/:organizationId/work/attention-required
GET /api/v1/organizations/:organizationId/conversations
GET /api/v1/organizations/:organizationId/conversations/:conversationId
```

Current failure semantics:

- missing/invalid token: `401`;
- Auth/JWKS unavailable where applicable: `503`;
- valid but unlinked external identity: `403`;
- cross-tenant/suspended membership/suspended organization: `403`;
- malformed selector or conversation absent from an already-authorized organization: `404`;
- unreviewed route: `404`;
- unexpected server/database failure: `500`.

`/api/v1/me` returns only canonical user plus active organizations. The work route returns only supervision context/proposal needed by `Trabalho`. The conversations list returns bounded conversation summaries. The detail route returns up to the latest 100 canonical messages oldest → newest plus `hasEarlierMessages`, under `REPEATABLE READ READ ONLY` tenant-scoped transactions.

The detail route authorizes the organization before conversation lookup. A foreign or nonexistent conversation under an authorized organization is therefore exposed only as generic `404`.

Provider/private identifiers, private receipts, provider bindings, outbound-attempt state and Mastra runtime IDs do not cross these customer contracts. Conversation detail also omits message IDs because the current read-only contract has no customer action requiring them.

## Database runtime boundary

`wandora_core_runtime` is the least-privilege PostgreSQL identity for Core. It has no `BYPASSRLS`, database/role administration or provider-binding access.

Every organization-scoped repository transaction sets `wandora.organization_id` transaction-locally before tenant-owned queries. PostgreSQL RLS provides defense in depth and tenant scope disappears automatically after commit/rollback, including when pool connections are reused.

Human tenant reads use `REPEATABLE READ READ ONLY` so multi-query projections remain internally consistent and PostgreSQL itself rejects accidental writes inside that read transaction class.

Migration `003` creates the role disabled by default. Production later activated it through a separate reviewed operation with a dedicated credential and `CONNECTION LIMIT 4`; the migration itself does not embed a production password.

Canonical audit writes go through the reviewed Core audit boundary; the runtime does not receive broad audit-table mutation rights.

### Database secret file

The production container remains the non-root image `node` user. A host-managed database-password file must not rely on host UID ownership alone.

Use these rules for database activation/recreation:

- keep the secret outside Git/chat and outside container environment variables;
- store it in an operator-controlled directory;
- mode the secret `0640` or stricter, never world-readable;
- keep the file group-owned by the intended operator group;
- set `WANDORA_CORE_SECRET_GID` to that group's numeric GID when applying `compose.database.yaml`;
- the overlay adds only that numeric group as a supplemental group to the non-root Core process;
- use the canonical host file `wandora_core_db_password`; do not substitute the legacy `core-db-password` filename.

A Conversations Read V1 candidate using the legacy filename failed readiness while the live service remained healthy; correcting only the candidate path restored `readyz=200`. No production credential was changed.

## Private runtime process

`src/runtime/main.ts` is the deployable private Core process.

Operational endpoints:

```text
GET /healthz
GET /readyz
```

The process can start in explicit `standby` mode without a database secret. Database mode accepts only the canonical `wandora_core_runtime` user and reads its password from a mounted secret file. Readiness becomes green only when PostgreSQL confirms the expected role and an unscoped pooled connection.

The private runtime has no public hostname or published host port. Customer human routes reach it only through the exact allow-listed Web Nginx bridge.

Current production image:

```text
wandora/core:conversation-history-2105f6e3
```

See `docs/infra/conversation-history-live-v1.md` for the current activation proof.

## Verification

From repository root:

```bash
./apps/core/scripts/verify-ana-v1.sh
```

The verifier uses disposable `supabase/postgres:17.6.1.136` plus pinned Node 22.23.2, applies reviewed migrations, runs SQL invariants/read-only production verifiers, strict TypeScript and integration tests, then destroys the disposable environment.

The test harness separates fixture administration from the actual runtime identity. Application behavior is executed as `wandora_core_runtime`. Core CI also validates the reviewed runtime overlays and human-route behavior.

Before promoting a human-read change, additionally prove the exact route, tenant denial cases, provider/private-field absence, no outbound side effect and private candidate readiness before production recreation.

Any future human response action is a separate outbound-effect boundary and must define authorization, canonical proposal relationship, idempotency, audit evidence and delivery uncertainty/reconciliation before production activation.
