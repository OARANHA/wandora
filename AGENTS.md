# AGENTS.md — Wandora

This file is the operational authority for AI coding, infrastructure and research agents working in this repository.

## 1. Mandatory read order

Before changing code, infrastructure, product contracts or architecture, read in this order:

1. `AGENTS.md`;
2. accepted ADRs in `docs/decisions/` (newer accepted ADRs override older conflicting guidance);
3. `docs/CAPABILITY_AUTHORITY.md`;
4. `docs/architecture.md`;
5. `docs/CANONICAL_STATE.md`;
6. the README/runbook for the component being changed.

Do not silently reopen, reinterpret or override an accepted decision. If new evidence creates a conflict, stop the conflicting change, document the evidence and propose a superseding ADR.

**Urgent architecture rule:** a missing local Wandora table/service/workflow is never, by itself, evidence that Wandora should implement that capability. Before any material new domain state or subsystem is designed, apply ADR 0036's Capability Authority / Reuse Gate.

## 2. Project identity

Wandora is a standalone product for businesses to hire, train, govern and measure digital employees alongside human teams.

Do not import assumptions, code, naming, architecture or business rules from unrelated projects unless explicitly requested and justified for Wandora.

The product thesis is business-first: Wandora is not a CRM with AI and not a generic agent builder. CRM, messaging, scheduling, finance and other systems are tools used by digital employees inside a Wandora-governed company.

A normal customer should understand the product through business language — company, team, responsibilities, work, conversations, approvals and outcomes — without needing to know Supabase, Evolution, Mastra, Paperclip, RLS, provider IDs, prompts or tokens.

## 3. Ownership boundary

Wandora owns the **customer/operator product contract and semantics**, including:

- tenancy / organizations and stable Wandora identifiers;
- customer users, memberships and roles;
- the customer-facing meaning of digital employees, subscriptions/configuration and policy;
- plans, usage and billing boundaries;
- autonomy, policy and human approval;
- provider-neutral integration contracts;
- audit-facing product events;
- authorization and orchestration across specialist capabilities.

**Wandora-owned does not mean Wandora-native implementation.** A specialist component may remain authoritative for the implementation/state machine of a capability behind a Wandora-owned adapter while Wandora preserves stable IDs, tenant ownership, policy, mappings/projections, audit/reconciliation evidence and other minimum product-owned state.

Third-party infrastructure and specialist capability providers must always sit behind Wandora-owned adapters. Provider IDs, schemas and authorization semantics must not leak into customer-facing APIs.

Do not clone a provider's complete domain into Wandora PostgreSQL merely to make the product look internally self-contained. Persist only state that is demonstrably Wandora-owned or required to make the adapter safe, replaceable, authorized, auditable or recoverable.

## 4. Canonical architecture decisions

The following are current decisions unless superseded by a newer accepted ADR:

