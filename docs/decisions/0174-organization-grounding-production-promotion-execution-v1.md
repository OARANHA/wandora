# ADR 0174 — Organization Grounding Production Promotion Execution V1

Status: **PARTIALLY EXECUTED / SAFE STOP / WEB ROLLED BACK / NO CUSTOMER GROUNDING**  
Date: 2026-09-22

## Context

ADR 0173 qualified a coordinated production promotion for migration 017, the grounding-aware Core from ADRs 0170/0171, and the `/company` customer surface from ADR 0172.

The execution contract required: fresh execution-time backup + restore-check → migration/verifier → bounded Core candidate proof → Core promotion → bounded Web candidate validation → Web promotion → final validation → STOP. Real MEDICSPRO grounding, model calls, customer work and outbound effects remained forbidden.

## REAL NOW entering execution

Canonical repository state:

```text
main = 1a97f8bfc657fa6b3f1a0ded7771e304e530f8e3
PR #230 = merged
open PRs = 0 at execution start
```

Live baseline:

```text
Core      = wandora/core:organization-adapter-candidate-61cbb34d4bfd
Web       = wandora/web:candidate-65908b76c667
Paperclip = wandora/paperclip:v2026.916.0
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de
all four  = healthy / restart 0

migration 017 = ABSENT
MEDICSPRO works = 2
MEDICSPRO Ana = exactly 1 active + supervised
MEDICSPRO outbound attempts = 0
grounding rows = 0
Human Send = OFF
Gateway outbound = OFF
```

The exact Core and Web artifact ZIP digests matched ADR 0173.

## Execution-time rollback asset

A new execution-time dump was created before the first live schema mutation:

```text
/home/wandora-admin/executions/
organization-grounding-production-promotion-execution-v1-20260922T122703Z/
  wandora-pre-017.dump
  wandora-pre-017.dump.sha256
```

Properties:

```text
directory mode = 0700
dump mode      = 0600
dump sha256    = f0892637b1634e7baaf47a25c1cc6fb958583c8933aca270fccfee7c40dc14da
format         = PostgreSQL custom / pg_dump -Fc
schemas        = wandora + wandora_private
source PG      = 17.6
```

The exact dump restored successfully in an isolated `supabase/postgres:17.6.1.136` container using native `supabase_admin` plus the reproduced non-secret Wandora role shapes.

Restore readback:

```text
RESTORE_OK
organization_grounding_entries = ABSENT
organizations = 4
```

The disposable restore container was removed after validation.

## Migration 017 execution

Canonical source hashes were revalidated immediately before mutation:

```text
migration 017 =
bc14aedf77b2a12ab1e9d022fa7fddaa4ac3ec343c18f65f700755dd268a2fdd

canonical verifier =
6c63c586101df1f8fd7ab2638663ea035f7878698d18c7149838987edd7fa2d7
```

Migration 017 was applied exactly once to production.

The canonical verifier returned:

```text
ORGANIZATION_GROUNDING_CONTRACT_V1_OK
```

Post-verifier readback:

```text
wandora.organization_grounding_entries = PRESENT
grounding rows = 0
```

The verifier fixtures rolled back as designed.

**Migration 017 is now LIVE. Future sessions must never reapply it merely because an older handoff says it was absent.**

## Core candidate proof and promotion

Exact candidate:

```text
wandora/core:organization-adapter-candidate-d90b225e6cc2
source = d90b225e6cc2ff1e22e4bc446ee1a08d52e429ad
OCI manifest = sha256:7d8d9e5c83dc70b73e7b2ff56599d402fe4413676d3fab691fdc56069234727b
```

A separate bounded candidate container used the same live networks, secret mounts and reviewed overlays. It was not publicly exposed.

Proof:

```text
healthy
restart = 0
healthz = 200
readyz = 200
Human Send / outbound flags = absent
```

Only then was `wandora-core` recreated with the exact candidate.

Current live Core:

```text
wandora/core:organization-adapter-candidate-d90b225e6cc2
healthy / readyz=200 / restart 0
```

No work, model or outbound effect was introduced.

## Web candidate qualification and production validation failure

Exact Web artifact bytes also matched ADR 0173:

