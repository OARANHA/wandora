# Wandora — Canonical Architecture

## Purpose

This document describes the current Wandora architecture for the laboratory / early-beta foundation. Wandora boundaries remain provider-neutral even where a concrete implementation has been selected.

Authority order is `AGENTS.md` → accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → this document → `docs/CANONICAL_STATE.md` → component README/runbook.


## CI execution boundary

GitHub Actions remains the CI control plane. The private repository's normal Linux/Docker workflows execute on the repository-scoped runner `wandora-vps-01-ci`, labeled `[self-hosted, linux, x64, wandora-ci]`.

The runner shares the Wandora VPS kernel but not the production Docker authority:

- dedicated host identity `wandora-ci`;
- no host `docker`, `wandora-ops` or `sudo` membership;
- separate rootless Docker daemon, socket and image store;
- no mount or access to the production Docker socket;
- systemd denial for `/opt/wandora`, operator/root homes and production Docker socket paths;
- `NoNewPrivileges`, `PrivateDevices`, `ProtectSystem=strict`, `PrivateTmp=yes` and namespace restrictions;
- one repository runner job at a time;
- 300% CPU, 3 GiB memory-high, 4 GiB memory-max and 4096-task ceilings.

Because `PrivateTmp=yes` isolates the runner's `/tmp` namespace from the separate rootless Docker user service, any workflow file/directory that will be bind-mounted into CI Docker must be staged under GitHub's `RUNNER_TEMP` (with a non-GitHub `/tmp` fallback), not created in runner-private `/tmp`.

CI is never authorized to manage or introspect the production Docker control plane. Production deployment remains an explicit, separately reviewed operator effect.

## Product model

The customer should perceive a company operating with human and digital employees. Technical implementation details are intentionally hidden.

```text
Customer Wandora Web             Wandora Platform Admin
        \                           /
         \                         /
          -----> Wandora Core/API <-----
                    |
                    +--> Wandora-owned durable facts / Supabase PostgreSQL
                    +--> Organization Adapter -> Paperclip
                    +--> Agent Runtime Adapter -> Mastra
                    +--> Tool Gateway -> authenticated integrations
                    +--> Messaging Gateway -> Evolution / Meta / other providers
                    +--> Model Provider Gateway -> Mistral / Chutes / others
                    +--> Approval / Policy boundary
```

Wandora is not a CRM-with-AI and not a generic agent builder. Every material product/architecture decision follows **state real → proven evidence → gaps → capability authority/reuse gate → decision → second adversarial review → execution → validation** and must work both for the paying business customer and for the Wandora owner/operator.

The adversarial review is not a confirmation ritual. It deliberately searches for a concrete reason the first decision is wrong, too broad, unsafe, duplicated, irreversible or based on an unproven premise. Execution proceeds only if that challenge fails to invalidate the decision, and validation then proves the executed state rather than assuming it.

## Capability authority — contract ownership is not implementation ownership

Wandora owns its product vocabulary, stable public identifiers, authorization, policy, supervision, audit semantics and provider-neutral contracts. That does **not** imply that every underlying capability or state machine must be reimplemented inside Wandora Core/PostgreSQL.

Specialist components lend capabilities through Wandora-owned adapters:

- **Paperclip / Organization Adapter** — digital-employee organization/control-plane capability, subject to the adapter contract and failure/reconciliation proof;
- **Mastra / Agent Runtime Adapter** — agent/workflow/tool execution;
- **Evolution / Messaging Gateway** — WhatsApp transport;
- **Supabase** — identity/session and PostgreSQL/data infrastructure for Wandora-owned durable facts, mappings, projections, policy and audit state;
- **model providers** — model inference behind replaceable provider boundaries;
- **Docker/Portainer/Traefik/Cloudflare** — deployment/runtime/edge capability, not product-domain models.

Wandora may persist stable Wandora IDs, tenant ownership, provider mappings, policy, customer-facing projections, audit/reconciliation evidence and idempotency/version state required to make adapters safe and replaceable. It must not copy a provider's complete domain merely because the equivalent concept is absent from the local schema.

The mandatory ADR 0036 rule is:

> **Before adding a material table/entity/state machine/workflow/assignment/control-plane subsystem, first prove that the capability is Wandora-owned rather than already supplied by an accepted component.**

The existing beta tables for `digital_employees`, `work_items`, conversations, proposals and approvals are validated vertical-slice state and remain live. Their existence does **not** establish precedent for growing Wandora Core into a full Paperclip-like control plane. Any expansion must pass the Capability Authority / Reuse Gate.

See `docs/CAPABILITY_AUTHORITY.md` and ADR 0036.

## Wandora Web

The customer application is React 19 + Vite with TanStack Router/Query. Current navigation is `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

The browser never calls Paperclip, Mastra, Evolution, model providers or privileged database/admin capabilities directly.

The real customer session path is live. Supabase Auth provides identity/session; Wandora Core provides canonical identity, organization membership and business authorization. The shell derives the visible company/user from `/api/v1/me` rather than hard-coded preview identity.

`Equipe`, `Trabalho`, the `Conversas` list and the selected-conversation history use tenant-authorized Core reads. `Trabalho` also contains the reviewed two-step Human Send UI, but the live runtime currently keeps Human Send disabled unless an operator explicitly activates the accepted overlays.

Other customer surfaces may still contain preview/product-contract placeholders and must be converted only after their own reviewed Wandora contract exists and the Capability Authority / Reuse Gate identifies the correct underlying component.

### Browser authentication

The browser signs in directly against the stable Supabase Auth endpoint using only the public/publishable browser key. Public signup remains disabled. V1 stores session material in `sessionStorage`; closing the tab/browser removes the local persisted session.

A valid Auth session is not itself Wandora authorization. Web sends the Bearer token to Core, which resolves the external `sub` to a canonical Wandora user and authorizes active organization membership.

ADR 0089 implements the interrupted-invite recovery direction in Web/code proof only; it is **not deployed or live yet**. The customer recovery UX uses provider-native Supabase Auth `POST /recover` with the publishable browser key, returns to public `/recover-access`, strictly stages only an unexpired `type=recovery` provider session under a recovery-only browser key, and erases URL credentials before React renders. Invite and recovery pre-render handlers explicitly defer to each other's accepted flow type so one cannot consume the other's callback. Both flows reuse the same hardened authenticated `GET /user -> PUT /user -> password grant` reconciliation before normal Wandora session promotion. Recovery tokens remain Supabase Auth state; no Core recovery proxy/table or Auth-admin browser credential is part of the design. Before the first real recovery request, live anti-abuse controls must still be reviewed because provider CAPTCHA is currently disabled.

### Multi-organization selection

ADR 0024 is live.

- exactly one active organization may auto-select;
- multiple active organizations require an explicit human choice;
- the choice is stored only in `sessionStorage`;
- a stored selector is accepted only if it still appears in canonical `/api/v1/me`;
- sign-out clears the selector;
- organization IDs remain selectors only and Core independently reauthorizes every tenant request.

Platform administration and tenant administration remain separate trust planes. Membership in an internal proof tenant is explicit and does not imply platform-wide authorization.

### Web → Core network direction

Core remains private. There is no generic public Core hostname.

The live direction is:

```text
Browser
  -> https://app.wandora.com.br/api/v1/...
  -> Wandora Web Nginx
  -> private wandora-core network
  -> Wandora Core