- Docker Engine + Docker Compose are the initial deployment substrate.
- Portainer is an operator console, not the source of truth; manifests live in Git.
- Cloudflare is the public edge and Traefik is the VPS ingress/reverse proxy.
- Paperclip is the validated laboratory candidate for organization/control-plane capabilities, behind an `Organization Adapter` and private by default.
- Mastra is the accepted initial implementation of the Wandora Agent Runtime behind an `Agent Runtime Adapter`; Mastra-specific runtime objects must not become public Wandora contracts.
- Supabase self-hosted is the selected and laboratory-validated data/auth platform for Wandora: PostgreSQL, Auth, Studio, Storage, Realtime and Supavisor as needed.
- Supabase is infrastructure, not the Wandora backend. Domain policy/orchestration remains in Wandora Core/API, but this does not authorize Core to duplicate provider capabilities.
- One Supabase deployment is used per product/bounded context, not one shared database for unrelated products and not one deployment per Wandora customer.
- The initial Supabase deployment may run on the current Wandora VPS while load is low; migration to a dedicated data-plane VPS must remain straightforward.
- `studio.wandora.com.br` is an administrative surface and must be strongly protected (Cloudflare Access preferred). PostgreSQL must never be publicly exposed.
- `supabase.wandora.com.br` is the stable application-facing Supabase endpoint. Future VPS migration should preserve this contract through DNS/ingress changes.
- Evolution API 2.3.7 is the accepted initial WhatsApp provider behind a Wandora-owned `Messaging Gateway`; the provider-neutral boundary has been validated with real inbound and outbound WhatsApp traffic, and digital employees must never call Evolution directly.
- Wandora Core owns canonical organization, user, membership and provider-neutral messaging-connection identity. Supabase Auth subjects and provider/runtime IDs are not Wandora business IDs.
- Initial human organization roles are `owner`, `admin` and `member`; role is not a universal permission matrix and sensitive/domain actions remain explicit Core policy decisions.
- React + Vite with TanStack Router/Query is the accepted initial Wandora Web shell. TanStack supplies application behavior, not Wandora's visual identity; customer-facing design remains Wandora-owned.
- `Empresa` is the customer-facing organization administration center; personal user preferences/security/session belong to the user menu rather than a competing generic Settings section.
- ADR 0009 accepts `apps/core` and the Ana durable Core vertical slice. Its reviewed Core multitenant/auth and Ana V1 migrations were applied to the live Wandora Supabase database on 2026-09-14 and passed the production-safe read-only post-verifier.
- ADR 0010 accepts the least-privilege `wandora_core_runtime` database boundary. Migration `003` still creates the role credential-disabled by default; the later reviewed production activation uses a dedicated secret-file credential, `CONNECTION LIMIT 4`, no `BYPASSRLS`, and a separately versioned activated-state verifier.
- ADR 0011 accepts the private Wandora Core runtime. Core is live in database mode on private `wandora-core` + internal `wandora-data`, with no published host port, read-only root filesystem, non-root execution and `/readyz = 200` only through `wandora_core_runtime`.
- ADR 0012 accepts authenticated private Gateway → Core supervised ingress with durable receipt/idempotency semantics and no model/outbound side effect by itself.
- ADR 0013 accepts the private inbound Evolution Messaging Gateway runtime. Controlled production webhook cutover and real-handset proof are green; the inbound path itself does not authorize outbound effects.
- ADR 0014 accepts Core → Mastra deterministic supervised proposal generation behind the Wandora-owned Agent Runtime Adapter. Mastra telemetry is forced off; work remains human-supervised and no live model credential is required.
- ADR 0015 accepts **Wandora Platform Admin** as the first-party owner/operator control plane. Platform Admin controls Wandora through Wandora contracts/adapters; it must not become a reimplementation of Paperclip/Mastra/Evolution/Supabase/Portainer. Native consoles remain protected engineering/diagnostic surfaces.
- ADR 0016 accepts canonical `wandora.work_proposals` for safe supervised proposals. Migration `20260915_004_supervised_proposal_v1.sql` is live; only `commitment=none` proposals enter this boundary and stronger commitments remain on `wandora.approvals`.
- ADR 0017 accepts **Human Supervision Read V1**: Core validates Supabase ES256/JWKS Bearer sessions, resolves canonical identity and exposes the reviewed tenant-authorized `attention-required` read without provider/private leakage.
- ADR 0018 accepts **Human Session Bootstrap V1** through `GET /api/v1/me`, returning only canonical Wandora user and active organization memberships.
- ADR 0019 accepts **Web Human Session V1**: browser sign-in uses Supabase Auth directly with only the public/publishable key, session material stays in `sessionStorage`, public signup remains disabled, and reviewed Core routes consume the Bearer session.
- ADR 0020 accepts **Conversations Read V1**: the exact tenant-authorized conversations list route is live in production and remains provider-neutral.
- ADR 0021 accepts **Conversation Detail/History Read V1**: the exact tenant-authorized conversation detail route is live, returns a bounded canonical history under `REPEATABLE READ READ ONLY` + tenant RLS, and remains a read contract.
- ADR 0022 accepts **Private Messaging Gateway Outbound V1**: Core → Gateway outbound is a private, disabled-by-default capability using a dedicated directional HMAC and operator-mounted Evolution API key; the browser never sees provider configuration.
- ADR 0023 accepts **Human Send Proposal V1**: an authenticated `owner`/`admin` may authorize only an existing current canonical `send-text`, `commitment=none` proposal; browser text/recipient/provider/idempotency overrides remain forbidden and durable uncertain delivery is non-retryable.
- ADR 0024 accepts **Multi-Organization Selector V1**: multiple active tenant memberships require explicit human selection; the browser never silently selects the first tenant and Core authorization is unchanged.
- ADR 0025 accepts **Evolution Private Outbound Origin V1**: private Gateway outbound sends one code-pinned internal Origin and Evolution allows only the reviewed Origin set; wildcard CORS is not used.
- ADR 0026 accepts **Human Send Explicit Confirmation V1**: the first click only opens a confirmation and the second explicit click is required before the reviewed send POST.
- ADR 0027 accepts and is production-deployed as **Human Send Canonical Confirmation V2**: Core emits the exact masked recipient, canonical text and SHA-256 confirmation version; Web freezes that reviewed snapshot and final POST may carry only `confirmationVersion`; stale state fails before any durable attempt/Gateway call.
- ADR 0028 accepts supervised inbound active-work reuse with the reviewed fail-closed lifecycle.
- ADR 0029 defines the normal-beta supervised outbound policy; live effect switches remain off unless a separately reviewed activation occurs.
- ADR 0030 accepts private tenant provisioning V1; it does not imply the tenant/customer product path should be replaced by Platform Admin work.
- ADR 0031 accepts the inert least-privilege platform provisioner database role.
- ADR 0032 accepts a separate private Platform Admin runtime/trust plane.
- ADR 0034 makes state-first continuity mandatory: recover real state and evidence before choosing work.
- ADR 0035 connects customer `Equipe` to canonical tenant-authorized digital-employee reads; it does not decide how a full employee control plane/hiring capability is implemented.
- ADR 0036 makes the **Capability Authority / Reuse Gate** mandatory before any material new domain entity/state machine/workflow/assignment/admin subsystem. Absence from the current Wandora schema is not evidence of Wandora ownership.
- ADR 0063 separates customer `Contratar` from future `Ativar`: first catalog hire is paused + supervised and activation remains a later execution effect.
- ADR 0064 implements the gated paused-first customer hire contract in code/CI only; the runtime gate remains disabled in production until a separately reviewed rollout.
- ADR 0065 selects a fresh employee-free customer-like tenant for the first live hire canary and rejects unproven adoption of the legacy `Empresa Exemplo` Ana.
- ADR 0066 accepts Private Tenant Provisioning V2 in code/CI: V1 remains historically compatible, V2 creates organization + canonical owner with zero digital employees, and migration 012 is not live until a separate production preflight/application.
- ADR 0067 closes the Private Tenant Provisioning V2 production migration preflight: a current backup/restore proof and exact migration rehearsal/reverse proof are green, but migration 012 remains absent from production until a separate execution slice.
- ADR 0068 makes Private Tenant Provisioning V2 live as a dormant least-privilege operator capability: migration 012 is applied/verified, V2 has not yet provisioned any tenant, and customer/provider/outbound effects remain OFF.
- ADR 0069 freezes the first customer-hire canary tenant provisioning request and proves a no-password `SET LOCAL ROLE wandora_platform_provisioner` execution path; the canary tenant is still absent until a separate execution slice.
- ADR 0070 makes the employee-free `Wandora Customer Hire Canary` tenant live through V2: one active owner is reused, zero canary employees/provider state exist, and customer hire/outbound remain OFF.
- ADR 0071 freezes the first customer-hire canary Paperclip company bootstrap: exact one-shot instance-admin request, provider non-idempotency/partial-effect semantics, stop-on-ambiguity reconciliation and no coupling to custody/binding/hire.
- ADR 0072 makes the clean customer-hire canary Paperclip company live through the official one-shot instance-admin path; the company has zero agents and no Organization Adapter secret/config/Wandora binding yet.
- ADR 0073 freezes the customer-hire canary Organization Adapter binding/custody/config sequence and its ambiguity recovery; execution is blocked until Paperclip `local_encrypted` has an out-of-volume database + `master.key` recovery snapshot/proof.
- ADR 0074 freezes the Paperclip `local_encrypted` recovery snapshot: fresh official logical backup + exact `master.key` copied out of the Docker volume, hash-gated and proven by disposable PG18 restore/decryption plus wrong-key rejection before any new encrypted secret.
- ADR 0075 clears that recovery gate: the protected same-host out-of-volume snapshot is live and its DB+key pair passed disposable PG18 restore, positive decrypt/hash-match and wrong-key rejection; off-host/VPS-loss backup remains separate.
- ADR 0076 makes the clean customer-hire canary Organization Adapter wiring live: exact Wandora→Paperclip binding, deterministic Core HMAC custody, one company-owned `local_encrypted` secret and company-scoped plugin config are green while canary employees/hire operations remain zero and customer hire/outbound remain OFF.
- ADR 0077 freezes the first customer-like hire proof on the later PR #111 candidate artifact already staged and current-equivalent; execution requires a real normal Supabase owner browser session, never service-role/admin impersonation, and proves paused-first hire plus same-key/same-catalog dedupe before candidate teardown.
- ADR 0078 makes the first clean customer-like hire live and verified through the private candidate: exactly one paused + supervised Wandora Ana, one provider binding, one completed hire operation and one paused Paperclip managed Ana; same-key and different-key/same-catalog replays do not duplicate state, the candidate/session are cleaned up, and normal live hire/Human Send/Gateway outbound remain OFF.
- ADR 0079 freezes public customer-hire rollout: the global Core hire flag remains a kill switch, while customer eligibility is explicit Wandora-owned organization+catalog policy enabled only after integration wiring is validated; public rollout remains OFF pending that contract.
- ADR 0080 implements the tenant-scoped customer-hire eligibility contract in code/CI: private organization+catalog policy, dedicated NOLOGIN operator capability, Core enforcement/read projection and Web gating; migration 013 remains a separate production effect.
- ADR 0081 completes Production Activation Preflight V2 with no production effect: reviewed PR #128 candidates are accepted as current-main tree-equivalent, migration 013 remains absent, no active tenant is selected for a new hire, and the next production slice is dormant foundation only (migration 013 -> zero-row postverify -> Core -> Web) with the global hire gate OFF.
- ADR 0082 makes the customer-hire foundation live but dormant: migration 013 is applied with zero eligibility rows, the reviewed Core/Web candidates are promoted and healthy, Customer Hire/Human Send/Gateway outbound remain OFF, and the next slice is a global-runtime-gate activation preflight only.
- ADR 0083 closes the Global Runtime Gate Activation Preflight V1: the exact gate delta is one canonical Core environment overlay; zero eligibility rows **plus zero unfinished hire operations** prove no new catalog availability; global-gate-first is selected before any tenant eligibility; execution remains separate.
- ADR 0084 makes the global Customer Digital-Employee Hire runtime gate live on the same reviewed Core image: eligibility remains zero, unfinished hire operations remain zero, every active tenant projects `available=false`, and tenant rollout remains a separate eligibility effect.
- ADR 0085 closes the First Tenant Eligibility Rollout Preflight V1 with no eligible current tenant: the two Paperclip-bound tenants already have completed `ana-commercial-v1` hires, `Empresa Exemplo` has a matching legacy Ana and no control binding, eligibility remains zero, and the first rollout must wait for a separately reviewed clean target.
- ADR 0086 closes Clean Tenant Rollout Candidate Preparation Preflight V1: no real clean customer/owner target exists yet; public signup remains closed, Supabase Auth invite capability is reused, and the next code-only slice is customer invite acceptance + first-password handling before any new tenant/provider/eligibility effect.
- ADR 0087 implements Customer Owner Invite Acceptance + First Password Contract V1 in Web/code/CI only: exact GoTrue v2.196.0 implicit invite fragments are staged and cleared before render, first password is set through authenticated Supabase Auth `PUT /user`, and normal Wandora session promotion happens only after password success. It is not deployed and no real customer invite is authorized yet; interrupted-invite recovery remains the next preflight because closing the browser after one-time invite verification can discard the staged session.
- ADR 0088 closes Customer Owner Interrupted Invite Recovery Contract Preflight V1 with no production effect: normal recovery reuses public Supabase Auth `/recover` with a dedicated Wandora Web recovery route, strict `type=recovery` session staging and ADR 0087 password-finalization semantics; no Core recovery proxy/table or Auth-admin credential is justified. Live CAPTCHA is currently off and is an explicit anti-abuse activation gate before any real customer recovery.
- ADR 0089 implements Customer Owner Interrupted Invite Recovery Contract V1 in Web/code proof only: `/recover-access` uses public Supabase Auth `/recover`, invite/recovery callbacks explicitly defer to each other before render, both reuse the hardened authenticated password finalizer, and recovery request completion remains account-enumeration neutral. It is not deployed; live CAPTCHA/anti-abuse review remains a mandatory gate before the first real recovery.
- ADR 0090 closes Customer Owner Invite + Recovery Production Activation Preflight V1 without production activation: the current-main Web source and a real-publishable-key candidate are proven and rollback is image-only, but recovery remains blocked until a compatible anti-abuse control is actually observable/proven at Cloudflare edge or through a separately implemented provider-native CAPTCHA contract. Do not deploy the owner-access Web or send real recovery while that gate is open.
- ADR 0091 closes Customer Owner Recovery Edge Anti-Abuse Control Preflight V1 without mutation: the real Cloudflare zone is Free, the selected V1 edge guard is one exact-path `/auth/v1/recover` rule at 6 requests / 10 seconds / IP with a 10-second block, the existing DNS token must remain DNS-scoped, and execution is blocked until a separate zone-scoped WAF credential can read/snapshot the current single-rule slot before creating anything.
- ADR 0092 records the pre-mutation credential gate for recovery edge activation: no WAF token or reviewed secret path exists yet, the existing DNS token must not be widened, and execution must stop until an operator issues a separate one-zone Zone WAF credential and installs it under root:wandora-ops 0640 custody. No Cloudflare rule or production runtime mutation has occurred.
- ADR 0093 completes Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1: the dedicated WAF token is in reviewed root:wandora-ops 0640 custody, the previously absent Free-plan `http_ratelimit` entry point now contains exactly `wandora_owner_recovery_burst_guard_v1` at 6 requests/10s/IP with 10s mitigation, OPTIONS-only burst validation reached 429 and recovered to 200 after 12s, Auth recovery counters remained zero, direct-origin TCP stayed unreachable, and owner-access Web is still not deployed.
- ADR 0094 completes Customer Owner Invite + Recovery Web Production Activation Execution V1: current-main Web source remained unchanged from the proven candidate base, only `WANDORA_WEB_IMAGE` changed, only `wandora-web` was recreated, the exact owner-access image is healthy with zero restarts, `/login`, `/accept-invite`, `/recover-access` are 200 and unauthenticated `/api/v1/me` is 401, while recovery counters/eligibility remain zero and no real invite/recovery was sent.
- ADR 0094 completes Customer Owner Invite + Recovery Web Production Activation Execution V1: current-main Web source remained unchanged from the proven candidate base, only `WANDORA_WEB_IMAGE` changed, only `wandora-web` was recreated, the exact owner-access image is healthy with zero restarts, `/login`, `/accept-invite`, `/recover-access` are 200 and unauthenticated `/api/v1/me` is 401, while recovery counters/eligibility remain zero and no real invite/recovery was sent.
- Security gate #22 is cleared. The affected shared Supabase JWT compatibility material and shared PostgreSQL password were rotated with validated backups, old-credential invalidation, full service-health proof and production-safe verifier reruns.
- Official WhatsApp providers remain a production option behind the same gateway.
- Model vendors are replaceable infrastructure behind a provider boundary. Do not request or hard-code a provider credential until a real provider call is materially required.
- Structured Wandora-owned business/policy facts belong in durable canonical storage, not only in agent memory/RAG; this rule does not require duplicating provider-owned control-plane/runtime state.
- Human approval remains mandatory for sensitive or irreversible actions until explicit product policy says otherwise.

