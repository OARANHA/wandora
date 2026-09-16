# Platform Provisioner Role V1 — Promotion Runbook

Date: 2026-09-16
Authority: ADR 0031

## Purpose

Promote only the disabled-by-default PostgreSQL identity required by a future Platform Admin provisioning service.

## Preflight

Before applying migration 009:

- migration 008 and its live-safe verifier must already be green;
- `wandora_platform_provisioner` must not exist, or must already satisfy the migration drift guard;
- capture schema-only backup for `wandora` and `wandora_private`;
- record canonical row counts;
- do not create or rotate a production password;
- do not raise the role connection limit.

## Promotion

1. materialize the exact Git blob for migration 009;
2. verify the local Git blob hash matches the merged file;
3. apply migration 009 as the database administrator;
4. execute only `VERIFY_20260916_PLATFORM_PROVISIONER_ROLE_V1_LIVE.sql`;
5. verify canonical business row counts are unchanged;
6. verify `rolconnlimit = 0` and password remains null;
7. verify Core, Web and Gateway health is unchanged.

## Forbidden during this promotion

Do not:

- assign a password to `wandora_platform_provisioner`;
- increase its connection limit;
- expose a Platform Admin HTTP route;
- grant provisioning to `authenticated` or `wandora_core_runtime`;
- add direct table privileges;
- provision a real organization merely to prove the role migration.

## Activation boundary

A later Platform Admin runtime activation requires a separate decision and adversarial review. That activation must supply an operator-controlled secret, a bounded connection limit, its own private runtime/network boundary and explicit Platform Admin authentication.

The canonical post-migration state remains disabled.