```

The Web container joins `wandora-edge` and `wandora-core`. Its Nginx proxies only explicitly reviewed routes, forwards `Authorization`, strips browser cookies before Core and leaves unreviewed `/api/` plus all `/internal/` paths closed.

Current reviewed customer routes include:

```text
GET  /api/v1/me
GET  /api/v1/organizations/:organizationId/digital-employees
GET  /api/v1/organizations/:organizationId/work/attention-required
POST /api/v1/organizations/:organizationId/work/:workId/proposals/:proposalId/send
GET  /api/v1/organizations/:organizationId/conversations
GET  /api/v1/organizations/:organizationId/conversations/:conversationId
```

The POST route being present in the Web allow-list does not mean the capability is active. Core returns it unavailable while Human Send is disabled by runtime configuration.

`/internal/v1/gateway/inbound` and the private outbound Gateway route remain private and are not reachable through the customer Web.

## Wandora Platform Admin

ADR 0015 defines Wandora Platform Admin as the first-party owner/operator control plane. Customer administration and platform administration are separate trust planes.

Platform Admin controls Wandora and exercises specialist capabilities through the same Wandora-owned adapter boundaries. It is not a second Paperclip, Mastra Studio, Evolution Manager, Supabase Studio or Portainer.

Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio and Portainer remain protected engineering/diagnostic/emergency surfaces. They do not become the daily product operating model and are never required by customers.

## Wandora Core/API

Core owns **Wandora product semantics and business authorization**, including:

- organizations/tenants and stable Wandora selectors/identity;
- canonical human users, external identity mapping, memberships and roles;
- customer-facing digital-employee identity/policy projections needed by Wandora;
- contacts, conversations, supervised messaging semantics and current beta work state;
- canonical supervised proposals;
- human supervised-send authorization and confirmation versioning;
- approvals and policy decisions;
- audit-facing events;
- provider-neutral adapter contracts and orchestration.

This is product-contract ownership, not blanket implementation ownership. Digital-employee organization/control-plane expansion must be evaluated against Paperclip; execution belongs behind Mastra; messaging transport belongs behind the Messaging Gateway/Evolution boundary; identity/session/data infrastructure belongs behind Supabase boundaries.

Accepted boundaries now include ADR 0007 identity/tenancy, ADR 0009 durable Ana state, ADR 0010 least-privilege DB identity, ADR 0011 private runtime, ADR 0012 authenticated Gateway ingress, ADR 0014 Mastra deterministic runtime, ADR 0015 Platform Admin direction, ADR 0016 canonical supervised proposals, ADR 0017 Human Supervision Read V1, ADR 0018 Human Session Bootstrap V1, ADR 0019 Web Human Session V1, ADR 0020 Conversations Read V1, ADR 0021 Conversation Detail/History Read V1, ADR 0022 private Gateway outbound, ADR 0023 Human Send Proposal V1, ADR 0024 multi-organization selection, ADR 0025 private Evolution outbound Origin, ADR 0026 explicit human confirmation, ADR 0027 canonical confirmation V2, ADR 0028 supervised inbound active-work reuse, ADR 0034 state-first continuity, ADR 0035 Team Read V1 and ADR 0036 Capability Authority / Reuse Gate.

## Identity and human session — live

Supabase Auth issues human sessions. Its JWT `sub` is external identity data, not a Wandora business user ID.

Live Auth publishes an EC/ES256 key through its JWKS endpoint with:

```text
issuer: https://supabase.wandora.com.br/auth/v1
audience: authenticated
```

Human Core APIs validate Bearer access tokens using public JWKS plus issuer/audience/time checks. Core does **not** receive `service_role` or a JWT signing secret merely to validate sessions.

After cryptographic validation:

1. JWT `sub` resolves to canonical Wandora `user.id` through a narrow Core identity boundary;
2. `/api/v1/me` returns only canonical Wandora user plus active memberships in active organizations;
3. a browser-supplied organization ID is only a selector;
4. Core opens that organization scope under `wandora_core_runtime`;
5. active organization + active membership for the resolved user are required;
6. only then may the tenant operation proceed.

Invalid tokens, unknown identities, cross-tenant access, suspended membership and suspended organizations fail closed. A user with zero active organizations gets an explicit empty state; Web never silently selects between multiple active organizations.

## Core database runtime boundary

`wandora_core_runtime` remains the deployed Core PostgreSQL identity:

- no `BYPASSRLS`;
- no role/database administration;
- no provider-binding access;
- connection limit 4;
- secrets only through operator-controlled mounted files;
- each organization-scoped transaction sets `wandora.organization_id` transaction-locally;
- RLS independently enforces tenant isolation;
- pooled connections return unscoped after commit/rollback.

Do not replace this role with a broader Supabase role to simplify human API implementation.

## Core private runtime

Current live Core after the customer Team Read V1 promotion:

```text
container: wandora-core
image: wandora/core:team-read-b31db507
merged application source head: b31db507b225bb03ebd221c8f05b111fe100e25d
mode: database
agent runtime: mastra-deterministic
MASTRA_TELEMETRY_DISABLED: true
human API: enabled
Human Send Proposal: disabled by absence of enable flag
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
networks: wandora-core + wandora-data
published host ports: none
healthz: 200
readyz: 200
```

Current live Web is `wandora/web:team-read-b31db507`; Gateway remains `wandora/messaging-gateway:origin-fix-94cfb4de`. All three were healthy after the Team Read promotion and both external-effect switches remained absent/OFF.

The Core database secret is mounted from the canonical operator file `wandora_core_db_password`; a legacy host filename must not be substituted during recreate/candidate operations.

## Canonical business state

Supabase self-hosted provides PostgreSQL/Auth/data infrastructure. It is not the Wandora business backend and it is not automatically the owner of every capability's state.

Live Wandora-owned/current beta state includes:

- organizations, users, external identities and memberships;
- provider-neutral messaging connections;
- digital-employee Wandora identity/projection currently used by the proven beta slice;
- contacts;
- conversations;
- inbound/outbound messages;
- current qualification work items used by the proven beta slice;
- `work_proposals` for safe supervised employee proposals;
- approvals for stronger commitments;
- canonical audit records.

Private state includes provider bindings, normalized inbound receipts and outbound-attempt/idempotency state.

These live tables are preserved. **They do not authorize automatic expansion into a complete employee organization/control-plane model.** Before adding hiring, responsibility assignment, hierarchy, task/control-plane lifecycle or analogous concepts, ADR 0036 requires checking Paperclip and defining the Organization Adapter/minimal Wandora state first.

Browser clients do not read Core-owned workflow/proposal/private tables directly.

## Canonical supervised proposal boundary

ADR 0016 is live through migration `20260915_004_supervised_proposal_v1.sql`.

```text
Inbound customer message
      |
      v