## 5. Preferred component shape

```text
Customer Wandora Web            Wandora Platform Admin
        \                         /
         \                       /
          -> Wandora Core/API <-
            contracts + authorization + policy
              -> Wandora-owned durable facts / Supabase PostgreSQL
              -> Organization Adapter -> Paperclip
              -> Agent Runtime Adapter -> Mastra
              -> Tool Gateway -> authenticated/direct integrations
              -> Messaging Gateway -> Evolution / Meta / other providers
              -> Model Provider -> Mistral / Chutes / OpenAI / other providers
              -> Approval / Policy boundary
```

Mastra, Paperclip, Supabase and Evolution are technologies used by Wandora. None of them is Wandora itself. Their native consoles may be used for protected engineering/diagnostics, but normal platform administration should progressively move behind Wandora-owned Platform Admin contracts and normal customer administration must remain Wandora-owned.

**Provider-neutral product contracts are wrappers/orchestration boundaries, not instructions to rebuild the provider behind them.**

## 6. Infrastructure rules

- Deploy through versioned Docker Compose / Portainer-compatible stacks unless a later ADR changes this.
- Git is the source of truth; do not make an unrecorded Portainer-only production change.
- Prefer pinned image/release versions over unreviewed `latest` tags.
- Do not expose Docker socket, PostgreSQL, Redis, internal runtimes, Paperclip internals or management APIs publicly.
- Administrative surfaces require stronger controls than customer-facing APIs.
- Frequently used operator applications may receive their own HTTPS hostname when useful, but they must remain operator-only and strongly access-controlled; a convenient URL is not permission to expose the underlying machine service directly.
- Never commit secrets, tokens, private keys, OAuth client secrets, SMTP credentials or real customer credentials. A credential that ever enters Git history must be treated as compromised and rotated before use; repository privacy does not make Git a secret store.
- Design persistent data so it can be backed up, restore-tested and moved to another VPS.
- New public hostnames must be intentional contracts, not third-party product names.
- Versioned Wandora DB migrations live under `infra/stacks/supabase/migrations/`; verifiers live under `infra/stacks/supabase/verifiers/`. Never apply SQL directly from `spikes/` to the live database.
- A migration being reviewed/merged does not mean it is already applied live. Live schema changes require explicit operational preflight, reversibility/backup awareness and post-verification.
- Before creating a new migration that adds a material product-domain concept, ADR 0036's Capability Reuse Gate must already be satisfied. A convenient PostgreSQL schema is not an architecture decision.
- A live database role existing does not justify activating its credential early. Runtime credentials are provisioned only together with the reviewed service deployment and secret-injection path that will consume them.
- Keep migration-state and activated-runtime verifiers separate when both are legitimate states; do not relax a fail-closed migration invariant merely because a later operator step intentionally activates a capability.
- A known credential exposure or rotation gate must be cleared before introducing a dependent production credential or customer traffic. Do not bypass a security gate merely because the affected environment currently has no customer rows.
- Credentials retained only in protected rollback snapshots after a completed rotation are compromised historical material; they must not be restored as steady-state credentials.
- For Core production recreation/candidate work, use the canonical host secret file `wandora_core_db_password`. Do not substitute the legacy `core-db-password` filename; a candidate using that wrong file failed readiness while the live canonical secret remained valid.
- A capability overlay existing on disk is not evidence that it is active. Verify the running container environment/configuration before describing Human Send or Gateway outbound as enabled.

