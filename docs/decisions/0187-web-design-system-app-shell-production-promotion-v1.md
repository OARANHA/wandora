# ADR 0187 — Web Design System + App Shell Production Promotion V1

Status: **EXECUTED / GREEN / WEB ONLY**
Date: 2026-09-22

## Context

ADR 0186 introduced the owner-approved customer design-system step without production effect:

- Dela Gothic One 400 for display/brand;
- Space Grotesk Variable for body/interface text;
- JetBrains Mono Variable for operational labels;
- explicit global visual tokens;
- 250px -> 82px collapsible desktop sidebar;
- power-style Sair control reusing the existing real signOut() path;
- complete mobile access to all six canonical customer routes.

The supplied design references remained visual direction only; no demo business data was copied into product state.

## Canonical source

Promotion source:

main = 67966d42d23e1778d89c2430de8d59e2235dedfb
PR #246 = MERGED

Post-merge push workflows on this exact main were GREEN:

- Web CI;
- Core CI;
- Platform Admin CI;
- Messaging Gateway CI.

No Core source changed in ADR 0186.

## Artifact qualification

GitHub Actions Web artifact:

artifact id = 10722734256
artifact name = web-candidate-67966d42d23e1778d89c2430de8d59e2235dedfb
GitHub artifact ZIP sha256 = 0b544336336d47225a54f9b470957afc8a65ea6e53f60006715efa486a88e319
source sha = 67966d42d23e1778d89c2430de8d59e2235dedfb
source tree sha = bf9cbe51a70d4fe9fcf584128ffd188cf6761870
image tag = wandora/web:candidate-67966d42d23e
artifact manifest image id = sha256:6ebcf1b9646f21d6aa09efd3fdc4bf836cc406b74324ee134872752dbf443dd4
web-image.tar sha256 = 25576bff1aac7586fa63c73460fe238f891a9562bb9a47afa2c5f31eca0e195c
manifest.txt sha256 = 93ba32fb811f3fddc856030e2396701faf90420a4daa07e0d73530016f552785

The downloaded artifact ZIP matched GitHub metadata exactly. Internal SHA256SUMS verified both Web payload files before Docker load.

Host Docker identifies the loaded image as:

sha256:d767b522f73b84d1a0fff7061e2a564e53dc5db075ac4306de790d1fd6d0b16d

with source revision 67966d42d23e1778d89c2430de8d59e2235dedfb and candidate contract wandora-web-reviewed-bridge-v1.

## Second adversarial review

The exact artifact was run first as a disposable private candidate on the existing wandora-core network.

Proof:

- candidate healthy / restart 0;
- /healthz = 200;
- /company = 200;
- /api/v1/me without session = 401;
- unknown grounding path = 404;
- live candidate CSS contains Dela Gothic One, Space Grotesk Variable and JetBrains Mono Variable;
- live candidate JS contains the sidebar preference key and Sair do sistema control.

The disposable candidate was removed after proof.

Rejected:

- rebuilding the artifact on the VPS;
- changing Core for a Web-only design slice;
- copying demo people/tool/activity state from the visual references;
- adding a second auth/logout implementation;
- turning browser-local sidebar preference into business state;
- touching grounding or outbound merely to validate visual changes.

## Pre-effect state

Before promotion:

Web = wandora/web:candidate-d8349b353bb7
Core = wandora/core:organization-adapter-candidate-d8349b353bb7
Paperclip = wandora/paperclip:v2026.916.0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de

MEDICSPRO grounding rows = 0
works = 2
outbound attempts = 0
Ana = active + supervised
Human Send = OFF
Gateway outbound = OFF

Rollback selector backup:

/home/wandora-admin/executions/web-design-system-app-shell-v1-promotion/web.env.before

sha256:

9bb020ae4ce98b0c63c41789020f968d3e22862ee3cda43de07e23d8b21aeab5

The previous Web image remained locally available.

## Execution

Only the persisted Web selector changed:

before = wandora/web:candidate-d8349b353bb7
after = wandora/web:candidate-67966d42d23e

Only wandora-web was recreated.

Core, Paperclip and Messaging Gateway container IDs remained unchanged.

## Post-promotion validation

Live Web:

image = wandora/web:candidate-67966d42d23e
source revision = 67966d42d23e1778d89c2430de8d59e2235dedfb
healthy / restart 0

Public routes:

- /healthz = 200;
- /login = 200;
- / = 200;
- /team = 200;
- /work = 200;
- /conversations = 200;
- /approvals = 200;
- /company = 200;
- /api/v1/me without session = 401;
- grounding without session = 401;
- unknown grounding route = 404.

Live bundle proof confirms:

- Dela Gothic One;
- Space Grotesk Variable;
- JetBrains Mono Variable;
- wandora.ui.sidebar-collapsed;
- Sair do sistema.

Final customer state is unchanged:

MEDICSPRO grounding rows = 0
works = 2
outbound attempts = 0
Ana = active + supervised
Human Send = OFF
Gateway outbound = OFF

No grounding mutation, model call, customer work, provider run, wakeup, task session or external message occurred during this promotion.

## Capability Authority

No authority changes.

This promotion is customer Web presentation only. Wandora/Paperclip/Mastra/Gateway authority boundaries remain unchanged and ADR 0168 continues to apply.

## Decision

**Web Design System + App Shell Production Promotion V1 is COMPLETE / GREEN.**

The new typography, collapsible sidebar, complete mobile navigation and power-style real logout are production-active.

The separately authorized MEDICSPRO first real grounding execution remains pending and must still originate from the normal authenticated owner/admin customer flow.
