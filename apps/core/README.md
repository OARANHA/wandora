# Wandora Core

`apps/core` owns Wandora business semantics and authorization. It is the only customer-product layer allowed to coordinate canonical data, the Agent Runtime, Messaging Gateway and approval policy.

The first promoted workflow is **Ana — Assistente Comercial Digital / inbound new contact V1**.

## Current V1 responsibility

For one normalized inbound WhatsApp event, the Core domain package can execute the full durable Ana workflow:

1. validates organization and messaging-connection ownership;
2. persists one canonical contact, conversation and qualification work item;
3. persists the inbound message and durable event receipt;
4. asks the provider-neutral `AgentRuntime` for a proposed reply;
5. applies Wandora policy;
6. creates a human approval when the proposal contains a commercial commitment;
7. otherwise prepares one idempotent outbound attempt through `MessagingGateway`;
8. records canonical Wandora audit state.

That full outbound-capable service is **not** the production Gateway entry point. The live Gateway ingress uses the narrower supervised service so the current `supervised` autonomy mode cannot be bypassed merely because an outbound implementation exists in the domain package.

## Safety boundaries

- No provider/runtime ID becomes a customer-facing Wandora identity.
- Unknown delivery state becomes `delivery-uncertain`; Core does not auto-resend.
- Discount, special price, delivery deadline, payment terms and contractual commitments require an authorized human decision.
- `owner`/`admin` may decide this V1 approval; another tenant cannot.
- The browser does not receive direct table grants for Ana's Core state.
- Transactional facts live in PostgreSQL, not only in model memory.
- The live supervised ingress does not enable autonomous outbound traffic.

## Gateway → Core supervised ingress

ADR 0012 defines the production-shaped inbound boundary:

- private route `POST /internal/v1/gateway/inbound`;
- disabled unless explicitly configured;
- available only in database mode when `WANDORA_GATEWAY_INGRESS_ENABLED=true`;
- Gateway secret loaded only from `WANDORA_GATEWAY_INGRESS_SECRET_FILE`;
- HMAC-SHA256 signature over `<unix-seconds>.<raw-body>`;
- request timestamp must be within five minutes;
- only Wandora-normalized/canonical organization, connection and inbound-text fields are accepted.

The private Docker network is not treated as caller authentication. A valid HMAC proves the caller holds the dedicated Gateway secret; transaction-local tenant scope plus RLS independently prove that the supplied canonical connection belongs to the supplied organization.

A new supervised inbound event persists canonical contact/conversation/message/work/audit state, moves the work item to `attention-required` and completes the durable receipt with `supervision-required`.

The controlled production cutover and real handset proof completed on 2026-09-15 with zero approvals and zero outbound attempts. See `docs/infra/messaging-gateway-supervised-live-v1.md`.

A completed duplicate returns the stored durable result. Invalid/stale authentication fails before durable state. When the ingress feature is not configured, the private route returns 404.

## Deterministic Mastra supervised proposal

ADR 0014 introduces the first Core → Agent Runtime Adapter → Mastra integration without a model-provider credential.

Activation is explicit:

```text
WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic
```

The default is `disabled`. The deterministic mode is valid only in database mode with the authenticated supervised Gateway ingress enabled.

When enabled, `AnaSupervisedIngressService` asks the Wandora-owned `AgentRuntime` for a deterministic proposal and persists that proposal only inside the private inbound receipt result. The canonical work item still ends at `attention-required` and the receipt still ends at `supervision-required`.

This mode deliberately creates:

- no approval row;
- no outbound-attempt row;
- no outbound message;
- no model-provider call.

Only normalized customer text crosses into the Mastra workflow. Organization IDs, phone/customer address, connection IDs and provider IDs are not Mastra workflow input. Mastra-specific workflow/run metadata does not cross the Wandora adapter boundary.

The Compose activation overlay is `infra/stacks/core/compose.agent-runtime-deterministic.yaml`. Merging the code does not apply that overlay to production.

## Database runtime boundary

`wandora_core_runtime` is the least-privilege PostgreSQL identity for the Core. It has no `BYPASSRLS`, database/role administration or provider-binding access.

Every repository transaction sets `wandora.organization_id` transaction-locally before tenant-owned queries. PostgreSQL RLS therefore provides defense in depth and the tenant scope disappears automatically after commit/rollback, including when pool connections are reused.

Migration `003` creates the role disabled by default. Production later activated it through a separate reviewed operation with a dedicated credential and `CONNECTION LIMIT 4`; the migration itself still never embeds or activates a production password.

Canonical audit writes go through `wandora.append_core_audit(...)`; the runtime does not receive direct read/update/delete access to the audit table.

## Private runtime process

`src/runtime/main.ts` is the deployable private Core process. Its operational endpoints are:

- `GET /healthz` — process health;
- `GET /readyz` — business readiness.

The process can start in explicit `standby` mode without a database secret. Database mode accepts only the canonical `wandora_core_runtime` user and reads its password from a mounted secret file rather than an environment variable. Readiness becomes green only when PostgreSQL confirms the expected role and an unscoped pooled connection.

The private runtime has no public hostname or published host port. See `infra/stacks/core/`.

### Database secret file

The production container remains the non-root image `node` user. A host-managed database-password file must therefore not rely on host UID ownership alone.

Use these rules for database activation:

- keep the secret outside Git/chat and outside container environment variables;
- store it in an operator-controlled directory;
- mode the secret `0640` or stricter, never world-readable;
- keep the file group-owned by the intended operator group;
- set `WANDORA_CORE_SECRET_GID` to that group's numeric GID when applying `compose.database.yaml`;
- the overlay adds only that numeric group as a supplemental group to the non-root Core process.

This lets the Node process read the mounted secret without running as root or widening the file to `0644`.

## Verification

From repository root:

```bash
./apps/core/scripts/verify-ana-v1.sh
```

The verifier uses disposable `supabase/postgres:17.6.1.136` plus pinned Node 22.23.2, applies the reviewed migrations, runs SQL invariants/read-only production verifiers, strict TypeScript and integration tests, then destroys the disposable environment.

The test harness deliberately separates fixture administration from the actual runtime identity. Application behavior is executed as `wandora_core_runtime`. The Core CI also validates the deterministic Agent Runtime Compose overlay together with database + supervised ingress overlays.