## 7. Product and development discipline

Before promoting a third-party dependency into architecture:

1. verify current upstream license and deployment constraints;
2. define the Wandora-owned boundary;
3. run a small falsifiable spike/contract test;
4. record the outcome in an ADR or research note;
5. only then promote it into a product path.

### Mandatory Capability Authority / Reuse Gate

**This gate happens before local domain design, before a migration, and before the normal decision/adversarial-review cycle turns a gap into implementation.**

Before creating any material new Wandora table/entity, state machine, workflow engine, scheduler, assignment model, agent registry, integration lifecycle, control plane, admin subsystem or equivalent capability, answer:

1. What exact customer/operator capability is missing?
2. Does Paperclip, Mastra, Evolution, Supabase or another already accepted component provide all or part of it?
3. Which layer owns the underlying capability, and which semantics/IDs/policy must remain Wandora-owned?
4. What is the **minimum** Wandora durable state required — stable ID, tenant mapping, policy, projection, audit/reconciliation evidence, idempotency/version state — rather than a clone of the provider domain?
5. What Wandora-owned adapter/contract prevents raw provider IDs/schemas/authorization from leaking into Web or Platform Admin?
6. What happens if the provider is unavailable, partially succeeds or is later replaced?
7. Would the proposed Wandora-native implementation duplicate an accepted provider capability?

