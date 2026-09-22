# ADR 0189 — Web Business Density Production Promotion V1

Status: **EXECUTED / GREEN / WEB ONLY**
Date: 2026-09-22

## Canonical source

```text
main = 5f362fb43b62d4567e850de7c2f09f099755a925
PR #248 = MERGED
```

The exact post-merge Web artifact was qualified before promotion:

```text
artifact id = 10724356320
artifact name = web-candidate-5f362fb43b62d4567e850de7c2f09f099755a925
GitHub ZIP sha256 = fccb7a9ada62c0ce5c3c82d5c7eab40f910c18b1a326202383d0491e9c742014
source_sha = 5f362fb43b62d4567e850de7c2f09f099755a925
source_tree_sha = 82e9a6a2cfc02e3715f2ab215e1813d4251ff410
image_tag = wandora/web:candidate-5f362fb43b62
web-image.tar sha256 = 72375b1fef8cf8bab2e9cfe5f8af892e4f939dbbbb8ed9999801bbe923e16c05
```

The ZIP downloaded to the VPS matched the GitHub artifact digest exactly and internal SHA256SUMS verification passed.

## Second adversarial review

The exact artifact was run as a disposable private candidate before promotion.

Proof:

- /healthz = ok;
- /company = 200;
- candidate restart = 0;
- bundle contains “AS REGRAS DA”;
- bundle contains “Ensinar isso”;
- bundle contains “Adicionar fonte ou documento”.

The candidate was removed after proof.

No demo people, tools, activity or timestamps from the supplied mockup were introduced.

## Execution

Only Web was promoted.

Before:

```text
wandora/web:candidate-67966d42d23e
```

After:

```text
wandora/web:candidate-5f362fb43b62
revision = 5f362fb43b62d4567e850de7c2f09f099755a925
healthy / restart 0
```

The persisted Web selector is aligned to the new candidate.

Core, Paperclip and Messaging Gateway container IDs remained unchanged.

## Public validation

```text
/healthz = 200
/login = 200
/ = 200
/team = 200
/work = 200
/conversations = 200
/approvals = 200
/company = 200
```

Live bundle proof confirms the new business-density Company surface is active.

## Business-state safety

```text
MEDICSPRO grounding = 0
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
```

No grounding mutation, model call, customer work, provider run, outbound enablement or external message occurred.

## Decision

**Web Business Density Production Promotion V1 is COMPLETE / GREEN.**

The second owner-approved Company / Regras da Casa reference now governs production visual density: smaller display scale, rules-first Company composition, concise rule cards, “Ensinar à equipe” teaching flow and optional evidence disclosure.

ADR 0168 capability boundaries remain unchanged.
