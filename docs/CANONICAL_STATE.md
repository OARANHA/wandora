# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-16**

Authority order: `AGENTS.md` → accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

Do not ask the user to reconstruct decisions already recorded here. Do not silently reopen accepted boundaries. When a local implementation idea conflicts with the capability-authority map, stop and resolve the boundary before writing code or migrations.

## Product thesis

Wandora is a company-operating layer built around human and digital employees. It is not a CRM-with-AI and not a generic agent builder.

A normal customer sees company, team, responsibilities, work, conversations, approvals and outcomes. Supabase, Paperclip, Mastra, Evolution, model providers, RLS, provider IDs, prompts, tokens and infrastructure topology remain implementation details.

The central architecture principle is:

> **Wandora owns the product contract, vocabulary, stable product identity, authorization and policy. Specialist components lend capabilities through Wandora-owned adapters. Wandora ownership of a contract does not imply Wandora-native reimplementation of the underlying capability.**

Every material next step follows:

```text
REAL NOW
  -> PROVEN EVIDENCE
  -> GAPS
  -> CAPABILITY AUTHORITY / REUSE GATE
  -> DECISION
  -> SECOND ADVERSARIAL REVIEW
  -> EXECUTION
  -> VALIDATION
```

See ADRs 0034 and 0036.

## Capability authority — CURRENT

- **Wandora Web / Platform Admin** — customer/operator experience and Wandora vocabulary.
- **Wandora Core/API** — product contracts, tenant/platform authorization, policy, supervision, orchestration, stable Wandora IDs and provider-neutral adapters.
- **Supabase** — identity/session and PostgreSQL/data infrastructure for Wandora-owned durable facts, mappings, projections, policy/audit/reconciliation state.
- **Paperclip** — selected organization/control-plane capability candidate behind `Organization Adapter`; current VPS instance is healthy/private, but the production Wandora adapter still needs explicit proof before customer hiring/control-plane paths depend on it.
- **Mastra** — accepted/live execution runtime behind `Agent Runtime Adapter`.
- **Evolution** — accepted WhatsApp transport behind Wandora Messaging Gateway.
- **Model providers** — replaceable inference providers behind runtime/provider boundaries.
- **Docker / Portainer / Traefik / Cloudflare** — deployment/runtime/edge capability, not Wandora product-domain models.

Native provider consoles are protected operator/engineering/diagnostic surfaces. They are not the normal customer product and do not replace Platform Admin.

## Human experience — CURRENT

Public customer application:

- `https://app.wandora.com.br`
- login at `/login`;
- `/start` remains the First-Day Customer Journey product contract/preview surface until its remaining production actions are wired.

Navigation:

- `Início`
- `Equipe`
- `Trabalho`
- `Conversas`
- `Aprovações`
- `Empresa`

Current surface classification:

- **REAL:** Human Session/login, explicit multi-organization selection, `Equipe` read, `Trabalho`, `Conversas` list/history, supervised Confirmation V2 code/path.
- **PARTIAL / PLACEHOLDER:** portions of `Início`, `Aprovações`, `Empresa`, onboarding/start production actions and broader integrations depending on the specific screen/action.

Do not reconstruct REAL surfaces from zero. Close only actual gaps after the Capability Reuse Gate identifies the correct component/adapter.

## Customer Team Read V1 — LIVE

PR #71 connected the existing `Equipe` screen to canonical tenant-authorized Wandora employee data.

Reviewed route:

```text
GET /api/v1/organizations/:organizationId/digital-employees
```

Properties:

- active tenant membership/organization are revalidated inside the read transaction;
- RLS independently scopes the data;
- the Web no longer invents Clara or fake learning progress;
- customer language remains business-first;
- no hiring/control-plane mutation was introduced.

This read projection does **not** decide the final employee hiring/control-plane architecture.

## Live runtime — CURRENT

Merged source after Team Read:

```text
main: b31db507b225bb03ebd221c8f05b111fe100e25d
```

Live images:

```text
Core:    wandora/core:team-read-b31db507
Web:     wandora/web:team-read-b31db507
Gateway: wandora/messaging-gateway:origin-fix-94cfb4de
```

Post-promotion proof:

```text
Core health/ready: 200 / 200
Web health: healthy / public healthz 200
Gateway: healthy
public Team route without Bearer: 401
unreviewed Team subpath: 404
public /internal route: 404
organizations: 2
digital employees: 2
active employees: 2
paused employees: 0
Human Send enable flag: absent
Gateway outbound enable flag: absent
```

The Team Read promotion changed no customer business rows.

## Supervised WhatsApp loop — PROVEN

The real product path has already been proven through controlled live work:

```text
WhatsApp
  -> Evolution
  -> Messaging Gateway
  -> Wandora Core
  -> Mastra deterministic Agent Runtime
  -> canonical supervised proposal
  -> customer review in Trabalho
  -> Canonical Confirmation V2
  -> Gateway / Evolution
  -> message observed on authorized handset
```

Current external-effect switches were returned to OFF after controlled proof.

Historical state after the controlled proofs:

```text
outbound attempts: 4
uncertain: 2
succeeded: 2
canonical outbound messages: 2
```

Historical `uncertain` attempts must never be blindly retried without reconciliation proving safety.

## Supabase / canonical Wandora state

Supabase is data/auth infrastructure, not the Wandora business backend and not automatically the owner of every product capability.

Current beta Wandora state includes organizations/users/memberships, provider-neutral messaging connections, the current employee projection, contacts, conversations, messages, current qualification work, supervised proposals, approvals and audit evidence.

