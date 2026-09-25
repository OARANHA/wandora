# ADR 0262 — Customer Work Owner Flow Web Production Promotion V1

Status: **EXECUTED / GREEN / WEB ONLY**  
Date: 2026-09-25

## Context

ADR 0261 is merged and CI-green. This ADR records the bounded production promotion of the owner-work UX changes:

- Equipe confirms a successful supervised-work assignment and links to Trabalho;
- Trabalho shows supervised work lifecycle and keeps attention-required work separate;
- Conversas remains canonical customer/channel history only;
- Aprovações no longer renders fictitious demo records;
- completion notification is session-local only and does not create durable unread/read state.

No new table, migration, notification store, provider capability or work lifecycle was introduced.

## REAL NOW before effect

Canonical Git state:

```text
main = d49b1df674b652f17ec6f8a1e3ca31fe13ff4ccf
PR #341 = merged
PR #342 = merged checkpoint
open PRs = #343 documentation only
```

ADR 0261 implementation head:

```text
18aec627eb50db1b3f5617345c5dc98f58d09ed8
```

PR-head workflows were GREEN:

```text
Web CI               = GREEN
Core CI              = GREEN
Platform Admin CI    = GREEN
Messaging Gateway CI = GREEN
```

Production runtime before promotion:

```text
Web = wandora/web:candidate-0a7f36833188 / healthy / restart 0
Core = wandora/core:organization-adapter-candidate-46741f8d82d0 / healthy
Paperclip = wandora/paperclip:v2026.916.0 / healthy
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy
```

## Artifact qualification

Web CI artifact:

```text
workflow run = 36101734409 / Web CI #963
artifact id = 10848923851
artifact name = web-candidate-13034613000d053e4c262cec16dbba855b17a189
GitHub artifact digest =
sha256:22e7c16154dc97ffa61450aad99adfa31166a2543ccbff8f6701c0528739ee2e
```

Host-side canonical helper from ADR 0192 was initially unreachable from the execution broker because the broker could not traverse `/home`.

The canonical helper was copied without modification into the governed operational path:

```text
/opt/wandora/ops-workspace/bin/wandora-github-artifact
owner = root
group = wandora-ops
mode = 0750
```

Credential custody remained unchanged at:

```text
/etc/wandora/github-artifacts.env
owner = root
group = wandora-ops
mode = 0640
```

No token value was printed, copied to the workspace, or exposed through MCP.

Artifact verification:

```text
GitHub digest =
sha256:22e7c16154dc97ffa61450aad99adfa31166a2543ccbff8f6701c0528739ee2e

downloaded ZIP sha256 =
22e7c16154dc97ffa61450aad99adfa31166a2543ccbff8f6701c0528739ee2e

web-image.tar = OK
manifest.txt = OK
```

Internal manifest:

```text
candidate_contract = wandora-web-reviewed-bridge-v1
source_sha = 13034613000d053e4c262cec16dbba855b17a189
source_tree_sha = b708bfb6a4626658094eb809ceecefbf16c5d9c0
image_tag = wandora/web:candidate-13034613000d
manifest image_id =
sha256:3cf47aba77f72695df5d87c6a72c4a79ca8709a340f709440032e902a2cf49c2
archive_sha256 =
52af9cb2bcd3daa10d394c90de5366854e4dc6f247cbd78db7315035a3cbb3dc
```

GitHub proves `13034613000d...` is the synthetic PR merge commit:

```text
parent 1 = b36d7b163760ebd1821bc19deb1d242a5f575707
parent 2 = 18aec627eb50db1b3f5617345c5dc98f58d09ed8
tree = b708bfb6a4626658094eb809ceecefbf16c5d9c0
```

Therefore the artifact is the exact PR tree qualified by Web CI, not an unrelated source.

After `docker load`, the host image identity was:

```text
wandora/web:candidate-13034613000d
host OCI manifest/image id =
sha256:9de4dc71c85456fe267dc1dd79c6ac7eb9e20dfd732d7901010baa2f8e8157d9
```

The image labels confirm:

```text
org.opencontainers.image.revision =
13034613000d053e4c262cec16dbba855b17a189

wandora.candidate =
wandora-web-reviewed-bridge-v1
```

## Disposable candidate preflight

A disposable candidate was started only on:

```text
127.0.0.1:18080 -> container:8080
network = wandora-core
restart = no
no wandora-edge attachment
```

Routes:

```text
/healthz        = 200
/               = 200
/team           = 200
/work           = 200
/conversations  = 200
/approvals      = 200
/company        = 200
/login          = 200
/api/v1/me      = 401 unauthenticated
```

Bundle markers were present:

```text
ACOMPANHE DO PEDIDO AO RESULTADO.
SÓ INTERROMPE VOCÊ QUANDO PRECISA.
Acompanhar trabalho
trabalho concluído nesta sessão
SEM APROVAÇÃO
```

The disposable container was removed before production recreation.

## Second adversarial review

Rejected:

1. weaken `/home` permissions globally;
2. expose/copy the GitHub artifact token;
3. use generic authenticated curl as a secret-custody bypass;
4. rebuild the Web image on the VPS;
5. promote before exact artifact verification;
6. recreate Core, Paperclip or Messaging Gateway;
7. treat a 403 from the VPS through the public Cloudflare path as evidence of Web failure without checking the origin routing path.

Jev advisory preflight returned `allow` for both image staging and the final Web-only promotion. Jev remained advisory and did not override deterministic safeguards.

## Execution

Rollback selector was captured before mutation:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-0a7f36833188
backup = /opt/wandora/stacks/web/.env.adr0262.before
```

Persisted selector changed to:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-13034613000d
```

Only the Web service was recreated:

```text
docker compose up -d --no-deps web
```

Post-effect runtime:

```text
Web image = wandora/web:candidate-13034613000d
host image id =
sha256:9de4dc71c85456fe267dc1dd79c6ac7eb9e20dfd732d7901010baa2f8e8157d9
status = running
health = healthy
restart = 0
revision = 13034613000d053e4c262cec16dbba855b17a189
```

Core, Paperclip and Messaging Gateway remained unchanged and healthy.

## Live validation

Direct egress from the production host to the public Cloudflare hostname returned 403 because of the existing perimeter/origin policy. That result is not treated as a Web failure.

The real local Traefik HTTPS route was validated with the production hostname resolved to the local origin:

```text
https://app.wandora.com.br/healthz        = 200
https://app.wandora.com.br/               = 200
https://app.wandora.com.br/team           = 200
https://app.wandora.com.br/work           = 200
https://app.wandora.com.br/conversations  = 200
https://app.wandora.com.br/approvals      = 200
https://app.wandora.com.br/company        = 200
https://app.wandora.com.br/login          = 200
https://app.wandora.com.br/api/v1/me      = 401 unauthenticated
```

The live production bundle is:

```text
/assets/index-DYRbEy-W.js
```

and contains all ADR 0261 UX markers listed in the disposable preflight.

## Effect boundary

This production slice caused:

```text
Web recreate = 1
Core recreate = 0
Paperclip recreate = 0
Messaging Gateway recreate = 0
customer work = 0
provider/model call = 0
outbound = 0
migration = 0
credential exposure = 0
```

## Decision

**ADR 0262 is EXECUTED / GREEN / WEB ONLY.**

The ADR 0261 owner-work UX is now live in production.
