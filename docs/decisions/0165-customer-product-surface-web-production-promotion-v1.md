# ADR 0165 — Customer Product Surface Web Production Promotion V1

Status: **ACCEPTED / EXECUTED / GREEN**
Date: 2026-09-22

## Context

ADRs 0162, 0163 and 0164 established the new Wandora customer-facing product direction in code:

- canonical customer visual system + shell + real-state-only Início;
- canonical Equipe surface against existing employee/work contracts;
- safe customer-work result presentation without executable model HTML.

Those slices were code/CI only. This ADR records the bounded production promotion of the exact merged-main Web artifact.

## REAL NOW before effect

Canonical Git state:

```text
main = 2e23abd8852558155a4e1475c5891962ab03d6fa
open PRs = 0
Web CI = GREEN
Core CI = GREEN
Platform Admin CI = GREEN
Messaging Gateway CI = GREEN
```

Live runtime before promotion:

```text
Web        = wandora/web:candidate-88facf57466d / healthy / restart 0
Core       = wandora/core:organization-adapter-candidate-61cbb34d4bfd / healthy / restart 0
Paperclip  = wandora/paperclip:v2026.916.0 / healthy / restart 0
Gateway    = wandora/messaging-gateway:origin-fix-94cfb4de / healthy / restart 0

MEDICSPRO works = 2
Ana = active + supervised
outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

## Provenance reconciliation

A stale declarative selector was discovered before promotion:

```text
running Web container = wandora/web:candidate-88facf57466d
/opt/wandora/stacks/web/.env =
WANDORA_WEB_IMAGE=wandora/web:candidate-eda946c36ec4
```

The stale selector dated from the ADR 0135 Web candidate. Later ADR 0141 had promoted the actual running Web container to `candidate-88facf57466d` without reconciling the persisted selector.

The runtime container was treated as the real rollback source. No production mutation occurred until this mismatch was understood.

## Exact production candidate

Merged-main Web CI:

```text
run = 35693068916 / Web CI #628 / GREEN
artifact id = 10679243455
artifact name = web-candidate-2e23abd8852558155a4e1475c5891962ab03d6fa
GitHub artifact digest =
sha256:c8516101dafb5bc099c0d9ac749284760d2e6b4d5e280c52545c484cc83c7343
```

Downloaded host artifact SHA-256 matched GitHub exactly.

Internal artifact verification:

```text
candidate_contract = wandora-web-reviewed-bridge-v1
source_sha = 2e23abd8852558155a4e1475c5891962ab03d6fa
source_tree_sha = d3e0e5bdc7aececa71215217aae79b215f6eec12
image_tag = wandora/web:candidate-2e23abd88525
CI image config digest =
sha256:15459bba6b51893dee7a4770004d4654f65a304dd1c6ed07ec1073fc5fd27e53
archive_sha256 =
d1d9eef9fd89fb470e1ead843527babcd6f0868c256b700b519938df019d241a
```

The ZIP was path-traversal checked and `SHA256SUMS` passed.

## OCI digest reconciliation

After `docker load` on the production host, Docker/containerd reported:

```text
loaded host image id =
sha256:2ac6b1fffcd5b00eede4907f3537467782706d4f8a3c7abe8e82a9282fa62916
```

This initially differed from the CI-recorded `image_id`.

The artifact itself proved the relationship:

```text
OCI index manifest digest =
sha256:2ac6b1fffcd5b00eede4907f3537467782706d4f8a3c7abe8e82a9282fa62916

OCI manifest config digest =
sha256:15459bba6b51893dee7a4770004d4654f65a304dd1c6ed07ec1073fc5fd27e53
```

The host uses the OCI manifest digest as the loaded image identity, while the CI manifest recorded the config digest. The `index.json` and OCI manifest link those two identities directly.

No provenance mismatch remained.

## Fresh rollback

Immediately before promotion, a fresh archive of the real live rollback image was captured:

```text
rollback tag = wandora/web:candidate-88facf57466d
rollback image id =
sha256:a12a519aff863098583326034af5b32d9d7e7016285209e1b79faf1dd1391955

