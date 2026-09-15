# Conversations Read V1 — Production Activation

Date: 2026-09-15

## Scope

This record documents the production activation of ADR 0020 after PR #45 merged at `ae6177a3732b58c2d6f14403f9dc029a174c1712`.

The activation was read-only. It introduced no migration, no grant expansion, no approval action and no outbound action.

## Promoted images

```text
Core: wandora/core:conversations-read-ae6177a3
Web:  wandora/web:conversations-read-ae6177a3
```

Rollback images preserved at activation time:

```text
Core: wandora/core:human-session-82aacc6d
Web:  wandora/web:web-human-session-76698780
```

## Candidate proof before promotion

A private Core candidate was started with the same production runtime overlays and the canonical Core database secret file.

The first candidate attempt returned `readyz=503` because the temporary command referenced a legacy host filename, `core-db-password`, instead of the canonical live file `wandora_core_db_password`. No production secret was changed. After correcting only the candidate mount path, the candidate proved:

```text
/healthz = 200
/readyz = 200
/api/v1/me = 401 without Bearer session
/api/v1/organizations/<org>/work/attention-required = 401 without Bearer session
/api/v1/organizations/<org>/conversations = 401 without Bearer session
/api/v1/organizations/<org>/conversations/not-reviewed = 404
```

A private Web candidate was then connected only to that Core candidate and proved the same exact-route boundary plus `/internal/v1/gateway/inbound = 404`.

## Production smoke

Core was promoted first. After recreation it remained healthy and ready:

```text
/healthz = 200
/readyz = 200
/api/v1/me = 401 without Bearer session
/api/v1/organizations/<org>/conversations = 401 without Bearer session
/api/v1/organizations/<org>/conversations/not-reviewed = 404
```

Web was promoted only after the Core proof. Public smoke through `https://app.wandora.com.br` established:

```text
/ = 200
/login = 200
/healthz = 200
/api/v1/me = 401 without Bearer session
/api/v1/organizations/<org>/work/attention-required = 401 without Bearer session
/api/v1/organizations/<org>/conversations = 401 without Bearer session
/api/v1/organizations/<org>/conversations/not-reviewed = 404
/internal/v1/gateway/inbound = 404
```

## Authenticated browser proof

The provisioned Empresa Exemplo owner signed in through the normal browser flow. Web access logs then showed the reviewed human paths succeeding:

```text
GET /api/v1/me = 200
GET /api/v1/organizations/e0000000-0000-4000-8000-000000000001/conversations = 200
```

The customer UI rendered canonical data for `Mariana Exemplo`, the latest canonical inbound message and the assigned digital employee `Ana`. The UI exposed no reply/send action.

No password, refresh token or access token was copied into operator notes or chat.

## No-side-effect proof

After the authenticated read, Empresa Exemplo remained:

```text
approvals = 0
outbound_attempts = 0
outbound_messages = 0
provider_bindings = 0
```

The provider-binding check joins `wandora_private.messaging_provider_bindings.connection_id` to canonical `wandora.messaging_connections.id`; the private binding table does not itself carry `organization_id`.

## Cleanup

Only the temporary candidates created for this activation were removed after production verification:

- `wandora-core-conversations-candidate`;
- `wandora-web-conversations-candidate`;
- `wandora-conversations-candidate` network.

Older rehearsal/probe containers were intentionally not broad-cleaned.

## Result

Conversations Read V1 is production-active and proven through the full authenticated browser → Web → private Core → PostgreSQL path. The next product slice must remain separately reviewed; conversation history/detail and any human outbound action are not implied by this activation.
