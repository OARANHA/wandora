# Supabase Foundation V1

Wandora uses a pinned self-hosted Supabase distribution as the laboratory and early-beta data/auth foundation. Supabase is infrastructure; Wandora Core remains the owner of product domain logic, authorization semantics and customer-facing contracts.

## Pinned upstream

- Tag: `self-hosted/v0.8.1`
- Commit: `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`
- Initial deployment date: 2026-09-13

Do not replace this with an unreviewed `latest` snapshot. Any upgrade must be deliberate, diffed against upstream and restore-safe.

## Stable hostnames

- `https://supabase.wandora.com.br` — application-facing Supabase API boundary.
- `https://studio.wandora.com.br` — operator-only Studio surface.

PostgreSQL and Supavisor must not be publicly exposed. The live laboratory deployment binds API gateway / database pooler ports to loopback and uses Traefik on `wandora-edge` for the intentional HTTPS ingress.

## Reproducible shape

The deployment is based on the official `docker/` self-hosted tree from the pinned commit plus Wandora-owned overlays:

- `docker-compose.wandora.yml` attaches only the API gateway to `wandora-edge`;
- non-secret Wandora defaults set canonical URLs and conservative auth behavior;
- real secrets are generated on the target host and never committed;
- Traefik exposes only the approved API paths on `supabase.wandora.com.br` and the Studio hostname separately.

## Current auth posture

- Email auth enabled.
- Public signup disabled until the Wandora application flow exists.
- Email autoconfirm disabled.
- Phone signup disabled.
- Google/social OAuth intentionally deferred until the application login flow and callbacks are ready.
- Supabase Auth owns identity/session issuance; Wandora Core owns business authorization and tenant membership.

## Wandora migrations

Reviewed Wandora domain migrations live under `infra/stacks/supabase/migrations/`. Their falsifiable database checks live under `infra/stacks/supabase/verifiers/`.

The files `20260914_001_core_multitenant_auth_v1.sql` and `20260914_002_ana_vertical_slice_v1.sql` are now versioned product migrations. They were verified together on disposable `supabase/postgres:17.6.1.136`, but **have not yet been applied to the live Wandora Supabase database**.

Do not apply SQL directly from `spikes/`. A spike becomes deployable only after promotion into reviewed migrations/service code and a reproducible verifier. Live application remains a separate operational step with preflight, rollback/restore planning and post-verification.

## Persistence and backup

Database data and Storage files are persisted by the upstream self-hosted layout. Before meaningful customer data is introduced, establish scheduled backups outside the live stack directory and perform a documented restore drill.

Minimum backup set:

1. PostgreSQL logical dump (`pg_dump` / `pg_dumpall` as appropriate);
2. Storage filesystem data;
3. the exact pinned source/version metadata;
4. encrypted/off-host copy of runtime secrets through an approved secret-management process.

Never commit database dumps or runtime secrets to this repository.

## Infrastructure migration principle

The initial deployment may share the current Wandora VPS while load is low. A later move to a dedicated data-plane VPS must preserve the public contracts `supabase.wandora.com.br` and `studio.wandora.com.br`; applications should not depend on a server IP or Docker-internal hostname.
