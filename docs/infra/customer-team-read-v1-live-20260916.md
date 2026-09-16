# Customer Team Read V1 — Live Proof — 2026-09-16

Source PR: #71  
Merged source: `b31db507b225bb03ebd221c8f05b111fe100e25d`

## Purpose

Record the controlled promotion of ADR 0035 from merged code to the live customer runtime while preserving the distinction between the current Wandora employee projection and the future organization/control-plane architecture.

## Pre-promotion state

Before promotion:

- Core: `wandora/core:inbound-reopen-384bfee6` — healthy;
- Web: `wandora/web:canonical-confirm-a1ee4755` — healthy;
- Messaging Gateway: `wandora/messaging-gateway:origin-fix-94cfb4de` — healthy;
- organizations: 2;
- digital employees: 2;
- active digital employees: 2;
- paused digital employees: 0;
- Human Send effect switch: absent;
- Gateway outbound effect switch: absent.

## Build and candidate safety

The five source files changed by the Team Read slice were materialized on the VPS and verified against their merged Git blob hashes.

A preserved historical Core source tree contained drift in unrelated already-live modules. Full recompilation from that historical tree was rejected rather than accepting an unverifiable rebuild.

The Core candidate therefore used the current healthy live Core image as its base and overlaid only the compiled Team Read modules. This preserved the already-proven Confirmation V2 runtime while adding the reviewed read path.

The Core candidate proved:

- `/healthz = 200`;
- `/readyz = 200`;
- unauthenticated digital-employees route = `401`;
- no Human Send/Gateway outbound effect switch;
- same private Core/data network shape;
- same non-root/secret-group access model.

All tracked Web source/build files in the preserved Web tree matched the merged source blob hashes. The Web image received a full normal production build and passed TypeScript/Vite build.

An isolated Web + Core candidate pair proved:

- Web health = `200`;
- exact `/digital-employees` bridge reaches Core and returns `401` without authentication;
- extra `/digital-employees/not-reviewed` path remains `404`;
- `/internal/...` remains `404`;
- Core readiness remains `200`.

## Live promotion

Promoted images:

- Core: `wandora/core:team-read-b31db507`;
- Web: `wandora/web:team-read-b31db507`.

Messaging Gateway was unchanged.

The live Core was recreated with the same database, Gateway ingress, deterministic Mastra and Human API overlays already used in production. The Human Send overlay was not enabled.

## Post-promotion proof

After promotion:

- Core: healthy, `/readyz = 200`;
- Web: healthy;
- Messaging Gateway: healthy;
- public `/healthz = 200`;
- public exact digital-employees route without auth = `401`;
- unreviewed digital-employees subpath = `404`;
- public `/internal/v1/gateway/inbound = 404`;
- organizations: 2;
- digital employees: 2;
- active digital employees: 2;
- paused digital employees: 0;
- Core effect switches: absent;
- Gateway effect switches: absent.

The deployment itself created or modified no customer business rows.

## Architecture boundary

This promotion proves the customer `Equipe` surface can read a tenant-authorized Wandora employee projection. It does **not** establish Wandora Core/PostgreSQL as the full digital-employee organization/control-plane implementation.

ADR 0036's Capability Authority / Reuse Gate applies before hiring, responsibility assignment, hierarchy, task/control-plane lifecycle or analogous expansion. Paperclip's Organization Adapter capability must be evaluated/proven first.

## Cleanup and rollback

The dedicated Team Read candidate Core/Web containers and temporary test network were removed after successful promotion.

A rollback note on the VPS records the previous and target Core/Web image tags. The prior images remain available for rollback.