work item -> Mastra deterministic proposal
      |
      v
wandora.work_proposals
      |
      +--> commitment must be none
      +--> exactly one per normalized inbound event
      +--> Core SELECT + INSERT only
      +--> authenticated direct DB access denied
      |
      v
work = attention-required
```

Proposal insertion, `attention-required` transition and receipt completion are one DB transaction. Stronger commitments such as discount, special price, delivery deadline, payment terms or contractual promises remain on `wandora.approvals`.

The private receipt continues to contain replay evidence, but it is not the product proposal model.

## Ana supervised inbound path

```text
Evolution webhook
      |
      v
Messaging Gateway
  -> verify provider JWT
  -> normalize supported inbound text
      |
      v
private Core ingress
  -> verify Gateway HMAC
  -> validate tenant / connection / current beta employee routing
  -> persist contact / conversation / inbound message / work
      |
      v
Mastra Agent Runtime Adapter
  -> deterministic safe proposal
      |
      v
canonical work_proposals
  -> work attention-required
  -> receipt completed / supervision-required
  -> no automatic outbound side effect
```

ADR 0028 permits the final supervised transition to reuse an existing active work only from `in-progress`, `attention-required` or `waiting-customer`, always ending atomically in `attention-required`. `waiting-approval` remains fail-closed.

The real inbound that originally produced `422 canonical-rejection` was reprocessed after promotion through the normal private Gateway → Core client path without manual DB repair. The receipt became `completed`, the inbound message remained unique, one new proposal was created, the same work remained unique and no outbound side effect occurred during replay.

The current beta routing of a single active commercial employee is existing proven state, not the final hiring/control-plane architecture. The abandoned unmerged native assignment/migration 010 direction is not authoritative. Hiring/responsibility work must first prove the Paperclip Organization Adapter boundary.

The inbound path remains independently safe even though a separate human-authorized outbound capability exists in code.

## Messaging Gateway

Current live Gateway:

```text
container: wandora-messaging-gateway
image: wandora/messaging-gateway:origin-fix-94cfb4de
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
network: wandora-core
published host ports: none
healthz: 200
outbound capability: disabled by absence of enable flag
```

Evolution → Gateway uses per-instance JWT HS256. Gateway → Core ingress uses a distinct Wandora HMAC-SHA256 secret.

ADR 0022 additionally defines a private Core → Gateway outbound route authenticated by a different directional HMAC. The route is structurally unavailable when outbound is disabled. When explicitly enabled, the Gateway alone maps provider-neutral send-text requests to Evolution and reads the Evolution API key from an operator-controlled secret file.

ADR 0025 pins the internal server-to-server Origin used by outbound requests and adds only that exact internal Origin to Evolution's allow-list; wildcard CORS is not accepted.

Raw provider instance/API-key/server-url/provider message identifiers do not become public Core contracts.

## Human supervision reads — live

### Equipe

`GET /api/v1/organizations/:organizationId/digital-employees` returns the tenant-authorized current Wandora employee projection used by the customer Team surface. Active membership and organization state are revalidated inside the read transaction and RLS independently scopes the data. The customer UI no longer invents Clara/progress values.

This read projection does not define the future control-plane/hiring implementation; ADR 0036 remains mandatory before expanding it.

### Trabalho

`GET /api/v1/organizations/:organizationId/work/attention-required` exposes only the business context required for supervision:

- work ID/kind/status/update time;
- employee ID/display name;
- contact/conversation canonical identity;
- latest inbound customer text/time;
- canonical proposal ID/kind/text/rationale/time when present;
- normalized Human Send action state when the runtime capability is enabled and the user is eligible.

### Conversas — list

`GET /api/v1/organizations/:organizationId/conversations` returns at most 100 conversations ordered by canonical activity with:

- canonical conversation ID/status/activity time;
- canonical contact ID/business-facing label;
- latest canonical message direction/text/time when present;
- latest active current-beta work employee ID/name when present.

### Conversas — detail/history

`GET /api/v1/organizations/:organizationId/conversations/:conversationId` returns the authorized canonical conversation context and at most the latest 100 messages, ordered oldest → newest for display. The response includes only inbound/outbound direction, message text and occurrence time plus a `hasEarlierMessages` flag when earlier history exists.

Organization authorization happens before conversation lookup. A foreign or missing conversation under an already-authorized organization is exposed only as generic `404`. Tenant-scoped human reads execute in `REPEATABLE READ READ ONLY` transactions with transaction-local tenant scope + RLS.

`Conversas` remains a read-only history surface. Human Send is deliberately exposed through the reviewed `Trabalho` proposal boundary rather than by adding a generic free-text composer to the read contract.

## Human Send Proposal + Canonical Confirmation V2

ADRs 0023, 0026 and 0027 define the first customer-facing external-effect boundary.

V1 only permits sending an existing canonical proposal that is:

- `kind=send-text`;
- `commitment=none`;
- attached to the selected tenant/work/conversation;
- newest/current and aligned with the latest inbound event;
- on an active conversation/employee/connection;
- authorized by an active `owner` or `admin` human session.

The browser cannot supply recipient, connection, provider, text or idempotency key.

The Web uses an explicit two-step flow:

```text
Revisar e enviar
      |
      v
Core-issued confirmation snapshot
  -> recipientMasked
  -> exact canonical text
  -> sha256 confirmation version
      |
      v
Confirmar e enviar
  -> POST carries only confirmationVersion
