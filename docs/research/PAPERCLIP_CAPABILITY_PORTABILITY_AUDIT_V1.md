# Paperclip Capability & Portability Audit V1

Date: 2026-09-21  
Status: **IN PROGRESS — research/documentation only; no production effect**

## Why this audit exists

Wandora must be able to reuse Paperclip deeply without becoming inseparable from Paperclip.

The architectural rule is:

> Reuse specialist capability deeply, but couple Wandora to it only through Wandora-owned contracts/adapters.

Paperclip is the current operational provider for company/control-plane work capabilities. It is not the customer-facing product contract and it must remain replaceable.

## Evidence hierarchy

Every conclusion in this audit must identify which layer proves it:

1. **Wandora canonical repository** — product/authority decisions.
2. **Live pinned Paperclip** — production truth.
   - image: `wandora/paperclip:v2026.916.0`
   - source: `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`
3. **Live Paperclip OpenAPI + CLI** — exact API/operational surface available now.
4. **Paperclip pinned source** — exact semantics of the production version.
5. **Paperclip official docs** — intended/public contract.
6. **Paperclip current master** — upstream radar/future capability only until proven in the pinned/live version.

A capability found only on current `master` is never treated as available in production.

## Upstream snapshot for this audit

At audit start:

```text
Wandora main
  c44634ea8f03b491db32fbde9917a2b7a7fcbd16

Paperclip production
  v2026.916.0
  dffc2b3ca1b9e88fa21cb17493083e682dffd1ca

Paperclip upstream master observed
  8813a501058b29ae293fee7e94038a737d7d1594
```

The upstream master is fast-moving and must be recorded by SHA whenever it is used as evidence.

## Classification vocabulary

Each capability receives one primary disposition:

- **REUSE NOW** — available and qualified enough in the pinned/live version.
- **ADAPT** — use the provider capability behind a Wandora-owned port/adapter.
- **FUTURE** — promising upstream capability not yet available/qualified in live.
- **WANDORA OWNED** — customer/product semantic authority remains Wandora.
- **DO NOT BUILD** — planned/tempting Wandora subsystem duplicates a specialist capability and should not be created.
- **QUARANTINE** — capability exists but is experimental/insufficiently qualified for a production dependency.

## Portability model

For every material Paperclip-owned operational capability, distinguish:

```text
Semantic authority
  = who defines what the capability means to the Wandora customer/product.

Operational authority
  = who currently persists/executes the specialist state machine.

Provider
  = concrete implementation currently supplying the capability.
```

Example:

```text
Capability: durable business work

Semantic contract:
  Wandora customer-facing work semantics

Operational authority:
  Paperclip issue/run lifecycle

Current provider:
  Paperclip

Portability boundary:
  WorkOrchestrator / Organization Adapter
```

## Mandatory portability questions

For every candidate capability:

1. Does a Paperclip identifier leak into a Wandora public/customer API?
2. Does Wandora duplicate the Paperclip state machine?
3. Can provider state be correlated through stable Wandora IDs/bindings?
4. Is the provider object replaceable without changing the customer's conceptual model?
5. What minimum projection/receipt must Wandora retain for authorization, audit, idempotency, reconciliation, recovery or migration?
6. What data must be exportable to migrate to another provider?
7. Is there an explicit exit strategy?
8. Would removing Paperclip require changes outside the provider adapter + state migration?
9. Is this capability actually Paperclip core, a plugin, an adapter, an experimental feature, or only an upstream plan?
10. Is the capability present in the live pinned version or only current master?

## EXIT TEST

For every capability currently delegated to Paperclip, answer:

> If Paperclip were replaced tomorrow, which Wandora contracts would change?

Target answer:

> Only the provider adapter/binding and migration of provider-owned operational state.

If customer APIs, product concepts or unrelated Wandora services must change, portability risk is too high.

## Audit matrix schema

The final matrix must contain at least:

| Capability | Wandora semantic authority | Current operational provider | Live v916 evidence | Current master evidence | Disposition | Lock-in risk | Required Wandora port | Minimum migration/export state | Exit strategy |
|---|---|---|---|---|---|---|---|---|---|

Lock-in risk values:

- LOW
- MEDIUM
- HIGH
- CRITICAL

## Audit scope

### A. Organization and work control plane

- companies
- memberships
- agents / digital employee lifecycle
- org structure / delegation
- goals
- projects
- issues/tasks
- assignment
- runs/heartbeats
- continuation/recovery
- task watchdogs
- routines/recurrence
- execution policies
- approvals
- decisions / decision training
- attention/blocker surfaces
- task reviews
- cases
- work products/documents/attachments

