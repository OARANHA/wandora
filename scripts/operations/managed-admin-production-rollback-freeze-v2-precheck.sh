#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# ADR 0310 — Managed-Admin Root Capability Governance for Canonical Rollback V2 Precheck.
# This is a dedicated root administrative entrypoint, not a generic shell surface.
# The MCP caller supplies no arguments. The only permitted effect is executing
# the byte-pinned canonical rollback helper in --precheck-only mode.

fail() {
  printf 'MANAGED_ADMIN_ROLLBACK_V2_PRECHECK_ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$#" -eq 0 ]] || fail "caller arguments are forbidden"
[[ "${EUID}" -eq 0 ]] || fail "must run as root via the governed managed-admin broker"

SELF="/usr/local/sbin/wandora-rollback-freeze-v2-precheck"
HELPER="/usr/local/libexec/wandora/production-rollback-freeze-v2.sh"
EXPECTED_HELPER_GIT_BLOB="21d6f054558e0f52e843f6933ef2c0047992ad43"

resolved_self="$(/usr/bin/readlink -f -- "$0")"
[[ "$resolved_self" == "$SELF" ]] || fail "entrypoint path mismatch"
[[ ! -L "$SELF" && -f "$SELF" ]] || fail "entrypoint must be a regular non-symlink file"
[[ "$(/usr/bin/stat -c '%U:%G:%a:%F' -- "$SELF")" == "root:root:755:regular file" ]] ||
  fail "entrypoint ownership/mode mismatch"

[[ ! -L "$HELPER" && -f "$HELPER" ]] || fail "canonical helper copy must be a regular non-symlink file"
[[ "$(/usr/bin/stat -c '%U:%G:%a:%F' -- "$HELPER")" == "root:root:750:regular file" ]] ||
  fail "canonical helper copy ownership/mode mismatch"

actual_blob="$(/usr/bin/git hash-object --no-filters "$HELPER")"
[[ "$actual_blob" == "$EXPECTED_HELPER_GIT_BLOB" ]] ||
  fail "canonical helper byte identity mismatch"

/usr/bin/bash -n "$HELPER" || fail "canonical helper syntax validation failed"

exec /usr/bin/bash "$HELPER" --precheck-only
