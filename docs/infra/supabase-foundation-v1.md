# Supabase Foundation V1 — deployment record

Date: 2026-09-13
Status: **Validated on the Wandora laboratory VPS**

## Upstream

The deployment uses the official Supabase self-hosted Docker tree pinned to:

- tag `self-hosted/v0.8.1`;
- commit `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`.

The Wandora repository stores only the Wandora-owned overlay, ingress contract, non-secret configuration and preparation instructions. Runtime secrets stay on the target host.

## Validated runtime

The laboratory stack started successfully with healthy services for PostgreSQL, Auth, PostgREST, Realtime, Storage, imgproxy, postgres-meta, Studio, Envoy, Supavisor and Edge Functions.

Public contracts validated:

- `https://supabase.wandora.com.br/auth/v1/settings` returned HTTP 200 through Traefik/TLS;
- the root of `supabase.wandora.com.br` is not a Studio surface;
- `https://studio.wandora.com.br` requires gateway authentication before Studio;
- TLS certificates were issued successfully for both hostnames.

Database/pooler ports are loopback-only on the host. PostgreSQL is not an Internet-facing service.

## Persistence proof

A disposable schema/table was created, populated, PostgreSQL was restarted, and the inserted value remained available after the database returned healthy. The disposable schema was then removed. No Wandora business-domain tables were introduced by this infrastructure slice.

## Resource baseline

With Traefik, Portainer, Paperclip and the Supabase stack running, the host remained within laboratory headroom. During the validation window the machine had roughly 11 GiB RAM total and about 8+ GiB available after the Supabase deployment settled.

This is sufficient for the current laboratory/early-beta phase, not a commitment to keep the data plane colocated indefinitely.

## Backup minimum

Before real customer data becomes irreplaceable, schedule backups to a location outside the live stack tree and copy them off-host.

Minimum database backup example:

```bash
mkdir -p "$BACKUP_DIR"
docker exec supabase-db pg_dump -U postgres -Fc postgres > "$BACKUP_DIR/postgres.dump"
```

Storage files under the self-hosted `volumes/storage` path must be backed up consistently as well. Runtime secrets must be backed up through an encrypted secret-management process, never committed to Git.

## Basic restore path

For a new host:

1. prepare the exact pinned upstream source using `infra/stacks/supabase/prepare-source.sh`;
2. apply the Wandora overlay and non-secret environment values;
3. restore the same runtime secrets through the approved secret store;
4. start PostgreSQL and restore the logical database dump (`pg_restore` for custom-format dumps);
5. restore Storage data with ownership/permissions preserved;
6. start the remaining Supabase services;
7. verify Auth, REST, Storage, Realtime, Studio and persistence before switching DNS/ingress;
8. preserve `supabase.wandora.com.br` and `studio.wandora.com.br` so applications do not depend on host IPs.

A full disaster-recovery drill is still required before production-grade customer data is declared protected.

## Remaining hardening

- Add Cloudflare Access in front of privileged operator surfaces, especially Studio and Portainer.
- Configure production SMTP before enabling normal email confirmation/recovery flows.
- Add Google/social OAuth only when the Wandora login flow exists.
- Establish scheduled off-host backup retention and perform a full restore drill.