### B. Execution and runtime boundaries

- external adapters
- adapter install/reload/reinstall
- run-scoped JWT / agent identity
- HTTP/webhook adapters
- execution workspaces
- runtime services
- process/remote runner semantics
- session continuity
- usage/cost reporting
- model metadata
- hot restart / task drain

### C. Tool and integration governance

- Connections
- connection intents
- MCP gateway
- tool catalog
- profiles
- policies
- action requests/approvals
- connector permission model
- responsible-user routing
- GitHub/Gmail/Google Workspace/Slack/etc.
- generic remote MCP
- Composio/direct MCP
- connector identities and revocation

### D. Skills, memory and learning

- skills catalog
- skill assignment/policy/release
- runtime skill materialization
- decision training
- evals
- memory surfaces
- runner-created skills

### E. Secrets and credentials

- company secrets
- user secrets
- responsible-user secret resolution
- secret providers
- remote import/providers
- provider credentials
- plugin secret refs
- Wandora-owned bridge/effect secrets

### F. Cost and governance

- cost events
- token usage
- budgets
- budget policies/hard stops
- model/provider attribution
- customer billing vs operational cost

### G. Extensibility

- external adapters
- Paperclip plugins
- distribution plugins
- plugin capability model
- plugin-managed agents/projects/routines/skills
- plugin UI surfaces
- plugin state/database
- compatibility/versioning
- plugin upgrade/rollback

### H. Product boundary / communication

- Paperclip Agent Chat
- chat connectors
- GitHub review agents
- Slack/Teams/Telegram/Discord/iMessage
- notifications
- customer-facing Wandora conversations
- Wandora external-effect authorization
- Evolution/WhatsApp
- email
- ERP/CRM actions

## Initial findings already proven

### 1. External adapters support the desired runtime decoupling

Paperclip explicitly treats external adapters as independently versioned runtime integrations. The existing `wandora_mastra` therefore aligns with the upstream extension model.

Disposition: **KEEP / ADAPT**.

### 2. Native Task Drain should be reused for pre-restart quiescence

Live v2026.916.0 exposes:

```text
GET    /api/instance/task-drain
POST   /api/instance/task-drain
DELETE /api/instance/task-drain
```

Pinned source proves it holds new run admission and exposes `activeRuns`, `pendingWakes` and `quiescent`.

Important portability/safety detail: drain state is process-memory only and is cleared by restart.

Disposition: **REUSE NOW** as pre-restart maintenance/quiescence guard.  
Do not build a competing Wandora scheduler/drain for this purpose.

### 3. Paperclip's plugin direction strengthens the need for Wandora ports

Current upstream master documents:

- external adapters for runtimes;
- instance plugins for additive capabilities;
- distribution-supplied plugins;
- capability-gated plugin host APIs;
- plugin-managed agents/projects/routines/skills;
- connector/tool/MCP expansion.

This increases reuse opportunities but also increases lock-in risk if Paperclip-specific concepts leak into Wandora public contracts.

Disposition: **REUSE behind Wandora ports; never expose provider objects directly**.

### 4. Current upstream is not production authority

The audit observed current Paperclip master:

```text
8813a501058b29ae293fee7e94038a737d7d1594
```

with documentation/code newer than production `dffc2b3c...`.

Capabilities found only in master remain **FUTURE** until qualified against a pinned upgrade candidate.

## Deliverables

This audit must produce:

1. updated `docs/PAPERCLIP_CAPABILITY_MAP.md`;
2. updated `docs/CAPABILITY_COLLISION_MATRIX.md` where evidence changed;
3. a new portability matrix with explicit lock-in and exit strategy;
4. a **DO NOT BUILD / STOP DUPLICATING** section;
5. a **REUSE NOW** section with immediate changes;
6. a **FUTURE WATCHLIST** for master-only capabilities;
7. an OpenAPI compatibility-gate proposal for future Paperclip upgrades;
8. an explicit recommendation on which Wandora provider ports should exist now vs later;
9. no production mutation as part of this audit.

## Execution discipline

This audit follows:

```text
REAL NOW
-> PROVEN EVIDENCE
-> GAPS
-> CAPABILITY AUTHORITY / REUSE GATE
-> DECISION
-> SECOND ADVERSARIAL REVIEW
-> DOCUMENTATION
-> VALIDATION
```

No production upgrade, plugin activation, connector enablement, migration, outbound effect or customer work is authorized by this research document.