If question 7 is **yes**, the default is **do not build it**. A native implementation may proceed only if a newer accepted ADR gives a concrete product, security, reliability or replaceability reason that proves reuse is insufficient.

If any answer is unknown, stop the implementation and inspect/spike the relevant provider/adapter first.

The following reasoning is invalid:

> “This concept is missing from the Wandora PostgreSQL schema, so Wandora needs a new table/service for it.”

Use instead:

```text
REAL STATE + PROVEN EVIDENCE
  -> GAP
  -> CAPABILITY AUTHORITY / REUSE GATE
  -> WANDORA CONTRACT / ADAPTER
  -> MINIMAL WANDORA STATE
  -> NATIVE DOMAIN ONLY IF REUSE IS PROVEN INSUFFICIENT
```

Do not build speculative surface area. Prefer vertical slices that remove a critical uncertainty and leave a reproducible artifact.

For customer-facing work, design the human journey before the technical screen. The interface should answer who is responsible, what is happening, what needs approval and what result was produced. Do not expose technical runtime/provider concepts merely because they are easy to surface.

For platform-operator work, prefer Wandora-owned concepts and controls. Do not make Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio or Portainer a required daily workflow merely because their native UI is convenient. Promote a control into Platform Admin only after its Wandora-owned contract, authorization, audit and rollback semantics are understood. Platform Admin should exercise provider capability through adapters rather than rebuilding provider internals.