```

The snapshot is frozen locally when the human opens the dialog. A background refetch cannot silently replace what the person is reviewing.

At final send, Core reloads and reauthorizes canonical state, recomputes the version and fails `confirmation-stale` before durable attempt/Gateway call if the reviewed effect no longer matches. Malformed/widened bodies fail before the send service.

Durable outbound semantics remain conservative:

- one attempt per canonical proposal;
- human actor/proposal linkage is durable;
- success creates one canonical outbound message idempotently;
- `uncertain` is not blind-retried;
- newer inbound state is not overwritten by a late completion;
- stronger commercial commitments stay on `wandora.approvals`.

The separately reviewed Confirmation V2 activation proof is complete. After ADR 0028 replay created the canonical `commitment=none` proposal, Gateway outbound and Core Human Send were temporarily enabled in that order. Merely enabling them created no effect. The human explicitly reviewed and confirmed the Core-owned snapshot, controlled successful deliveries were observed on the authorized handset, and both effect switches were returned to OFF.

See `docs/infra/human-send-canonical-confirmation-v2-live.md` and `docs/infra/inbound-reopen-confirmation-v2-live-20260916.md`.

## Current production state of external effects

The code paths for private Gateway outbound, Human Send Proposal and Confirmation V2 are deployed, but production currently runs with both explicit effect switches absent:

```text
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent
WANDORA_GATEWAY_OUTBOUND_ENABLED    = absent
```

Observed state after the completed controlled proofs:

```text
outbound_attempts total = 4
uncertain              = 2
succeeded              = 2
canonical outbound messages = 2
```

The two `uncertain` rows are historical evidence and must not be blindly retried. The two `succeeded` attempts are controlled human-supervised deliveries.

Empresa Exemplo remains non-sending and has no need to become the provider-bound proof tenant.

The Organization Adapter live cross-company isolation gate is now closed by ADR 0062. A temporary provider-only company B was configured with its own secret_ref; Paperclip rejected A's secret_ref for B, and a B-target webhook signed with A's HMAC failed `invalid_wandora_signature` while creating zero B resources. The temporary company/config/secret were removed through provider APIs, A's existing config was re-saved unchanged to restore the worker scope to A-only, and final readback returned to one Paperclip company with no Wandora DB delta. This proof does not make customer hiring/activation live.

## Model provider status

Production remains on deterministic Mastra and currently has no model-provider configuration or model-provider secret mounted.

ADR 0142 adds a repository-qualified, production-dormant model-provider boundary for **Paperclip-assigned supervised internal work only**:

```text
Agent Runtime mode = mastra-supervised-model
approved V1 provider = Mistral
approved V1 model = mistral-small-2603
provider URL = https://api.mistral.ai/v1
customer-facing logical model = wandora-supervised-v1
provider request timeout = 45s
Paperclip -> Core bridge timeout = 60s
automatic model retries = 0
```

The credential is file-backed through an operator-controlled mounted secret. No credential value belongs in Git, Compose environment values, customer/browser contracts or logs. The previously Git-exposed Mistral credential remains permanently invalid for reuse.

This candidate does **not** route supervised inbound/WhatsApp content to the model provider. The inbound proposal path remains deterministic. Only an authenticated Paperclip-assigned task that has already crossed the reviewed execution bridge may invoke the model, and only bounded task title/description are forwarded. Human Send and Gateway outbound remain independent Wandora-owned effect gates.

Chutes and additional providers remain deferred; adding one must preserve the same Wandora model contract rather than introducing provider identity into customer APIs.

## Operator/infrastructure boundary

Cloudflare is public edge and Traefik is VPS ingress. Git is infrastructure source of truth. PostgreSQL, Docker socket, Core internal ports, Paperclip/Mastra internals and provider management APIs remain private.

Paperclip, Mastra Studio, Evolution Manager, Supabase Studio and Portainer are operator/engineering consoles. The normal operator cockpit is Wandora Platform Admin over adapters as stable contracts are promoted.

Versioned DB migrations live under `infra/stacks/supabase/migrations/`; live-safe verifiers live under `infra/stacks/supabase/verifiers/`. Mutation-heavy behavioral verifiers run only in disposable environments. A proposed product-domain migration must pass ADR 0036 before SQL is written.

The Confirmation V2 pre-promotion operator snapshot is:

```text
/home/wandora-admin/backups/canonical-confirm-v2-20260916T061650Z
```

Additional rollback metadata was captured before the ADR 0028 Core promotion and before controlled capability activation. Team Read V1 used separate rollback metadata and changed no business rows during deployment.

## Current customer-hire / provisioning boundary

The Paperclip capability audit, Organization Adapter canary and live cross-company isolation gate are complete. Customer hiring is now split into explicit Wandora contracts:

```text
private tenant provisioning V2
  -> organization + canonical owner
  -> zero digital employees

customer Contratar
  -> Organization Adapter catalog hire
  -> paused + supervised employee

future Ativar
  -> separate execution permission
  -> not yet available
```

Migration 012 is live under ADR 0068 as a dormant, least-privilege employee-free provisioning capability. The first customer-like canary tenant was then provisioned, received separately reviewed Paperclip company/bootstrap/binding custody, and completed the ADR 0078 private-candidate hire through the real Human API + Organization Adapter path. Its Ana remains paused and supervised; same-key and different-key/same-catalog replay remained deduplicated.

ADR 0079 selected an additional Wandora-owned organization+catalog eligibility fact because the Core hire gate is process-wide while tenant readiness differs. ADR 0080 implements that contract in code/CI, including the dedicated NOLOGIN hire-operator capability, Core enforcement/read projection and Web gating. ADR 0082 then applied migration 013 and promoted the reviewed Core/Web foundation. ADR 0083 froze the one-overlay global-gate activation contract, and ADR 0084 executed it: the process-wide Customer Digital-Employee Hire gate is now **ON**, while eligibility rows and unfinished hire operations remain zero and every active tenant still projects `available=false`. Human Send and Gateway outbound remain separate disabled effects. ADR 0085 then re-reviewed every active tenant and proved that none currently qualifies for a first new `ana-commercial-v1` eligibility rollout: both Paperclip-bound tenants already have completed exact-catalog hires, while `Empresa Exemplo` has a matching legacy Ana and no control-plane binding. Eligibility therefore remains zero until a separately reviewed clean target exists. ADR 0086 identifies the next prerequisite as customer-owner onboarding rather than tenant creation: only one Auth/Wandora user exists, public signup remains closed, Private Tenant Provisioning V2 requires a pre-existing Auth subject, and the current Web has no invite-acceptance/first-password flow. Supabase Auth remains the credential authority and invite-only beta onboarding is selected before any new tenant/provider/eligibility effect. ADR 0087 implements that first-access path in Web/code/CI against exact GoTrue v2.196.0 semantics: provider invite credentials are consumed from the implicit redirect, removed from the URL before render, staged separately until the user sets a password through Supabase Auth, and only then promoted into the normal Wandora session. ADR 0088 selects provider-native interrupted-invite recovery, and ADR 0089 implements the dedicated public `/recover-access` flow with exact `type=recovery` staging plus the same hardened password-grant reconciliation. ADR 0090 proves a current-main, real-publishable-key Web candidate and image-only rollback, but production promotion remains blocked pending anti-abuse. ADR 0091 now selects the exact edge control for the real Cloudflare Free plan: one zone-level `http_ratelimit` rule matching only `/auth/v1/recover`, counted per IP at 6 requests / 10 seconds with a 10-second block. Because Free cannot match Method, OPTIONS + POST are intentionally counted together. The existing Traefik DNS token stays DNS-scoped; a separate one-zone WAF credential must first read/snapshot the current single-rule slot before any rule mutation. Independent external direct-origin access timed out, so the earlier loopback route is not treated as public-bypass proof; future execution still rechecks that negative boundary.

## Near-term execution sequence

1. keep canonical documentation synchronized with the live state;
2. preserve Human Session, explicit multi-organization selection, `Equipe`, `Trabalho` and `Conversas` authorization boundaries;
3. finish the existing customer-facing product by converting remaining PARTIAL/PLACEHOLDER surfaces through the correct Wandora contracts;
4. ADR 0084 makes the Customer Digital-Employee Hire global runtime gate live on the same reviewed Core image while eligibility remains zero and no tenant is newly available;
5. ADR 0095 closes the first real owner-access preflight without effect. ADR 0096 selects Resend SMTP through the existing Supabase Auth boundary. ADR 0097 makes the provider-side foundation live. ADR 0098 freezes the exact Auth-only activation candidate, and ADR 0099 executes it: only `supabase-auth` is recreated, the reviewed file-backed credential remains outside `.env`/Compose/`Config.Env`, final GoTrue PID 1 is UID 1000, and live Auth now targets `smtp.resend.com:587` with `Wandora <acesso@notify.wandora.com.br>`. No invite/recovery/test mail is sent; the remaining first-access gate is selecting one genuine new owner target for a separately reviewed invite preflight;
6. keep Human Send and Gateway outbound OFF by default after the successful controlled Confirmation V2 and hire-canary proofs;
7. preserve exactly-once durable attempt semantics and never retry historical `uncertain` attempts blindly; incomplete customer hire may resume only through its original idempotency key;
8. keep stronger commercial commitments on the existing approval boundary;
9. expose only exact reviewed Web action routes and preserve generic `/api/` + all `/internal/` closure;
10. keep Platform Admin as a separate trust plane over Wandora adapters rather than a generic infrastructure dashboard or provider reimplementation;
11. add customer onboarding, password recovery/OAuth and broader customer lifecycle flows around the proven authorization/adapters when selected;
12. add a real model provider only when materially useful and only with a newly issued credential.

## Non-goals for the current phase

- autonomous outbound messaging;
- free-text generic WhatsApp composer outside a reviewed contract;
- public generic Core hostname;
- direct browser access to workflow/private DB state;
- building the whole Platform Admin before the customer loop is operationally clear;
- rebuilding Paperclip/Mastra/Evolution/Supabase capability inside Wandora without passing ADR 0036;
- generic customer prompt/workflow builder;
- customer access to provider consoles;
- requesting a model token before it is needed.


## Customer Owner First Real Invite Execution Preflight V1

ADR 0100 freezes the first real customer-owner Auth effect at the Supabase boundary:

```text
authorized real owner e-mail
  -> one service-role POST /auth/v1/invite
  -> redirect to /accept-invite
  -> first password
  -> normal password grant
  -> later Private Tenant Provisioning V2