rollback archive sha256 =
61aaf658e8cddc81d0d7cbac06376c445a95ac264df971d12f756ebedcbb9f75
```

The stale pre-change `.env` was also captured for forensic continuity:

```text
sha256 =
e8575f26be4d7a9c8c21801650544e153087095c859f777f985548ef2acf5005
```

Rollback authority is the actual previous live image `candidate-88facf57466d`, not the stale selector value.

## Disposable candidate preflight

Before production mutation, the exact staged candidate was run in a disposable container.

Results:

```text
candidate = healthy
restart count = 0

/healthz      = 200
/             = 200
/team         = 200
/work         = 200
/conversations= 200
/approvals    = 200
/company      = 200
/login        = 200
```

Browser-public Auth config was present.

No Paperclip/Mastra/Mistral/Supabase provider technology string was exposed by the tested root customer HTML.

## Second adversarial review

Rejected:

- promoting from local source instead of the merged-main artifact;
- rebuilding the image on the VPS;
- treating the stale `.env` as the real rollback target;
- changing Core, Paperclip or Gateway during the Web promotion;
- enabling Human Send or Gateway outbound;
- creating new customer work to test the UI;
- bypassing normal browser authentication;
- treating OCI manifest/config digest differences as acceptable without proving their relationship.

Accepted transaction:

1. render compose with exact new image selector;
2. update only `WANDORA_WEB_IMAGE`;
3. recreate only `wandora-web`;
4. require healthy/restart 0;
5. validate public routes externally;
6. validate new bundle markers live;
7. recheck MEDICSPRO work/outbound/employee invariants.

## Execution

Rendered compose before mutation:

```text
image = wandora/web:candidate-2e23abd88525
networks = wandora-core, wandora-edge
host ports = none
```

The persisted stack selector was then reconciled to:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-2e23abd88525
```

Only the Web service was recreated.

Docker result:

```text
wandora-web Recreate
wandora-web Recreated
wandora-web Starting
wandora-web Started
```

Immediate readback:

```text
image = wandora/web:candidate-2e23abd88525
host image id =
sha256:2ac6b1fffcd5b00eede4907f3537467782706d4f8a3c7abe8e82a9282fa62916
status = running
health = healthy
restart count = 0
```

The persisted `.env` now matches the real live container.

## Public validation

Independent external host:

```text
/healthz        = 200
/login          = 200
/accept-invite  = 200
/recover-access = 200
/               = 200
/team           = 200
/work           = 200
/conversations  = 200
/approvals      = 200
/company        = 200
/api/v1/me unauthenticated = 401
```

## Live bundle validation

The live Web static bundle contains the canonical product-surface markers:

```text
team_surface        = present
dashboard_surface   = present
work_result_surface = present
```

Specifically, the deployed bundle includes the new Início, Equipe and internal work-result presentation code.

## Post-effect invariants

```text
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
Ana = active + supervised

Web       = new candidate / healthy / restart 0
Core      = unchanged / healthy / restart 0
Paperclip = unchanged / healthy / restart 0
Gateway   = unchanged / healthy / restart 0

Human Send = OFF
Gateway outbound = OFF
```

No work, model call, lifecycle action or outbound effect was created by the promotion.

## Decision

**Customer Product Surface Web Production Promotion V1 is GREEN.**

Production now serves the canonical customer shell, real-state-only Início, canonical Equipe surface and safe customer-work result renderer from the exact merged-main artifact.

## Next axis

Continue the Customer Product Surface Canonicalization roadmap.

Recommended next implementation slice:

**Conversas Surface Canonicalization V1**

After that, prioritize the `Empresa / Regras da casa` capability-authority review for grounding before expanding autonomous outbound behavior.