The default customer path must aim for useful work on the same day. A multi-day manual implementation dependency may exist as an assisted premium service, but it must not be required for the normal SaaS experience.

For Ana or future employees, unknown/ambiguous external side effects must fail conservatively. In particular, an uncertain message delivery must not be retried automatically unless reconciliation proves it safe.

Read-only slices must stay read-only. Do not smuggle reply/send/edit-send/dismiss/takeover or any other outbound effect into a read contract. A separately reviewed effect route does not turn `Conversas` history into an implicit composer.

A browser-supplied organization, conversation, work or proposal identifier is always a selector, never authorization evidence. Core must independently authorize active membership and keep transaction-local tenant scope + RLS.

Human Send browser requests must not supply effectful recipient/text/provider/connection/idempotency overrides. Confirmation V2's hash is optimistic-concurrency evidence, not authorization.

### Dual business perspective

For every material product or customer-journey decision, review the choice from both perspectives before execution:

1. **paying business customer** — would a normal company owner understand the value, trust the flow, reach the result without learning infrastructure, and reasonably pay for it?
2. **Wandora owner/operator** — is the capability secure, supportable, observable, scalable, commercially coherent and inexpensive enough to operate?

A choice that is technically elegant but weak from either perspective must be revised before implementation.

### Mandatory decision cycle: decision → second adversarial review → execution → validation