```

ADR 0101 executed exactly one real invite for an explicitly authorized genuine new owner target. ADR 0102 then proved invite consumption, first-password establishment and a fresh normal password login. The authenticated subject reaches `/api/v1/me` and fails closed as `unlinked` because no Wandora identity/membership exists yet; no tenant, Paperclip resource or eligibility was created by the access flow.

The effect boundary is conservative: no blind retry after timeout or ambiguous provider result. In GoTrue v2.196.0 the SMTP send occurs before the surrounding invite transaction has necessarily committed `invited_at` and its one-time-token state, so database absence alone cannot prove that no e-mail left the system. Reconcile Auth plus Resend/operator evidence first.

Pre-accept revocation, if ever required, uses the provider-native Admin API delete only after proving the invite was not accepted and no Wandora/provider business state exists. Delivery itself is irreversible.

Tenant provisioning and eligibility activation remain separate later effects.


Customer Owner First Real Invite Execution V1 is applied under ADR 0101 and normal owner authentication is proven under ADR 0102. The next boundary is the first real tenant provisioning preflight using the existing Private Tenant Provisioning V2 capability; direct identity/membership inserts remain rejected.


## Customer Owner First Real Tenant Provisioning

ADR 0103 froze the first real tenant request as `MEDICSPRO` / `medicspro`. ADR 0104 executed it through the already-live Private Tenant Provisioning V2 capability using only transaction-local `wandora_platform_provisioner` authority. MEDICSPRO is now one active employee-free Wandora organization with one active owner and exact V2 idempotency state.

ADR 0105 proves the customer-side boundary with a genuine normal owner session: fresh `/login` bootstrap reaches `/api/v1/me = 200`, Web renders MEDICSPRO as the organization, and tenant-authorized Trabalho/Equipe/Conversas reads succeed. No privileged customer impersonation or session extraction is part of the architecture.

Tenant provisioning remains provider-free: MEDICSPRO has no Paperclip/control binding, employee binding, eligibility, hire state or messaging connection. Paperclip company/bootstrap, provider bindings, customer-hire eligibility and employee hire remain separate later effects.

## Customer Owner First Real Tenant Paperclip Company Bootstrap

ADR 0106 freezes the MEDICSPRO provider-company bootstrap without creating provider state. The live Paperclip runtime remains the pinned `wandora/paperclip:v2026.831.1` / `65ec059b...` build, the protected Board credential still resolves as instance admin when explicitly addressed to the private API base, and the provider baseline is exactly two existing companies with zero `MEDICSPRO` matches.

The future bootstrap reuses ADR 0072's official one-shot CLI boundary with the exact payload `{"name":"MEDICSPRO"}`. Paperclip company creation is not idempotent and company names are not unique, so any ambiguity after dispatch is reconciled by read-only provider state rather than blind retry. Organization Adapter HMAC/secret/config, Wandora provider binding, tenant eligibility and digital-employee hire remain separate effects.

ADR 0107 executed that request exactly once. Paperclip now has one active MEDICSPRO company (`a63f27a8-dbac-4552-a456-b3a21302226b`) with the operator as active owner, zero agents, zero company secrets and no Organization Adapter company config. Wandora still has no MEDICSPRO control-plane binding, employee-provider binding, eligibility or hire state. The next boundary is a no-mutation Custody + Config + Binding preflight reusing ADRs 0073–0076.

ADR 0108 completes that no-mutation preflight. The exact binding, deterministic Core HMAC custody path, company-owned `local_encrypted` secret and company-scoped `secret_ref` config order are frozen by reuse of ADRs 0073–0076. The adversarial review found that the retained out-of-volume recovery DB snapshot predates both the live canary HMAC secret and the MEDICSPRO provider company. The master-key copy still matches live, but wiring is blocked until a fresh current-state DB + key recovery pair is created and proven. No MEDICSPRO HMAC, secret/config, control binding, eligibility or employee was created.

ADR 0109 clears that recovery blocker. A fresh official Paperclip logical backup was paired outside the Docker volume with the exact current `master.key`; an isolated PG18 restore proved the current canary secret/config, the MEDICSPRO provider company, successful `local_encrypted` decryption with hash match, and wrong-key rejection. The previous snapshot is retained. MEDICSPRO itself still has no HMAC, Paperclip secret/config, Wandora control binding, eligibility or employee; the next effect boundary is the separately reviewed wiring execution.

ADR 0110 executes that wiring boundary: MEDICSPRO now has exactly one operator-owned Wandora→Paperclip control binding, deterministic protected Core HMAC custody, one company-owned `local_encrypted` secret and one company-scoped Organization Adapter `secret_ref` config. The final HMAC was adversarially rotated before closure to an exact 32-byte cryptographic random value; hash-only proof matches Core custody to Paperclip version 2/current, and the secret has exactly one required plugin `hmacSecret` binding. MEDICSPRO remains employee-free and has zero eligibility/hire state; Human Send and Gateway outbound remain OFF.


ADR 0111 accepts MEDICSPRO as the first real tenant-scoped customer-hire eligibility target. The target is active with one genuine confirmed owner path, zero employees/hire operations, exact Paperclip binding/config/custody and no provider agent. Eligibility remains operator-only state: the future first rollout uses the ADR 0085 exclusive-lock + `SET LOCAL ROLE wandora_customer_hire_operator` transaction and remains separate from the actual employee hire, activation and outbound effects.

ADR 0112 executes that first real tenant policy transition. Exactly one eligibility row is now enabled for MEDICSPRO + `ana-commercial-v1`; the operator-only setter ran under the frozen exclusive-lock transaction and post-commit validation proves MEDICSPRO still has zero employees, employee-provider bindings, hire operations and Paperclip agents. Human Send and Gateway outbound remain OFF, so eligibility remains policy only and is not itself a hire or activation effect.


## Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight

ADR 0114 closes the final no-effect gate before the first real MEDICSPRO employee hire. MEDICSPRO has one enabled `ana-commercial-v1` eligibility, one healthy Organization Adapter control binding and zero Wandora employees/hire operations/provider employee bindings; Paperclip independently still has zero agents for the MEDICSPRO company.

The currently running Core's packaged implementation was inspected directly and its live customer read model projects `items=[]` plus `hire.available=true / state=available`. The deployed Web remains source-equivalent to current `apps/web/` and owns the browser-side organization-scoped UUIDv4 idempotency key, while Core remains authoritative for session, membership, eligibility, collision, binding and reconciliation checks.

The frozen next effect is deliberately narrow:

```text
normal MEDICSPRO owner browser session
  -> GET customer availability = available
  -> Contratar Ana
  -> one persisted idempotency key
  -> Organization Adapter
  -> Paperclip managed-agent reconcile
  -> Wandora Ana = paused + supervised
