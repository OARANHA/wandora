# Supabase Credential Rotation — Gate #22

Date: 2026-09-14
Status: **Completed and live-verified**

This runbook records the coordinated rotation performed after an operator diagnostic exposed shared Supabase JWT/database credential material. It intentionally records no secret values.

## Scope

The rotation was deliberately limited to the affected shared credential families:

- `JWT_SECRET`;
- derived legacy `ANON_KEY` and `SERVICE_ROLE_KEY`;
- symmetric HS256 compatibility material inside `JWT_KEYS` / `JWT_JWKS`;
- PostgreSQL `app.settings.jwt_secret`;
- shared `POSTGRES_PASSWORD` used by the self-hosted Supabase service roles.

The existing EC/ES256 signing identity, modern `sb_...` API keys and unrelated Realtime/Vault/Meta/Studio secrets were preserved.

## Preflight and recovery

Before any mutation:

- every live consumer was mapped without printing values;
- Auth users/sessions and Wandora customer/business rows were confirmed at zero;
- the pinned self-hosted rotation utilities and active Compose layers were reviewed;
- a fresh logical database backup and `.env` snapshot were created with mode `0600`;
- checksums and `pg_restore -l` validation passed.

Primary recovery directories:

- `/home/wandora-admin/wandora-backups/supabase-preflight/gate22-20260914T212927Z`
- `/home/wandora-admin/wandora-backups/supabase-preflight/gate22-post-jwt-pre-db-20260914T215001Z`

The second directory is a post-JWT/pre-database checkpoint so database-password rollback does not undo the successful JWT cutover.

Old credentials in those snapshots are compromised material. They exist only for emergency recovery and must not be returned to steady-state use.

## Phase 1 — JWT compatibility cutover

The legacy HS256 family was replaced while preserving the current EC/ES256 signing identity and modern API-key family.

Post-cutover proof:

```text
all Supabase services: healthy
modern sb_secret REST proof: 200
current legacy service_role REST proof: 200
pre-rotation legacy service_role REST proof: 401
GATE22_JWT_ROTATION_LIVE_OK
```

The database-level `app.settings.jwt_secret` value was updated in the same cutover.

## Phase 2 — PostgreSQL shared password

The twelve Supabase roles targeted by the pinned self-hosted password utility were confirmed to exist before rotation.

Rather than execute non-transactional role changes, the password updates were wrapped in one PostgreSQL transaction. The operator `.env` then received an atomic replacement of exactly one `POSTGRES_PASSWORD` entry and the active Compose stack was recreated with `--wait`.

Accepted password proof uses a sibling container on the `supabase_default` network because loopback in `pg_hba.conf` is `trust` and therefore cannot prove revocation.

```text
old_postgres_password_network=revoked
new_postgres_password_network=accepted
all_postgres_password_consumers_updated=yes
```

The temporary duplicate file containing the newly generated database password was deleted after verification. The live `.env` remains mode `0600`.

## Final verification

```text
all 11 Supabase services: healthy
PostgreSQL direct published ports: 0
Supavisor: localhost-only 5432/6543
supabase.wandora.com.br root: 404 (intentional)
studio.wandora.com.br unauthenticated: 401
Core /healthz: 200
Core /readyz: 503 reason=standby
wandora_core_runtime: CONNECTION LIMIT 0, BYPASSRLS false, password absent
Auth users/sessions: 0
Wandora organizations/contacts/messages/approvals: 0
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
GATE22_LIVE_VERIFIERS_OK
```

## Resulting boundary

Security gate #22 is cleared. This does **not** itself authorize customer traffic or activate Wandora Core database access.

The next reviewed operation is separate:

1. attach the live Supabase database to the internal `wandora-data` network using the merged source-of-truth override;
2. generate a fresh `wandora_core_runtime` password outside Git/chat;
3. store it only through the approved secret-file path;
4. activate the smallest justified non-zero connection limit;
5. start the Core database overlay;
6. prove `/readyz = 200` only as `wandora_core_runtime` and re-prove transaction-local tenant isolation under pooled reuse.
