# Conversation Detail/History Read V1 — Production Activation

Date: 2026-09-15
Status: **LIVE / VERIFIED**

## Scope

This note records the production activation of ADR 0021 only.

Activated customer route:

```text
GET /api/v1/organizations/:organizationId/conversations/:conversationId
```

The slice is read-only. It introduces no reply/send/edit-send/dismiss/takeover/approval action, no migration, no grant expansion and no provider/runtime identifier in the customer contract.

## Reviewed source

PR #47 was squash-merged to `main` as:

```text
2105f6e3c7f4ad07924210ccc039d5ff91ce5a79
```

The reviewed PR head passed:

```text
Core CI #84: success
Web CI #21: success
Messaging Gateway CI #53: success
```

## Build provenance

The production build contexts were derived from the already-proven `ae6177a3` Core/Web contexts and only the four runtime files changed by PR #47 were applied.

The resulting file hashes were checked against the merged GitHub blobs before build:

```text
Core runtime/human-supervision.ts = 1cc035d3a9ce705e930fc0d025f1f822864d9bf0
Core supervision/human-read.ts    = 7280440f8f1b9a432ccb60b60002a78f88eae0e7
Web nginx.conf                    = 67d45e058b12ff050339f368a1dbc19ca1493af3
Web ConversationsPage.tsx         = e0fbae1fd948318a5bac54c17c68e1cfc2399913
```

Core and Web Docker builds both passed their embedded TypeScript checks/builds.

## Candidate proof

Private candidates were started before production replacement.

Core candidate proved:

```text
/healthz = 200
/readyz = 200
/api/v1/me = 401 without session
/conversations = 401 without session
/conversations/:conversationId = 401 without session
/conversations/:conversationId/messages = 404
```

Web candidate proved:

```text
/ = 200
/login = 200
/healthz = 200
/api/v1/me = 401 without session
/conversations = 401 without session
/conversations/:conversationId = 401 without session
/conversations/:conversationId/messages = 404
/internal/v1/gateway/inbound = 404
```

The Core candidate reproduced the live hardening boundary: non-root Node user, read-only filesystem, `cap_drop=ALL`, `no-new-privileges`, private networks and the canonical `wandora_core_db_password` secret file.

## Production promotion

Promotion order was Core first, Web second.

Live images after activation:

```text
Core: wandora/core:conversation-history-2105f6e3
Web:  wandora/web:conversation-history-2105f6e3
Gateway unchanged: wandora/messaging-gateway:inbound-v1-2a49c066
```

Post-Core promotion, before Web promotion:

```text
Core healthz = 200
Core readyz = 200
Gateway remained healthy
```

Post-Web promotion public smoke through `app.wandora.com.br`:

```text
/ = 200
/login = 200
/healthz = 200
/api/v1/me = 401 without session
/conversations = 401 without session
/conversations/:conversationId = 401 without session
/conversations/:conversationId/messages = 404
/internal/v1/gateway/inbound = 404
```

The production Web bundle contains the read-only/history UI markers and the stable Supabase Auth URL.

## Authenticated browser proof

The provisioned Empresa Exemplo owner refreshed the real customer Web and selected the canonical conversation.

Server access evidence showed:

```text
GET /api/v1/me = 200
GET /api/v1/organizations/<Empresa Exemplo>/conversations = 200
GET /api/v1/organizations/<Empresa Exemplo>/conversations/<Mariana Exemplo conversation> = 200
```

The browser rendered:

```text
Empresa Exemplo
Gestor Exemplo
Mariana Exemplo
Acompanhada por Ana
canonical received message history
Somente leitura
```

No customer password, Supabase Auth UUID, access token or refresh token is recorded in this runbook.

## No-side-effect proof

After the authenticated list/detail reads:

```text
approvals = 0
outbound_attempts = 0
outbound_messages = 0
provider_bindings = 0
```

`provider_bindings` is verified through `wandora_private.messaging_provider_bindings` joined to canonical messaging connections by `connection_id`.

## Rollback

The immediately previous images remain available:

```text
Core previous: wandora/core:conversations-read-ae6177a3
Web previous:  wandora/web:conversations-read-ae6177a3
```

Pre-promotion operational snapshots were stored under:

```text
/home/wandora-admin/backups/conversation-history-20260915T214558Z
```

The backup path is an operator artifact, not a secret store.

## Result

ADR 0021 is live and verified. The customer now has enough provider-neutral conversation context to review the recent canonical history, while every response/outbound action remains blocked pending a separately reviewed human action contract.