```

Hire does not imply activation. No resume/activation, Mastra execution, Human Send or Gateway outbound is part of that effect. Provider ambiguity is reconciled under the original idempotency key; a new key is never a recovery mechanism.


## Customer Owner First Real Tenant Digital-Employee Hire Execution V1 — COMPLETE

ADR 0115 completes the first genuine MEDICSPRO customer hire through the normal owner browser route.

```text
Wandora employee           = Ana / commercial-assistant
Wandora status/autonomy    = paused / supervised
employee provider binding  = exactly 1
hire operation             = exactly 1 / completed
Paperclip managed Ana      = exactly 1 / paused
Paperclip adapter          = wandora_mastra
customer hire projection   = already-hired
outbound attempts/messages = 0 / 0
```

Paperclip reports the explicit pause reason requiring separate activation, zero budget and no heartbeat. The customer effect did not resume the provider agent, run Mastra, enable Human Send or enable Gateway outbound.

The completed hire operation remains the durable idempotency/reconciliation evidence. Eligibility remains a policy row and may stay enabled; the completed same-catalog state closes availability.

## Customer Owner First Real Tenant Digital-Employee Activation Preflight V1 — COMPLETE / NO-GO

ADR 0116 proves that the first real MEDICSPRO hire is correctly mapped end-to-end, but activation infrastructure is not yet complete.

The exact live Paperclip employee remains `paused`, company-matched, managed as `ana-commercial-v1`, org-chain healthy and configured with `adapterType=wandora_mastra`. However, live Paperclip does not have a registered `wandora_mastra` adapter; an exact adapter read returns 404.

The live Organization Adapter plugin is ready but still declares only:

```text
agents.managed
webhooks.receive
secrets.read-ref
```

It does not hold `agents.resume`. The pinned Paperclip SDK already supplies the specialist lifecycle primitive: `ctx.agents.resume(agentId, companyId)` requires `agents.resume` and converges provider status from `paused` to `idle`. Wandora therefore must reuse that capability behind the company-scoped Organization Adapter rather than use an operator Board credential or create its own provider lifecycle.

The future activation architecture is frozen as provider-first:

```text
customer owner/admin Ativar
  -> Wandora auth + exact tenant/employee mapping + runtime readiness
  -> company-scoped Organization Adapter
  -> exact managed Paperclip agent
  -> Paperclip resume: paused -> idle
  -> provider confirmation/readback
  -> only then Wandora paused -> active projection
```

An ambiguous provider result never becomes invented success and is never blindly retried. Human Send and Gateway outbound remain separate effects and stay OFF; activation alone grants no external-send authority.

No new Wandora lifecycle/task/control-plane subsystem is approved. Existing `paused|active` remains the customer projection; a later implementation may add only minimum external-effect operation state if it proves necessary for concurrency/idempotency after reuse of provider reconciliation is exhausted.

## Paperclip -> Wandora/Mastra Production Execution Bridge Contract Implementation V1

ADR 0117 materializes the accepted ADR 0037 direction as a disabled-by-default production-shaped contract.

```text
Paperclip run
  -> external adapter wandora_mastra
     -> dedicated file-backed bridge HMAC
     -> opaque run-scoped token in dedicated header only
     -> reviewed task allow-list
  -> private Core /internal/v1/paperclip/execution
     -> HMAC + clock check
     -> Paperclip /api/agents/me identity reconciliation
     -> exact managed Ana/company proof
     -> Paperclip company -> active Wandora org resolver
     -> exact Wandora employee/provider binding
     -> require Wandora active + supervised
     -> AgentTaskRuntime -> existing Mastra runtime