For every material product, architecture, infrastructure, security or deployment decision, use this sequence **after state-first recovery and the Capability Reuse Gate**:

1. **Decision** — analyze the problem and form a provisional decision with explicit premises and intended scope.
2. **Second adversarial review** — do not merely confirm the first decision. Assume it may be wrong and actively seek a concrete reason to reject it. At minimum challenge whether it is too broad, unsafe, **duplicates an accepted provider capability**, is irreversible, is based on stale/unproven state, is weaker than a simpler adapter/reuse option, is operationally unrecoverable, or is inconsistent with the dual business perspective and accepted architecture.
3. If the adversarial review finds a material objection, revise the decision and run the adversarial review again. Do not execute just because work has already been invested in the first option.
4. **Execution** — execute only after the adversarial challenge fails to invalidate the revised/current decision. Keep the change at the smallest reviewed scope and preserve rollback/fail-closed boundaries.
5. **Validation** — independently prove what actually happened. Validate runtime state, hashes/SHAs, health/readiness, route boundaries, capabilities/flags, durable side effects, database counters and rollback assumptions as applicable. CI green, successful command exit or intended configuration are not substitutes for post-execution validation.

Routine mechanical steps inside an already-reviewed decision do not each require a new design cycle, but any new material choice or contradictory evidence discovered during execution returns the work to state recovery / capability authority / decision as appropriate.

