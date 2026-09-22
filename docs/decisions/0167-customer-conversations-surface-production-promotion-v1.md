# ADR 0167 — Customer Conversations Surface Production Promotion V1

Status: **ACCEPTED / EXECUTED / GREEN**
Date: 2026-09-22

## Context

ADR 0166 canonicalized the customer `Conversas` surface in code using only the already-live ADR 0020/0021 conversation read contracts.

This ADR records the bounded Web-only production promotion of the exact merged-main artifact.

## REAL NOW

Canonical source before effect:

```text
main = 65908b76c667e1326b0c73584766b8cc4ad73c0e
PR #222 = merged
open PRs = 0
Web CI #634 = GREEN
Core CI #702 = GREEN
Platform Admin CI #559 = GREEN
Messaging Gateway CI #666 = GREEN
```

Live Web before effect:

```text
tag = wandora/web:candidate-2e23abd88525
image id =
sha256:2ac6b1fffcd5b00eede4907f3537467782706d4f8a3c7abe8e82a9282fa62916
health = healthy
restart = 0
```

MEDICSPRO before effect:

```text
works = 2
Ana = active + supervised
outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

## Exact candidate

Web CI artifact:

```text
artifact id = 10680377258
artifact name = web-candidate-65908b76c667e1326b0c73584766b8cc4ad73c0e
artifact sha256 =
073e39299b76c697c3937d92ee130fd24f58b41a87ccb45c2e0fb7b987fc86fa
```

Internal manifest:

```text
source_sha = 65908b76c667e1326b0c73584766b8cc4ad73c0e
source_tree_sha = 7db33e61e07da0b299147b399b1ca64966ac2119
image_tag = wandora/web:candidate-65908b76c667
CI config digest =
sha256:179ff351282f6eb0dd7bf2d5396975c6cdcf95ffbcff43fb3708ae16e1ccd14b
archive_sha256 =
8b4b64dfe80e028e888ac84bbf1188989bf9959b5d07457a9f943bf131cdbfa0
```

ZIP path-safety and internal `SHA256SUMS` checks passed.

Host OCI identity:

```text
OCI manifest / loaded image id =
sha256:ade2aadf2c1b3e15d1b239f259a70237d85965b05dd4b209469c2f332cefb36e

OCI config digest =
sha256:179ff351282f6eb0dd7bf2d5396975c6cdcf95ffbcff43fb3708ae16e1ccd14b
```

The OCI manifest/config relationship was verified from the artifact itself.

## Fresh rollback

Rollback captured immediately before promotion:

```text
tag = wandora/web:candidate-2e23abd88525
rollback archive sha256 =
1bcefea8af22d867741502f697294fe3ad1702bd28dbb6c00446bfe6f8dbad87
pre-change Web env sha256 =
a3da17e8ef923653fc560c50497735b08de4347ca0cddcccf26edeb175beecf6
```

## Second adversarial review

Disposable candidate proof:

```text
health = healthy
restart = 0
/healthz = 200
/ = 200
/conversations = 200
/team = 200
/work = 200
/company = 200
/login = 200
conversations surface marker = present
read-only marker = present
```

Rejected:

- rebuilding on the VPS;
- changing Core/Paperclip/Gateway;
- adding response/send/takeover behavior;
- enabling outbound merely to validate the new page;
- creating synthetic conversation/customer work;
- bypassing browser authentication.

## Execution

Only the Web selector was changed:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-65908b76c667
```

Only `wandora-web` was recreated.

Readback:

```text
image = wandora/web:candidate-65908b76c667
image id =
sha256:ade2aadf2c1b3e15d1b239f259a70237d85965b05dd4b209469c2f332cefb36e
status = running
health = healthy
restart = 0
```

## Validation

Independent external validation:

```text
/healthz = 200
/ = 200
/login = 200
/conversations = 200
/team = 200
/work = 200
/company = 200
/api/v1/me unauthenticated = 401
```

Live bundle proof:

```text
conversations_surface = present
read_only_copy = present
```

Post-effect invariants:

```text
MEDICSPRO works = 2
Ana = active + supervised
outbound attempts = 0

Web = new candidate / healthy / restart 0
Core = unchanged / healthy / restart 0
Paperclip = unchanged / healthy / restart 0
Gateway = unchanged / healthy / restart 0
```

No new work, lifecycle action, model call or outbound effect was created.

## Decision

**Customer Conversations Surface Production Promotion V1 is GREEN.**

Production now serves the canonical read-only Conversas surface from the exact merged-main artifact.

## Next axis

Begin **Empresa / Regras da casa Capability Authority Review V1** before expanding autonomous outbound behavior.
