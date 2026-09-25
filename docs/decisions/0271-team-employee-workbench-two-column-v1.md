# ADR 0271 — Team Employee Workbench Two-Column V1

Status: **EXECUTED / GREEN / WEB ONLY**  
Date: 2026-09-25

## Context

Owner review of the live Team page found the employee surface too vertical.

The current desktop order is:

```text
identity + autonomy
development
work assignment + recent work with inline results
```

This creates unnecessary page height and duplicates detailed work results already available in the canonical Work drawer.

## Decision

Keep identity + autonomy at the top.

On desktop, render the employee workbench below as:

```text
┌──────────────────────────────────────┬───────────────────────────┐
│ Development ~65%                     │ Work with Ana ~35%        │
│                                      │                           │
│ Responsibilities                     │ New supervised work       │
│ Learnings                            │                           │
│ Autonomy                             │ Compact recent work       │
└──────────────────────────────────────┴───────────────────────────┘
```

Implementation:

```text
xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]
```

The work column is sticky/bounded on desktop and remains stacked on smaller screens.

## Recent work

Team no longer expands complete recent results inline in compact mode.

Each recent row keeps:
- title;
- truthful current state;
- short request preview;
- `Abrir resultado` when a result exists;
- `Ver trabalho` otherwise.

Detailed results remain in the existing canonical `/work` drawer.

No reviewed/archive/related-work state is invented.

## Authority / Reuse Gate

This is a Web projection change only.

Reuses:
- existing employee-development Core contract;
- existing supervised-work read/write contract;
- existing `/work` detail drawer;
- existing local Web interaction state.

No new:
- table;
- migration;
- API endpoint;
- result store;
- work lifecycle;
- provider capability.

ADR 0168 remains preserved.

## Second adversarial review

Jev returned `allow`.

Safeguards:
- development remains visually primary;
- no result-detail duplication in compact mode;
- mobile remains stacked;
- no backend/provider change;
- no fictitious work state.

## Validation

The Web verifier now proves:
- the Team desktop two-column grid;
- compact work-panel mode;
- bounded recent-work preview;
- navigation to the canonical Work surface for detail.

## Effect boundary

```text
production Web promotion = 0
Core change = 0
Paperclip change = 0
provider/model call = 0
customer work = 0
outbound = 0
migration = 0
```


## Production promotion

Production promotion completed successfully as a Web-only effect.

Canonical source:

```text
main = 48283a34d0a858bbf69a92c64404a99636a8811c
main tree = eea79c8b54a79c5ede2547b8d57a02ff02b13971
artifact synthetic merge = d9d4d6babf97c88f450dc60baa1ddb83bafd6a8e
artifact tree = eea79c8b54a79c5ede2547b8d57a02ff02b13971
tree equality = true
```

Qualified Web artifact:

```text
artifact id = 10857772377
artifact name = web-candidate-d9d4d6babf97c88f450dc60baa1ddb83bafd6a8e
GitHub digest = sha256:da9629f3744d411ed5166136cf5dc4bdf40f9d817a3bbb690d41bf155a43f3e4
image tag = wandora/web:candidate-d9d4d6babf97
archive sha256 = 231a4692b32651da49e86155e7ffd900d28af7e3b2ef490ffc8bdc3abd2c60e6
loaded image id = sha256:b7569f2e79f77e54502e9a29a45ed379b5584a55f119773d4b4a1c9a65fcf690
revision = d9d4d6babf97c88f450dc60baa1ddb83bafd6a8e
candidate = wandora-web-reviewed-bridge-v1
```

Rollback baseline:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-7edf5895f3e3
backup = /opt/wandora/stacks/web/.env.adr0271.before
old Web health = healthy
old Web restart = 0
```

Only the Web service was recreated.

Post-promotion runtime:

```text
Web image = wandora/web:candidate-d9d4d6babf97
Web revision = d9d4d6babf97c88f450dc60baa1ddb83bafd6a8e
Web health = healthy
Web restart = 0

Core = unchanged / healthy / restart 0
Paperclip = unchanged / healthy / restart 0
Messaging Gateway = unchanged / healthy / restart 0
```

Live local-Traefik validation:

```text
/healthz = 200
/team    = 200
/work    = 200
/login   = 200
```

Live bundle:

```text
/assets/index-D5eM4g8p.js
```

Verified live bundle markers:

- Responsabilidades
- Aprendizados
- Autonomia
- Dar trabalho para
- Trabalhos recentes
- Abrir resultado

Final production effect:

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

ADR 0271 is now **EXECUTED / GREEN / WEB ONLY**.