The complete practical sequence is:

**state real → evidence already proven → gaps → capability authority/reuse gate → decision → second adversarial review → execution → validation**.

## 8. Current execution order

Unless an active blocker or explicit user decision changes priority:

1. keep canonical documentation synchronized with accepted decisions and observed live operational state;
2. preserve the proven Human Session, explicit multi-organization selection, `Trabalho`, `Conversas` and now tenant-authorized `Equipe` paths;
3. finish the existing customer product by connecting remaining PARTIAL/PLACEHOLDER surfaces to the correct Wandora contract **only after** applying the Capability Authority / Reuse Gate;
4. before implementing customer digital-employee hiring/responsibility/control-plane state, audit/prove Paperclip's current capability and the Wandora `Organization Adapter`; do not revive the abandoned unmerged native `digital_employee_work_assignments` / migration 010 direction without a superseding accepted ADR that passes ADR 0036;
5. keep Human Send Canonical Confirmation V2 deployed with real outbound **disabled** unless a separately reviewed activation is intentionally executed;
6. never reuse/retry historical `uncertain` outbound attempts without a separate reconciliation contract proving it safe;
7. keep stronger commercial commitments such as discount, price, deadline and payment terms on the stronger existing approval boundary;
8. expose only exact reviewed Web action routes; generic/unreviewed `/api/` and all `/internal/` paths remain closed;
9. keep Platform Admin as a separate trust plane and build it incrementally over the same Wandora adapters; do not make it a second implementation of provider control planes or pause the customer-visible employee loop to build a generic infrastructure dashboard;
10. add customer onboarding, password recovery/OAuth and organization lifecycle around the proven authorization/adapters rather than bypassing Core;
11. only when the first real model call is materially required, revoke/replace the previously Git-exposed Mistral credential and configure the fresh value only through an approved operator-controlled secret path.

Supabase Foundation V1, Mastra Agent Runtime V1 laboratory validation, Evolution Messaging Gateway V1, Wandora Core Multi-tenant/Auth Contract V1, Human Interface/Product Shell V1, First-Day Customer Journey V1, Ana durable Core vertical slice, security gate #22, least-privilege Core runtime, supervised inbound, deterministic proposal generation, canonical `work_proposals`, Human Supervision Read, Human Session Bootstrap, Web Human Session, explicit multi-organization selection, Conversations list/history, Private Messaging Gateway Outbound code, Human Send Proposal code, Evolution private Origin fix, explicit send confirmation, Human Send Canonical Confirmation V2 and customer Team Read V1 are complete/implemented as recorded by their ADRs/evidence.

Current mutable production checkpoint reverified during ADR 0067 on 2026-09-18:

```text
canonical Git main entering preflight: fe945214b5aec824d133c9fc05b0314f2a841ab0
Core:      wandora/core:organization-adapter-candidate-068d30a49d9b
Web:       wandora/web:team-read-b31db507
Gateway:   wandora/messaging-gateway:origin-fix-94cfb4de
Paperclip: wandora/paperclip:v2026.831.1
Core/Web/Gateway/Paperclip: healthy

Organization Adapter enable flag: true
Customer Digital-Employee Hire flag: absent / OFF
Human Send enable flag: absent / OFF
Gateway outbound enable flag: absent / OFF

organizations: 2
digital employees: 3
control-plane provider bindings: 1
digital-employee provider bindings: 1
completed catalog hire operations: 1
tenant provisioning requests: 0
migration 012 / provisioning V2: LIVE + verifier green
provisioning V2 requests: 0
customer-hire canary: absent
```

These mutable values must still be reverified before execution. The controlled real delivery proofs remain historical evidence. Customer hire and outbound effects stay OFF; provisioning V2 being live does not authorize canary creation, provider bootstrap or customer hire.

## 9. Definition of progress

Progress is not the number of services, screens, tables or integrations installed. Progress means a critical product or architectural uncertainty was removed, the result is reproducible, the human experience became clearer, **existing specialist capability was reused rather than needlessly rebuilt**, the execution survived adversarial review, validation proved the resulting state, and the decision was recorded without weakening Wandora-owned boundaries.
