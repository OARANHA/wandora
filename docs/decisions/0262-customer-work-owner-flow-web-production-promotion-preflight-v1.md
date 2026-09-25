# ADR 0262 — Customer Work Owner Flow Web Production Promotion Preflight V1

Status: **BLOCKED / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0261 is merged and CI-green. The customer-facing code now clarifies the owner flow for supervised work:

- Equipe confirms a successful work assignment and links to Trabalho;
- Trabalho shows supervised work lifecycle and keeps attention-required work separate;
- Conversas remains canonical customer/channel history only;
- Aprovações no longer shows fictitious demo records;
- completion notification is session-local only and does not create durable unread/read state.

The next effectful step would be a bounded Web-only production promotion.

This ADR is a preflight only.

## REAL NOW

Canonical Git state at preflight entry:

```text
main = d49b1df674b652f17ec6f8a1e3ca31fe13ff4ccf
PR #341 = merged
PR #342 = merged checkpoint
open PRs = 0
```

ADR 0261 implementation head:

```text
18aec627eb50db1b3f5617345c5dc98f58d09ed8
```

Its pull-request workflows are all GREEN:

```text
Web CI               = GREEN
Core CI              = GREEN
Platform Admin CI    = GREEN
Messaging Gateway CI = GREEN
```

Qualified Web CI artifact:

```text
workflow run = 36101734409 / Web CI #963
artifact id = 10848923851
artifact name = web-candidate-13034613000d053e4c262cec16dbba855b17a189
artifact size = 22,643,043 bytes
GitHub artifact digest =
sha256:22e7c16154dc97ffa61450aad99adfa31166a2543ccbff8f6701c0528739ee2e
artifact head_sha =
18aec627eb50db1b3f5617345c5dc98f58d09ed8
```

Production runtime before any effect:

```text
Web = wandora/web:candidate-0a7f36833188 / healthy
Core = wandora/core:organization-adapter-candidate-46741f8d82d0 / healthy
Paperclip = wandora/paperclip:v2026.916.0 / healthy
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy
```

No production component was recreated during this preflight.

## Capability Authority / Reuse Gate

Production artifact transfer is an operational capability, not product state and not a Wandora application capability.

ADR 0192 already defines the canonical transfer mechanism:

```text
/home/wandora-admin/bin/wandora-github-artifact <artifact-id> <output-dir>
```

with GitHub artifact credentials kept in host custody and never exposed to the application or caller.

Therefore this preflight rejects:

- temporary connector URLs as the normal path;
- copying or printing the GitHub token;
- reading the credential file through generic shell;
- rebuilding the Web image on the VPS;
- bypassing the helper with arbitrary authenticated curl;
- broadening Wandora product state merely to move an artifact.

## Proven blocker

The Remote-Ops execution broker runs as:

```text
uid=999(wandora-exec)
gid=1003(ops-mcp)
groups=1003(ops-mcp),987(wandora-ops)
```

A governed attempt from the allowlisted operational workspace to execute the canonical helper returned:

```text
bash: /home/wandora-admin/bin/wandora-github-artifact: Permission denied
exit = 126
```

A separate capability check proved:

```text
HELPER_READABLE=no
HELPER_EXECUTABLE=no
```

No helper content, GitHub credential or token was read.

This is an OS permission/custody boundary mismatch between the current execution-broker identity and the host helper documented by ADR 0192.

## Second adversarial review

Rejected:

1. source the host credential file from generic shell;
2. copy the token into the MCP or workspace;
3. use a temporary connector-hosted artifact URL as the production path;
4. rebuild the exact Web candidate locally;
5. mutate production before artifact provenance is independently verified;
6. weaken Remote-Ops path/secret allowlists just to finish the promotion;
7. recreate Core, Paperclip or Messaging Gateway as part of a Web-only change.

The safe decision is to stop before production effect.

## Resume gate

Promotion may resume only after one of these is proven:

1. the canonical ADR 0192 helper is readable/executable by the governed execution identity through the intended host permission boundary; or
2. Remote-Ops exposes a dedicated semantic GitHub artifact staging capability that keeps the credential protected and performs the same digest/path/SHA256SUMS verification.

After that, the exact artifact must be staged and prove:

- downloaded ZIP SHA-256 equals GitHub artifact digest;
- internal `SHA256SUMS` passes;
- manifest/source SHA corresponds to the qualified ADR 0261 source;
- exact image tag/image identity is known;
- disposable candidate health and public routes are GREEN;
- rollback image/selector are captured from real runtime.

Only then may a separate execution step change the Web selector and recreate only `wandora-web`.

## Effect boundary

This preflight caused:

```text
production container mutation = 0
Web recreate = 0
Core/Paperclip/Gateway mutation = 0
customer work = 0
provider/model call = 0
outbound = 0
credential exposure = 0
```

## Decision

**ADR 0262 is BLOCKED / SAFE STOP / NO PRODUCTION EFFECT.**

The remaining blocker is operational artifact-transfer authority, not the customer-work UX code.