```

The bridge does not trust the HMAC-signed provider agent ID by itself. The opaque Paperclip run token is independently validated back against Paperclip before Wandora mapping, which prevents another same-company agent from being treated as the catalog Ana.

Provider IDs/run IDs stop at the bridge and do not enter Mastra task input. The bridge uses the existing deterministic runtime rather than creating a new scheduler, task engine or agent lifecycle.

Migration 014 adds only the least-privilege Paperclip-company -> active-Wandora-organization resolver. It remains unapplied until a separate activation execution.

The external adapter package, Core runtime gate and Compose overlay are artifacts only. PR #166 is merged in canonical `main` at `7bc8c4790e37b0410703bf58979458200810d5a9`; merge did not install `wandora_mastra`, enable the private bridge, apply migration 014, activate Ana or alter Human Send/Gateway outbound. Independent post-merge validation confirmed those production boundaries remain unchanged.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V1 — COMPLETE / NO-GO

ADR 0118 revalidates the exact dormant production state and freezes the bridge activation transaction without applying it.

The reviewed adapter and Core artifacts are now hash-pinned, migration 014 and its verifier are frozen, the current seven-file live Core composition matches Git, and the exact future migration/HMAC/Core/Paperclip/adapter order plus rollback rules are documented.

The preflight also finds three production-readiness gaps:

1. live/canonical Paperclip has no execution-bridge overlay carrying the dedicated HMAC mount and canonical Core URL;
2. current Core `/readyz` does not independently attest the migration-014 resolver when the execution bridge is enabled;
3. CI proves the adapter, Core binding service and Mastra runtime separately, but there is not yet one disposable integrated proof using an actual pinned Paperclip run-scoped token through Paperclip -> Core -> Agent Runtime/Mastra.

Therefore the bridge remains dormant and MEDICSPRO Ana remains paused. `agents.resume`, Human Send and Gateway outbound are still outside this bridge-foundation activation.

The frozen future activation order is:

```text
reconcile real state
-> exact artifact/provenance + disposable integrated attestation
-> fresh scoped DB backup + restore/rehearsal
-> migration 014 + canonical verifier + read-only postverify
-> create one dedicated execution-bridge HMAC
-> promote reviewed Core candidate with bridge overlay
-> validate health/readiness/private bridge boundary
-> recreate Paperclip with reviewed bridge runtime overlay, adapter still absent
-> stage verified package into persistent /paperclip storage
-> install/read back/test wandora_mastra exactly once
-> prove MEDICSPRO Ana still paused/no-heartbeat and outbound still OFF
-> STOP
```

No customer activation/resume is part of that sequence.

## Paperclip -> Wandora/Mastra Runtime Custody + Readiness + Disposable E2E Attestation — COMPLETE

ADR 0119 closes the three readiness gaps identified by ADR 0118 while preserving the dormant production boundary.

The repository now owns both reviewed bridge overlays, Core readiness fails closed on the migration-014 resolver when the bridge is enabled, and CI proves a disposable native Paperclip managed-agent run with a real Paperclip run-scoped token through the private Core boundary into the existing deterministic Agent Runtime/Mastra implementation.

The disposable resolver shim is proof-only. Production still requires the real migration 014 before the bridge-aware Core can become ready.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2 — COMPLETE / GO

ADR 0120 proves the merged ADR 0119 artifacts are suitable for a separately reviewed bridge-foundation activation transaction.

The selected adapter package remains byte-identical to ADR 0118:

```text
tgz sha256 = 0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f
```

The selected bridge-aware Core candidate is from the exact current-main source tree:

```text
source tree    = abacb9da0949a63210080a01bdd95b087e98d02e
archive sha256 = b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d
OCI config     = sha256:1a4f06bcc63491d87e8f91532db6b2f042f9117a4f00d560af6de9bbebb7553b
OCI manifest   = sha256:1fd3f3d7e63d77a9dc80bb903e85ceba77d14aaa8739464133523d54872f5b14
```

Production is still deliberately dormant: migration 014 absent, no live bridge secret, bridge overlays absent live, adapter store empty, Core bridge OFF, Ana paused, no wakeups/runs, `agents.resume` absent, Human Send OFF and Gateway outbound OFF.

The architecture therefore allows the next bridge-foundation execution only in this order:

```text
fresh state reconciliation
-> scoped DB backup + disposable restore/rehearsal
-> migration 014 + verifier + independent mapping postverify
-> dedicated file-backed HMAC
-> exact bridge-aware Core candidate + bridge overlay
-> health + resolver-aware readiness
-> Paperclip bridge overlay, adapter still absent
-> persistent hash-addressed adapter staging
-> exact local-directory adapter install/readback
-> prove Ana still paused + no wakeups/runs
-> prove agents.resume absent + outbound OFF
-> STOP
```

Bridge foundation activation is not employee activation. Provider resume and Wandora `paused -> active` remain a distinct later effect boundary.

## Bridge activation pre-mutation recovery and host hygiene amendment

ADR 0121 hardened the activation start with host-hygiene and fresh Paperclip recovery gates. ADR 0122 then recorded migration 014 live/verified, ADR 0123 corrected bridge-secret custody across Paperclip's privilege drop, and ADR 0124 corrected command preservation after the first wrapper promotion failed closed.

## Production execution bridge foundation — LIVE

ADR 0125 closes the bridge-foundation activation.

Current validated architecture:

```text
Paperclip control plane
  -> external adapter wandora_mastra
  -> dedicated file-backed HMAC
  -> run-scoped Paperclip identity
  -> Wandora Core private bridge
      -> independent Paperclip identity reconciliation
      -> Paperclip company -> Wandora organization resolver
      -> exact managed employee/provider binding
      -> Wandora policy boundary
      -> Agent Runtime Adapter
          -> Mastra execution
```

Current safety boundary:

```text
migration 014        = LIVE / verified
Core bridge          = LIVE / healthy / ready
Paperclip bridge     = LIVE / healthy
wandora_mastra       = exactly one / loaded
adapter env test     = PASS
Ana                  = paused + supervised
agents.resume        = absent
Human Send           = OFF
Gateway outbound     = OFF
outbound attempts    = 0
```

The bridge foundation is not employee activation. It supplies a safe execution path that remains unusable by Ana while the employee is paused and provider resume authority is absent.

## Paperclip / Mastra capability authority — ADR 0126

The detailed canonical maps are:

- [Paperclip Capability Map](PAPERCLIP_CAPABILITY_MAP.md)
- [Mastra Capability Map](MASTRA_CAPABILITY_MAP.md)
- [Capability Collision Matrix](CAPABILITY_COLLISION_MATRIX.md)

The architecture distinguishes three layers:

```text
Paperclip
  durable organizational control plane
  company / employee lifecycle
  tasks / runs / routines / skills / control-plane decisions
  connections / grants / Paperclip secrets
        |
        v
Wandora adapter + policy boundary
  stable product IDs / tenancy / authorization
  mapping / reconciliation
  external-effect authorization
        |
        v
Mastra
  workflow / tool execution
  execution-local goals / task lists / signals
  runtime memory / observability / evals when separately adopted
