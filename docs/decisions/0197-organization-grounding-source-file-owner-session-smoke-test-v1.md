# ADR 0197 — Organization Grounding Source File Owner-Session Smoke Test V1

Status: **PARTIAL GREEN / UPLOAD + GROUNDING ASSOCIATION PROVED / OWNER DOWNLOAD PENDING**
Date: 2026-09-23

## Context

ADR 0196 promoted migration 018 and the customer-facing organization-grounding source-file surface to production without creating a real file.

The next proof is deliberately customer-originated: a real MEDICSPRO owner uses the normal authenticated `/company` flow. Direct SQL, direct Storage mutation, Auth-admin impersonation and service-role bypass remain prohibited.

## REAL NOW

Canonical Git entering the proof:

```text
main = 55f14bdd9e047ea1829acd735cec79e1c23e1e60
PR #255 = MERGED
open PRs = 0
```

Live services were reconciled before the owner effect:

```text
Web = wandora/web:candidate-aaada76d9806
Core = wandora/core:organization-adapter-candidate-d8349b353bb7
Paperclip = wandora/paperclip:v2026.916.0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de

Web/Core/Paperclip/Gateway/DB/Storage = healthy
restart count = 0
```

Migration 018 was already live and was not repeated.

## Owner action observed

A normal authenticated MEDICSPRO owner session used the customer Company surface.

Web access log evidence:

```text
GET  /api/v1/organizations/<MEDICSPRO>/grounding = 200
POST /api/v1/organizations/<MEDICSPRO>/grounding = 200
GET  /api/v1/organizations/<MEDICSPRO>/grounding = 200
```

The operation created exactly one Storage object:

```text
bucket = organization-grounding-sources
object count = 1
path = <MEDICSPRO>/11ad412dbe104186b3b7235aacf18a7ce7e4b81b43b0ead8d59767ce68a97be6/regras_da_casa_medicspro.pdf
size = 136312 bytes
mimetype = application/pdf
```

and exactly one new grounding association using the provider-neutral contract:

```text
entry_type = rule
status = active
provenance_type = approved_source
source_ref = wandora:grounding-source:v1:<MEDICSPRO>/11ad412dbe104186b3b7235aacf18a7ce7e4b81b43b0ead8d59767ce68a97be6/regras_da_casa_medicspro.pdf
source_label = regras_da_casa_medicspro.pdf
supersedes = none
same source_ref rows = 1
```

The entered rule text is:

```text
Sempre atenta com cordialidade e simpatia
```

No direct database or Storage mutation was used to create the customer state.

## Capability Authority / Reuse Gate

No authority changed.

- Wandora owns the meaning of official organization evidence and the grounding association.
- Supabase Storage remains the delegated private blob implementation.
- The source identity remains provider-neutral.
- The PDF remains evidence only.
- No RAG, retrieval, embeddings, chunking, runtime memory, context assembly or document subsystem was created.
- Paperclip/Mastra execution authority is unchanged.

ADR 0168 remains binding:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

## Adversarial validation

Storage remained private:

```text
authenticated object route without auth = non-success (400)
public object route without auth = non-success (400)
bucket public = false
```

The live RLS contract remains exactly two policies:

- active same-tenant member SELECT;
- active same-tenant owner/admin INSERT.

No UPDATE or DELETE policy was introduced.

Product state after the owner upload:

```text
MEDICSPRO work operations = 2
MEDICSPRO outbound attempts = 0
MEDICSPRO digital employees = 1
Storage objects in target bucket = 1
```

All critical services remained healthy with zero restarts.

No work, model call, Paperclip run, wakeup, session, outbound message or provider-side effect was caused by this upload proof.

## Remaining proof

The upload + grounding-association half of the owner-session smoke test is GREEN.

The **owner-authenticated private download path has not yet been observed in this checkpoint**. Do not mark the entire upload/download smoke test complete merely from database/object presence.

The next bounded action is for the same normal MEDICSPRO owner session to use **Baixar arquivo** from the Company detail surface.

That action should prove:

1. authenticated private download succeeds through the customer UI;
2. browser-side SHA-256 verification accepts the returned bytes;
3. unauthenticated/public access remains denied;
4. no new grounding row/object/work/outbound effect is created by download.

Do not obtain or mint the owner's JWT to simulate this proof.

## Decision

**Owner-session upload and canonical grounding association are GREEN. Full owner-session source-file smoke test remains PARTIAL until the customer performs the private download through the UI.**
