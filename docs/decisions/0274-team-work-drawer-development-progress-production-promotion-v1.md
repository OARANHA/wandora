# ADR 0274 — Team Work Drawer + Evidence-Backed Development Progress Production Promotion V1

Status: **EXECUTED / GREEN / WEB ONLY**  
Date: 2026-09-25

## Context

ADR 0272 introduced an evidence-backed employee-development progress projection. ADR 0273 replaced the fixed Team work column with a right-side employee work drawer and bounded presentation pagination.

PR #358 merged both changes into main at `2b5511f979ffb5d8559781e52a5844dc13aa335c` after the applicable Web, Core, Platform Admin and Messaging Gateway workflows passed GREEN on the reviewed head.

This ADR records the separate production promotion.

## Qualified artifact

GitHub Actions artifact:

```text
artifact id = 10859763138
artifact name = web-candidate-5108f7ce8de3546750ea921fe5b7d1da46751586
GitHub digest = sha256:bd9435e331e5b90daaba580b6b53c6f45e2eec2cd3828106a8860a45f2e9c985
source synthetic merge = 5108f7ce8de3546750ea921fe5b7d1da46751586
source head = bc05456c3903f7b57c4ffa107514f556964faf14
image tag = wandora/web:candidate-5108f7ce8de3
archive sha256 = d41460f3ceaabb635d276653edca4065b8c2faffde39f2e6248619555cdaaa35
loaded image id = sha256:faa77b3471a5320dfdb84a6f17df6fb020e545a2cb6ef51de9df73e738f40e2c
candidate contract = wandora-web-reviewed-bridge-v1
```

The downloaded ZIP digest matched GitHub metadata, and the archive/manifest hashes matched the artifact's own SHA256SUMS.

## Disposable qualification

The candidate was started separately on the existing `wandora-core` Docker network and bound only to `127.0.0.1:18090`.

It returned 200 for:

- `/healthz`
- `/team`
- `/work`
- `/login`

The candidate bundle proved the intended markers:

- `Dar trabalho para`
- `Trabalhos recentes`
- `desenvolvimento na empresa`
- `Mede marcos observáveis da formação nesta empresa.`
- `Não mede inteligência, desempenho nem altera autonomia.`

No candidate was attached to `wandora-edge`.

## Second adversarial review

Jev returned `confirm`, not automatic allow, because the next action was a reversible production mutation.

The human owner explicitly authorized continuation and executed the bounded production commands.

Safeguards:

- exact artifact and image provenance verified;
- rollback image pinned;
- only Web service recreated;
- no database change;
- no Core/Paperclip/Gateway recreate;
- live health/route/bundle verification required.

## Production execution

Rollback baseline:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-d9d4d6babf97
backup=/opt/wandora/stacks/web/.env.adr0272-0273.before
```

Production selector changed only to:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-5108f7ce8de3
```

Compose validation passed and only service `web` was recreated with `--no-deps --force-recreate`.

Resulting Web:

```text
container id = 49cd7715ebca...
image = wandora/web:candidate-5108f7ce8de3
revision = 5108f7ce8de3546750ea921fe5b7d1da46751586
candidate = wandora-web-reviewed-bridge-v1
health = healthy
```

## Post-promotion validation

Local production Traefik HTTPS routing returned 200 for:

- `/healthz`
- `/team`
- `/work`
- `/login`

The live bundle contains the same drawer/progress markers qualified in the disposable candidate.

Unchanged dependencies remained healthy:

- Core: same pre-promotion container/image;
- Paperclip: same pre-promotion container/image;
- Messaging Gateway: same pre-promotion container/image.

## Product semantics now live

Team employee card:

- exposes `Dar trabalho para Ana`;
- opens a right-side drawer;
- drawer has `Novo trabalho` and `Trabalhos recentes`;
- recent work is presentation-paginated at 5 items/page;
- full result detail stays in canonical Work.

Employee development:

- responsibility milestone;
- behavior milestone;
- practice milestone;
- supervised work experience milestone;
- 0/4..4/4 visual projection only;
- no persisted score;
- no intelligence/performance/trust/autonomy interpretation.

## Effect boundary

```text
Web recreate = 1
Core recreate = 0
Paperclip recreate = 0
Messaging Gateway recreate = 0
migration = 0
provider/model call = 0
customer work = 0
outbound = 0
```

ADR 0168 remains preserved.

ADR 0274 is **EXECUTED / GREEN / WEB ONLY**.