These tables exist because the current vertical slice required them. Their existence is **not precedent** for expanding Wandora Core into a full organization/agent-control-plane implementation.

Before adding hiring, employee hierarchy, responsibility assignment, task/control-plane lifecycle or analogous concepts, ADR 0036 requires provider-capability analysis first.

## Paperclip — CURRENT

Paperclip is running privately on the VPS:

```text
container: wandora-paperclip
image: wandora/paperclip:v2026.831.1
health: healthy / API health 200
deployment mode: authenticated
deployment exposure: private
```

ADR 0003 already selected it as the leading organization/control-plane candidate behind an explicit Wandora `Organization Adapter`.

Important current boundary:

- Paperclip is **not yet** a proven synchronous dependency of customer hiring;
- its current APIs/capabilities must be audited/spiked through the Wandora adapter before promotion;
- Paperclip IDs/schemas/auth semantics must not become public Wandora contracts;
- Paperclip failure/reconciliation/idempotency behavior must be explicit before customer dependency;
- we must not rebuild a mini-Paperclip inside Core while that audit is pending.

## Mastra — CURRENT

Mastra is accepted and live behind Wandora's `AgentRuntime` boundary in deterministic supervised mode.

Mastra provides execution capability. It does not own:

- Wandora tenancy;
- human membership/authorization;
- public digital-employee identity;
- customer-facing messaging contracts;
- human approval policy.

No real model provider credential is required by the current deterministic path.

## Evolution / Messaging Gateway — CURRENT

Evolution supplies WhatsApp transport behind Wandora Messaging Gateway.

The browser/customer never consumes Evolution identifiers or credentials. Provider-specific details stay behind private bindings and the Gateway contract.

Inbound is live/proven. Outbound code is deployed but disabled by explicit absence of the enable flag after controlled proofs.

## Platform Admin — CURRENT DIRECTION

ADR 0015 defines Platform Admin as Wandora's first-party operator cockpit.

It controls Wandora and exercises specialist capabilities through Wandora contracts/adapters. It must not become:

- a stitched set of provider UIs;
- a second Paperclip;
- a second Mastra Studio;
- a second Evolution Manager;
- a second Supabase Studio;
- a generic infrastructure dashboard.

Customer administration and Platform Admin remain separate trust planes.

Completed platform-admin foundations already exist (private runtime skeleton and inert least-privilege provisioner boundary), but customer product completion currently has priority. ADR 0033 provisioning API work remains frozen unless explicitly reprioritized.

## Abandoned native assignment direction — DO NOT REVIVE BY CONVENIENCE

A provisional branch briefly explored a native `digital_employee_work_assignments` domain / migration 010 after discovering that current beta inbound routing chooses the existing commercial employee through local Core state.

The architectural review rejected proceeding before re-evaluating Paperclip.

Facts:

- the provisional migration 010 was **never merged**;
- it was **never applied in production**;
- the provisional Core routing change was **never merged/deployed**;
- the working branch was force-reset back to `main@b31db507...` before the capability-authority documentation branch was created.

Do not recreate that direction unless a later accepted ADR explicitly passes ADR 0036 and proves the Paperclip capability/adapter insufficient.

## Mandatory Capability Reuse Gate

Before a new material Wandora table/entity/state machine/workflow/scheduler/assignment model/agent registry/integration lifecycle/admin subsystem is designed, answer:

1. What exact customer/operator capability is missing?
2. Does Paperclip, Mastra, Evolution, Supabase or another accepted component already provide all or part of it?
3. Which layer should be authoritative for the underlying capability?
4. What minimum Wandora-owned state is genuinely required?
5. What adapter keeps provider IDs/schema/auth semantics out of Web/Platform Admin?
6. What happens on provider failure/partial success/replacement?
7. Would the local proposal duplicate provider capability?

If duplication is likely or ownership is uncertain, **implementation is blocked** until the provider/adapter is inspected.

## Next executable direction

The customer product remains the priority, but no new customer control-plane domain should be invented blindly.

For digital-employee hiring/activation, the next correct slice is:

```text
Paperclip capability/API audit
  -> define/prove Wandora Organization Adapter contract
  -> determine minimum Wandora employee mapping/policy/projection state
  -> prove failure/idempotency/reconciliation semantics
  -> only then wire customer “Contratar/Ativar funcionário”
```

Mastra execution and Evolution messaging remain behind their already accepted adapters.

After this authority boundary is proven, continue converting remaining customer PARTIAL/PLACEHOLDER surfaces to real actions without rebuilding existing specialist capabilities.

## Operational discipline

- Git is source of truth for versioned infrastructure/docs/code.
- A merged migration is not automatically live; production schema changes require separate preflight/backup/verification.
- Provider consoles remain private/operator-only.
- No public PostgreSQL/Docker socket/internal runtime/provider management APIs.
- Secrets/credentials never enter Git.
- The previously Git-exposed Mistral credential is compromised historical material and must never be reused; request a fresh token only when a real model call is materially required.
- External side effects fail conservatively; uncertain delivery is not automatically retried.
- Browser-supplied IDs are selectors, never authorization evidence.
- Read contracts stay read-only unless a separately reviewed effect contract exists.

## Definition of progress

Progress is not more tables, screens, services or integrations.

Progress means:

- real current state was recovered correctly;
- existing proven work was preserved;
- the actual product gap was identified;
- capability authority was checked before local design;
- mature specialist capability was reused where appropriate;
- Wandora-specific value/policy remained Wandora-owned;
- the decision survived adversarial review;
- execution was validated against the actual resulting state.
