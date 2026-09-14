# Wandora Core

`apps/core` owns Wandora business semantics and authorization. It is the only customer-product layer allowed to coordinate canonical data, the Agent Runtime, Messaging Gateway and approval policy.

The first promoted workflow is **Ana — Assistente Comercial Digital / inbound new contact V1**.

## Current V1 responsibility

For one normalized inbound WhatsApp event, the Core:

1. validates organization and messaging-connection ownership;
2. persists one canonical contact, conversation and qualification work item;
3. persists the inbound message and durable event receipt;
4. asks the provider-neutral `AgentRuntime` for a proposed reply;
5. applies Wandora policy;
6. creates a human approval when the proposal contains a commercial commitment;
7. otherwise prepares one idempotent outbound attempt through `MessagingGateway`;
8. records canonical Wandora audit state.

## Safety boundaries

- No provider/runtime ID becomes a customer-facing Wandora identity.
- Unknown delivery state becomes `delivery-uncertain`; Core does not auto-resend.
- Discount, special price, delivery deadline, payment terms and contractual commitments require an authorized human decision.
- `owner`/`admin` may decide this V1 approval; another tenant cannot.
- The browser does not receive direct table grants for Ana's Core state.
- Transactional facts live in PostgreSQL, not only in model memory.
- This package does not enable autonomous production traffic by itself.

## Database runtime boundary

`wandora_core_runtime` is the least-privilege PostgreSQL identity for the Core. It has no `BYPASSRLS`, database/role administration or provider-binding access.

Every repository transaction sets `wandora.organization_id` transaction-locally before tenant-owned queries. PostgreSQL RLS therefore provides defense in depth and the tenant scope disappears automatically after commit/rollback, including when pool connections are reused.

The production migration leaves this login disabled for real use (`CONNECTION LIMIT 0`, no password). Credential activation/storage is a separate operator-controlled production step.

Canonical audit writes go through `wandora.append_core_audit(...)`; the runtime does not receive direct read/update/delete access to the audit table.

## Private runtime process

`src/runtime/main.ts` is the first deployable Core process. It exposes only private operational endpoints in V1:

- `GET /healthz` — process health;
- `GET /readyz` — business readiness.

The process starts in explicit `standby` mode without a database secret. In that state health is green while readiness stays closed. Database mode accepts only the canonical `wandora_core_runtime` user and reads its password from a mounted secret file rather than an environment variable. Readiness becomes green only when PostgreSQL confirms the expected role and an unscoped pooled connection.

The private runtime has no public hostname or published host port. See `infra/stacks/core/`.

## Verification

From repository root:

```bash
./apps/core/scripts/verify-ana-v1.sh
```

The verifier uses disposable `supabase/postgres:17.6.1.136` plus pinned Node 22.23.2, applies the reviewed migrations, runs SQL invariants/read-only production verifiers, strict TypeScript and integration tests, then destroys the disposable environment.

The test harness deliberately separates fixture administration from the actual runtime identity. Application behavior is executed as `wandora_core_runtime`, currently with 17/17 tests green, plus a production image/standby smoke proof.