```text
artifact ZIP sha256 =
73ef5b75f3b021861ce2fe14b305dc030bdebe276aa82e688166d8e14687faf6

web-image.tar sha256 =
f90927f7622f27bfafe003c7c108043f8926d0565c98bf84d21b320883c673a3

OCI config digest inside archive =
sha256:96779cdf6106d20cea39e98a82b47deb2d9df2ee05d50169f1d9a95274a1c9b2
```

Docker exposes the loaded OCI manifest as local image ID `sha256:b9f2ebeb...`; this is not artifact substitution. The archive/config bytes are the exact frozen artifact.

A bounded Web candidate was healthy, `/company` returned 200 and `/api/v1/me` without session returned 401. It was then promoted.

Final validation uncovered a real missing production contract:

```text
GET /api/v1/organizations/<uuid>/grounding
through Web -> 404
directly against Core -> 401 without session
```

The cause is the exact `apps/web/nginx.conf` from the accepted source. It has allow-listed proxy locations for existing customer APIs but **no location for the grounding list/create/correct/retire routes**. Its intentional catch-all:

```nginx
location /api/ {
  return 404;
}
```

therefore blocks the `/company` grounding API.

ADR 0172's React surface and Core contract are correct, but the production-shaped Web bridge qualification failed to prove the new Nginx proxy boundary.

## Rollback decision

ADR 0173 requires Web-only rollback when Web promotion fails after migration/Core are healthy.

The execution restored exactly:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-65908b76c667
```

Only `wandora-web` was recreated for rollback.

Migration 017 and the grounding-aware Core remain live because:

- migration 017 is additive and verified;
- Core is healthy/ready;
- no grounding customer state exists;
- database restore is not appropriate for a binary Web failure.

## Final production state

```text
migration 017                   = LIVE / verified
organization_grounding_entries = PRESENT
grounding rows                  = 0

Core = wandora/core:organization-adapter-candidate-d90b225e6cc2
Core = healthy / readyz 200 / restart 0

Web = wandora/web:candidate-65908b76c667
Web = healthy / restart 0

Paperclip = wandora/paperclip:v2026.916.0
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de
Paperclip/Gateway = unchanged / healthy / restart 0

MEDICSPRO works             = 2
MEDICSPRO Ana               = exactly 1 active + supervised
MEDICSPRO outbound attempts = 0
new Core model usage lines  = 0
Human Send                  = OFF
Gateway outbound            = OFF

public /company                   = 200
public /api/v1/me unauthenticated = 401
direct Core grounding unauthenticated = 401
```

No fact or Regra da Casa was created. No model call, customer work, wakeup, heartbeat, session or external send was created by this execution.

Disposable candidate/restore containers were removed.

## Capability authority

No architecture authority changed.

- Wandora remains semantic authority for official facts/Regras da Casa/provenance.
- Paperclip remains control-plane authority.
- Mastra/runtime remains runtime memory/retrieval/context/execution authority.
- No RAG, vector, embedding, chunking, document or memory subsystem was internalized.

ADR 0168 remains permanent:

> **Portability = contract decoupling, not implementation duplication.**

## Decision

The coordinated promotion is **not COMPLETE** because the accepted Web candidate cannot reach the new grounding API through its production Nginx allow-list.

The safe state is accepted:

```text
migration 017 LIVE
+ grounding-aware Core LIVE
+ prior Web LIVE
+ grounding rows 0
+ all external effects OFF
```

**Do not repeat migration 017 or Core promotion.**

## Next slice

The next slice is:

**Customer Web Grounding API Proxy Route Correction V1 — CODE ONLY / NO PRODUCTION EFFECT**

It must:

1. add only the minimum Nginx allow-list routes required by ADR 0170:
   - list/create `/api/v1/organizations/:organizationId/grounding`;
   - retire `/grounding/:entryId/retire`;
   - correct `/grounding/:entryId/correct`;
2. preserve Authorization forwarding and cookie stripping exactly like existing customer API locations;
3. preserve the catch-all `/api/ { return 404; }`;
4. add a production-shaped verifier proving the grounding proxy paths while rejecting unrelated `/api/` paths;
5. not alter Core, database, Paperclip, Mastra or Gateway;
6. not create real grounding;
7. produce a new immutable Web artifact through normal GitHub-hosted CI.

After that correction is merged and qualified, use a **separate Web-only Production Promotion Preflight/Execution**.

That future Web promotion must not reapply migration 017, recreate/promote Core merely for grounding, or create MEDICSPRO grounding as deployment validation.
