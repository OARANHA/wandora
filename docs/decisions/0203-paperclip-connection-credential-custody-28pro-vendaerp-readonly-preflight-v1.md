# ADR 0203 — Paperclip Connection Credential Custody + 28PRO VendaERP Read-Only Connection Preflight V1

Status: **COMPLETE / REUSE PAPERCLIP CONNECTIONS + SECRETS / LIVE CONNECTION NOT YET AUTHORIZED**
Date: 2026-09-23

## Context

ADR 0202 introduced the provider-neutral Business System read contract and VendaERP read-only adapter with no production effect.

The next requirement is to connect the real 28PRO organization to its VendaERP account while preserving provider portability, tenant authorization, secret safety and the mobile/conversational product direction.

This preflight performs no credential creation, no Paperclip company creation, no provider binding, no VendaERP API call and no production mutation.

## Real state

- canonical Wandora main at preflight start: `0389b2db1b90ee02bd387bda690dde1a4580ce25`;
- open PRs: 0;
- Paperclip production image: `wandora/paperclip:v2026.916.0`;
- Paperclip runtime healthy, restart 0;
- pinned Paperclip source: `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`;
- 28PRO onboarding completed in ADR 0201;
- onboarding intentionally created no Paperclip company/provider binding and no digital employee;
- existing `wandora_private.control_plane_provider_bindings` can store one organization-to-control-plane provider company reference, but its current semantics are Paperclip control-plane binding and must not be repurposed blindly for a second connection model.

## Proven Paperclip capability

Paperclip v2026.916.0 already provides the relevant operational primitives:

- company-scoped secrets;
- `local_encrypted` secret provider already proven in Wandora production;
- Tool Connections;
- organization/user/agent grants;
- company/agent installs;
- responsible-user routing;
- run-bound secret access;
- REST and MCP connection transports;
- multiple credential references;
- credential placement in HTTP headers;
- connection health/catalog/audit primitives.

`McpConnectionCredentialRef` supports:

```text
name
secretId
version/latest
placement = header | env | url
key
prefix
```

`ToolConnection` supports multiple `credentialRefs` and `credentialSecretRefs`.

Therefore the VendaERP credential set can be represented without a Wandora secret store:

```text
Authorization-Token -> Paperclip secret -> header credential ref
User                -> Paperclip secret -> header credential ref
App                 -> Paperclip secret -> header credential ref
```

Paperclip validation also rejects sensitive values placed directly inside ordinary connection config and instructs callers to use credential secret references instead.

## Secret-resolution boundary

The Paperclip Board/company APIs expose secret metadata and write/rotation operations but do not expose arbitrary plaintext secret reads to Wandora Core.

Plaintext agent secret resolution is deliberately run-bound through `/agents/me/secrets/:key/value` and requires authenticated agent/run context.

This is a desirable security boundary.

Rejected design:

```text
Wandora Core -> Paperclip Board API -> read plaintext ERP token -> call VendaERP
```

That path is not supported by the reviewed provider contract and would weaken the existing secret authority boundary.

## Tool Gateway evidence

The pinned Paperclip Tool Gateway resolves connection grant secret references internally and injects header credentials at execution time.

The reviewed implementation iterates all connection `credentialRefs` with `placement=header`, resolves the matching granted secret and constructs provider request headers without returning those secret values to the caller.

This is structurally capable of representing the three VendaERP headers while keeping credentials inside Paperclip custody.

However Paperclip Tool Gateway remains **QUARANTINED** by the canonical capability map. Existing capability is not equivalent to Wandora production qualification.

Therefore this ADR does not activate or depend on Tool Gateway in production.

## 28PRO Paperclip-company prerequisite

Paperclip Connections are company-scoped.

The first-access onboarding contract deliberately does not create a Paperclip company. This remains correct: a customer should not acquire provider control-plane state merely by creating a Wandora account.

For a real ERP connection, Paperclip may need a provider company container only when the customer explicitly chooses to connect a business system.

That lazy materialization must be separately reviewed and reconciled behind the Organization Adapter. It must not imply:

- employee hire;
- agent creation;
- agent activation;
- work creation;
- Mastra execution;
- messaging/outbound.

## Authority decision

### Semantic authority

Wandora owns:

- `Business System / ERP` customer contract;
- tenant authorization;
- customer-facing integration status;
- read/write capability policy;
- mobile/conversational identity and role semantics;
- external-effect authorization;
- provider-neutral business operations.

### Durable product state

No new integration/secret table is approved.

Minimum future Wandora state may be limited to stable integration identity/binding, policy and reconciliation evidence if required after provider qualification.

### Operational authority

Paperclip Connections/grants/secrets is accepted as the preferred operational authority candidate for ERP credential identity, grants and secret custody.

### Runtime/tool execution

Mastra remains the runtime tool execution authority generally.

For Paperclip connection-backed REST credentials, the Paperclip Tool Gateway may act as credential-injection/broker infrastructure only after a dedicated qualification proves that it can enforce the Wandora-approved read-only surface without leaking provider state or gaining external-effect authority.

### Provider implementation

VendaERP remains only the first ERP provider.

## Mobile/conversational invariant

The future experience remains:

```text
WhatsApp/app/chat address
-> verified Wandora identity/contact
-> organization relationship/role
-> Wandora capability/effect authorization
-> digital employee/work runtime
-> provider-neutral ERP operation
-> Paperclip connection/grant/secret boundary
-> VendaERP adapter/provider
```

A telephone number alone never authorizes ERP access.

ERP customer/supplier records may be mapped to commercial relationships, but they never become Wandora authentication authority.

## Second adversarial review

Rejected:

- a new Wandora tenant secret manager;
- storing VendaERP token/User/App in organization profile or digital employee state;
- exposing secret values to browser/customer APIs;
- making onboarding always create a Paperclip company;
- direct Core plaintext secret retrieval from Paperclip Board APIs;
- enabling all VendaERP endpoints because credentials are present;
- adopting Tool Gateway merely because it exists;
- allowing ERP connection to create/hire/activate an employee.

Accepted:

- Paperclip secret custody;
- Paperclip organization/user/agent grant model;
- multiple header credential refs for VendaERP;
- lazy provider-company materialization only on explicit integration intent;
- separate Tool Gateway qualification before live use;
- read-only first activation.

## Decision

The 28PRO real VendaERP token must **not** be entered yet.

The next implementation slice is:

**Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 — CODE ONLY / NO EFFECT**

It must prove:

1. how an existing Wandora organization lazily obtains/reuses exactly one Paperclip company binding for integrations without hiring an employee;
2. a narrow Organization Adapter operation for connection-container reconciliation, idempotent and independently auditable;
3. a VendaERP Paperclip connection shape with exactly three secret-backed headers;
4. organization-scoped grant semantics and later agent-install semantics;
5. a Tool Gateway invocation path limited to the ADR 0202 read contract;
6. no arbitrary URL/tool/provider leakage to customer contracts;
7. no mutation endpoints exposed;
8. no credential value crosses into Wandora Web, customer API payloads, logs, model prompts or durable Wandora tables.

Only after that slice is exact-head GREEN should a separate **28PRO VendaERP Read-Only Connection Activation Preflight** request the real token and perform the first provider call.

## Exit result

**PREFLIGHT COMPLETE.**

Paperclip is capable of owning VendaERP credential custody and connection grants without a new Wandora secret subsystem. Live activation is intentionally blocked until the Paperclip company-container and REST Tool Gateway read-only boundaries are qualified.