```

This resolves the principal collisions:

- Paperclip Routines, not Mastra schedules, are authoritative for durable business recurrence.
- Paperclip tasks/issues, not Mastra task lists/goals, are authoritative for durable organizational work.
- Paperclip owns organizational Skills catalog/policy; Mastra may materialize runtime skills.
- Paperclip Decisions/Execution Policy govern control-plane work; Wandora approvals govern customer commitments/external effects.
- Paperclip Decision Training is decision evidence; Mastra Evals are execution-quality evidence.
- Paperclip Connections is the leading candidate for organizational connection/grant authority. Mastra `@mastra/connect` is not adopted as a competing authority.

## Paperclip v2026.916.0 production boundary — LIVE / GREEN

ADRs 0128–0130 establish the full qualification, rollback and production-execution chain.

The live control plane is pinned to:

```text
wandora/paperclip:v2026.916.0
dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
```

The production startup applied the already-qualified 49 migration files `0231..0279`. Company/membership state, the Organization Adapter, `local_encrypted` secret resolution, the paused MEDICSPRO Ana and the single `wandora_mastra@0.1.0` registration survived unchanged.

The live acceptance path now proves the v916 boundary itself, not only a disposable clone:

```text
Paperclip run-scoped JWT
  -> /api/agents/me
  -> wandora_mastra
  -> private Wandora Core bridge
  -> deterministic Mastra runtime
```

The bounded acceptance used the existing **Wandora Internal Supervised Proof** identity through Paperclip's normal heartbeat/run path. The initial acceptance produced one on-demand run plus one timer heartbeat; both succeeded. During later chat-continuity recovery, before the already-existing PR #180 checkpoint was discovered, the same `WAN-1` path was invoked once more and a third synthetic run also succeeded. Final proof state is agent `paused`, issue `cancelled`, pending runs/wakeups `0/0`, and outbound attempts unchanged. MEDICSPRO Ana was never awakened. A forged/tampered JWT was rejected, and unknown provider-company mapping was independently rechecked through the Core service and failed closed.

### Backup / rollback architecture

Paperclip's normal logical backup remains necessary for Paperclip logical recovery and the matching `master.key`, but it does not serialize PostgreSQL CHECK constraints.

The retained v831 recovery contract therefore remains:

```text
official Paperclip logical backup + matching master.key
+
schema-faithful PostgreSQL 18.1 pg_dump -Fc
+
exact v831 image/wrapper/extensions
```

Since v916 migrations have committed in production, **image-only rollback is invalid**. A v831 rollback requires restoring the protected pre-upgrade schema-faithful database before starting the frozen v831 runtime.

### Adapter/package policy after upgrade

The exact current `wandora_mastra@0.1.0` runtime bytes are v916-qualified and remain live exactly once. Its compatibility metadata still names v831; that is stale provenance, not a runtime incompatibility.

Do not edit the hash-addressed 0.1.0 package in place. If a metadata-aligned package is ever needed, emit a new immutable compatibility-only artifact after separate review. It is not a prerequisite for the current v916 runtime.

The Organization Adapter package also remains the exact already-qualified v0.1.0 bytes; no repack was bundled into the Paperclip upgrade.

## Mastra version boundary

Production Core remains on `@mastra/core@1.66.0`.

The reviewed upstream `1.67.0` is not required by the Paperclip upgrade and was not bundled. Memory, Observability and Evals remain separately reviewed adoption slices.

Do not conflate Paperclip control-plane modernization with a Mastra dependency upgrade.

## NEXT EXECUTABLE SLICE

Next: **Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1**.

ADR 0116's earlier activation assumptions must be reconciled against the now-live Paperclip v2026.916.0 capability/authority map and current runtime. This is a readiness slice, not implicit authorization to resume MEDICSPRO Ana or enable external effects.

Ana must remain paused + supervised, `agents.resume` absent, Human Send OFF and Gateway outbound OFF until a later separately reviewed activation execution explicitly changes that boundary.

## First real digital-employee activation boundary — ADR 0131

The post-v916 activation architecture keeps lifecycle authority in Paperclip while retaining customer authorization and product state in Wandora:

```text
authenticated Wandora owner/admin
        |
        v
Wandora Core activation contract
  exact tenant/employee/hire/binding checks
        |
        v
company-scoped Organization Adapter
  fixed managed catalog employee only
  Paperclip agents.resume
        |
        v
Paperclip paused -> idle
  no wakeup implied
        |
        v
provider readback/reconciliation
        |
        v
Wandora paused -> active + supervised
```

The following states are intentionally different:

- Paperclip `paused` = provider lifecycle stopped;
- Paperclip `idle` = resumed and waiting for work;
- Wandora `active` = product-eligible for authorized work;
- Wandora `supervised` = supervision/effect policy remains in force.

Activation is not work dispatch. It must not call `agents.invoke`, create a heartbeat, create a task, enable Human Send or enable Gateway outbound.

The current v0.1.0 Organization Adapter still grants only `agents.managed`, `webhooks.receive` and `secrets.read-ref`, so real activation remains blocked until a separately reviewed immutable adapter artifact exposes a narrow signed managed-employee activation action with the native `agents.resume` capability.

Core must reconcile Paperclip before changing its local product projection. A response lost after provider resume can be recovered by exact readback; while Wandora remains paused, the execution bridge fails closed for that employee. A new activation journal is not part of the architecture unless implementation testing proves additional durable safety state is necessary.



## First real digital-employee activation implementation boundary — ADR 0132

ADR 0132 completes the code/CI implementation of ADR 0131 without changing production.

Canonical dormant implementation:

```text
Web / Team Ativar projection
  -> exact Core POST /organizations/:organizationId/digital-employees/:employeeId/activate
     -> authenticated owner/admin + exact employee/hire/binding reconciliation
     -> migration-015 private activation lock helper
     -> signed company-scoped Organization Adapter v0.2 action
        -> agents.managed.get(fixed ana-commercial-v1)
        -> agents.resume only if provider is paused
        -> agents.managed.get(fixed ana-commercial-v1)
        -> require provider idle
     -> migration-015 private paused->active projection finalizer
     -> return customer-safe active + supervised projection
```

The database boundary deliberately keeps `wandora_core_runtime` without direct `UPDATE` on `wandora.digital_employees`. Migration 015 supplies only tenant-scoped `SECURITY DEFINER` lock/finalize helpers for the fixed already-hired catalog employee; it adds no lifecycle table or activation journal.

Activation is still not execution:

```text
Ativar -> Paperclip idle -> Wandora active
                    X no wakeup/run

later authorized work -> Paperclip run -> wandora_mastra -> Core -> Agent Runtime -> Mastra
```

The Organization Adapter candidate may hold `agents.resume` but must never use `agents.invoke` in the activation path. Human Send and Gateway outbound remain independent Wandora-owned effect gates.

This implementation is canonical in Git but **dormant in production** until a separately reviewed production preflight/execution applies migration 015, promotes the exact immutable adapter/Core/Web artifacts and explicitly authorizes the real MEDICSPRO transition.
## Production activation boundary — ADR 0133

The first real employee activation production preflight confirms the lifecycle boundary:

```text
customer owner
  -> Wandora Core activation contract
  -> Organization Adapter v0.2
