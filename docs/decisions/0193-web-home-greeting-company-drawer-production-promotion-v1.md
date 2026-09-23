# ADR 0193 — Web Home Greeting + Company Detail Drawer Production Promotion V1

Status: **EXECUTED / GREEN / WEB ONLY**
Date: 2026-09-23

## Canonical source

```text
main = 840469b365d1b0af25fcb91f365dc74e0da04ea6
PR #250 = MERGED
```

All PR-head and post-merge workflows required by the current CI policy were GREEN before promotion.

## Qualified artifact

```text
artifact id = 10727436371
name = web-candidate-840469b365d1b0af25fcb91f365dc74e0da04ea6
GitHub artifact digest = sha256:41e7117e4c0f47abab2d65a2d20d76e5e36704429fa40d900ce0c1cddffad913
source_sha = 840469b365d1b0af25fcb91f365dc74e0da04ea6
source_tree_sha = 28308ac59aba6a52e28ca5d4ebfffc6e315089fb
image_tag = wandora/web:candidate-840469b365d1
manifest image_id = sha256:c860aac3e1afcd8d64ab91ca2a632d0be8d4c1075d398c025885096f44f1f3c1
archive_sha256 = e665b76a330c737039f68f420fe7fee1e928f7b24eb69a64a534d2c78121ff6c
```

The ZIP was downloaded through the new ADR 0192 host-authenticated path. GitHub digest, internal `SHA256SUMS`, and manifest all verified.

The Docker-loaded image ID is a runtime identifier and is not asserted to be interchangeable with the manifest image identifier.

## Pre-effect runtime

```text
Web = wandora/web:candidate-5f362fb43b62
Core = wandora/core:organization-adapter-candidate-d8349b353bb7
Paperclip = wandora/paperclip:v2026.916.0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de
all healthy / restart 0
```

Rollback selector snapshot:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-5f362fb43b62
sha256(web.env.before) =
7a9042dd0b0ceac253209198ad8d6e8704b196ed678cbd39f43be8b92aacfab8
```

MEDICSPRO grounding before promotion:

```text
fact active = 1
fact retired = 1
rule active = 1
rule retired = 1
```

## Execution

Only the Web selector changed:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-840469b365d1
```

Only `wandora-web` was recreated.

Core, Paperclip and Messaging Gateway were not recreated.

## Post-promotion validation

Live Web:

```text
image = wandora/web:candidate-840469b365d1
revision = 840469b365d1b0af25fcb91f365dc74e0da04ea6
healthy
restart = 0
```

Public validation:

```text
/healthz = 200
/login = 200
/ = 200
/team = 200
/work = 200
/conversations = 200
/approvals = 200
/company = 200
/api/v1/me without session = 401
```

Other services remained healthy and unchanged.

MEDICSPRO grounding after promotion remained:

```text
fact active = 1
fact retired = 1
rule active = 1
rule retired = 1
```

## Product effect

The live customer Web now includes:

- Bom dia / Boa tarde / Boa noite based on browser-local time;
- the real authenticated user's display name;
- smaller Home/Company headline scale;
- existing-route quick actions;
- bounded grounding-card previews;
- right-side full-detail drawer;
- unchanged grounding correction/retire semantics.

ADR 0191 source-file upload remains preflight-only and is **not live**.

## Decision

**Web Home Greeting + Company Detail Drawer Production Promotion V1 is COMPLETE / GREEN.**
