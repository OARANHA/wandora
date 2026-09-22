# ADR 0177 — Customer Web Grounding API Bridge Production Promotion Execution V1

Status: **EXECUTED / GREEN / WEB ONLY**
Date: 2026-09-22

## Context

ADR 0174 left production in a deliberate partial safe state: migration 017 and the grounding-aware Core were live and healthy, while Web had been rolled back because the prior Nginx bridge returned 404 for the canonical grounding API.

ADR 0175 corrected only that explicit Web/Nginx allowlist gap. ADR 0176 qualified the immutable Web artifact from source `1800aa3d3fb4a0928f314eed4f1722f7adb59ef0`.

This execution resumed only after reconciling real Git/runtime state. Migration 017 and Core were not repeated.

## Pre-effect reconciliation

Canonical repository state:

```text
main = d8bf2962d9245606818a2b562976efb9facfe3fe
PR #233 = merged
PR #234 = merged
PR #235 = merged
```

Live production before promotion:

```text
migration 017 = LIVE / verified
MEDICSPRO grounding rows = 0
MEDICSPRO customer works = 2
MEDICSPRO outbound attempts = 0

Core = wandora/core:organization-adapter-candidate-d90b225e6cc2
Web  = wandora/web:candidate-65908b76c667
Paperclip = wandora/paperclip:v2026.916.0
Gateway = wandora/messaging-gateway:origin-fix-94cfb4de

Core / Web / Paperclip / Gateway = healthy
restart count = 0

Human Send = OFF by absence
Gateway outbound = OFF by absence
```

The old Web still reproduced the known defect:

```text
GET /api/v1/organizations/<MEDICSPRO>/grounding
public Web = 404
direct Core from Web namespace = 401
```

This reconfirmed that the remaining gap was Web transport only.

## Immutable artifact attestation

The exact GitHub Actions artifact was downloaded and independently reverified on the VPS:

```text
artifact id = 10695249794
artifact ZIP sha256 =
adba9f361b1135e123c555f6ff4afb3b555c13ec3dc129b7347a9467ddc6a109

web-image.tar sha256 =
1d76901fa02ca4b8cfeef8bdf9daf9fbb12c610951a5e629c3cd16c6facc960a

manifest.txt sha256 =
3846a2f11a84d19d60cfdb81251ac5735385ff8078b3209cf06ffa9781807a5e

source sha =
1800aa3d3fb4a0928f314eed4f1722f7adb59ef0

source tree sha =
c98f0e3a13a4675a0c1b23e476bfa50e649edefe

image tag =
wandora/web:candidate-1800aa3d3fb4

loaded OCI manifest/image id =
sha256:eb37a36d787e41d7d14c7675ea1e7689f01800a3ee5355c84e2afc09406d186a
```

The candidate labels preserved the expected source revision and `wandora-web-reviewed-bridge-v1` contract.

The prior production image `wandora/web:candidate-65908b76c667` remained locally available as the independent Web rollback.

## Second adversarial review

Before the production effect, a disposable private candidate using the exact loaded image proved:

```text
healthz = 200
company = 200
/api/v1/me without session = 401
grounding without session = 401
out-of-contract grounding path = 404
generic /api/ path = 404
```

Nginx exposed exactly the reviewed explicit grounding locations:

- base read/create;
- retire;
- correct;
- generic `/api/` remained fail-closed.

The candidate was removed before live promotion.

The review therefore proved:

1. the prior defect was solely Web/Nginx;
2. Core live already accepted the canonical grounding route and returned 401 without session;
3. old Web returned 404 before promotion;
4. the new artifact returned 401 for the same route;
5. generic API proxying remained closed;
6. the artifact was exactly the ADR 0176 artifact;
7. rollback was Web-only and independent from migration/Core;
8. no customer/model/outbound effect was required.

Decision: **GO for Web-only promotion**.

## Execution

Only the Web selector changed:

```text
before = wandora/web:candidate-65908b76c667
after  = wandora/web:candidate-1800aa3d3fb4
```

Only `wandora-web` was recreated through the existing Web Compose stack.

A protected copy of the prior selector was stored at:

```text
/home/wandora-admin/executions/customer-web-grounding-bridge-promotion-v1/web.env.before
sha256 =
a3b2cf9633e08e9b9c6dd9ebfba030214f6ea71660708a79888c6ab43f77716e
```

Core, Paperclip and Messaging Gateway container IDs remained unchanged across the promotion.

## Post-promotion validation

Live Web:

```text
image = wandora/web:candidate-1800aa3d3fb4
source revision = 1800aa3d3fb4a0928f314eed4f1722f7adb59ef0
healthy
restart 0
```

Public validation:

```text
/healthz = 200
/login = 200
/team = 200
/work = 200
/conversations = 200
/company = 200
/api/v1/me without session = 401

GET /api/v1/organizations/<MEDICSPRO>/grounding
without session = 401

out-of-contract grounding route = 404
```

The grounding route therefore changed from the old Nginx 404 to the expected Core 401 without a customer session.

Final state:

```text
migration 017 = LIVE / verified
MEDICSPRO grounding rows = 0
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0

Core = unchanged d90b225e candidate / healthy / restart 0
Paperclip = unchanged v2026.916.0 / healthy / restart 0
Messaging Gateway = unchanged / healthy / restart 0

Human Send = OFF
Gateway outbound = OFF
```

No real MEDICSPRO fact/rule was created. No model call, work, run, wakeup, task session or external message was caused by this promotion.

## Capability Authority

No capability authority changes.

- Wandora remains semantic authority for official company facts and Regras da Casa.
- Migration 017 remains the durable Wandora product state.
- Core remains customer mutation/read authority.
- Web/Nginx remains only the browser transport bridge.
- Paperclip and Mastra remain specialist providers behind their existing Wandora-owned contracts.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication.

## Decision

**Customer Web Grounding API Bridge Production Promotion Execution V1 is COMPLETE / GREEN.**

The grounding customer transport path is now production-functional. Any first real MEDICSPRO fact/rule is a separate customer/product effect and requires its own preflight/review; this execution did not create one.
