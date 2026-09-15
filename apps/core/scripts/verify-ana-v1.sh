#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORE="$ROOT/apps/core"
MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
VERIFIERS="$ROOT/infra/stacks/supabase/verifiers"
PG_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
NODE_IMAGE="${NODE_IMAGE:-node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5}"
SUFFIX="$$"
NET="wandora-ana-v1-net-$SUFFIX"
DB="wandora-ana-v1-db-$SUFFIX"
DB_NAME="wandora_test"
DB_PASSWORD="wandora-test-only"
CORE_PASSWORD="wandora-core-test-only"
FIXTURE_PASSWORD="wandora-fixture-test-only"
CORE_IMAGE="wandora/core:ci-$SUFFIX"
CORE_SMOKE="wandora-core-smoke-$SUFFIX"
CORE_DB_SMOKE="wandora-core-db-smoke-$SUFFIX"
TMP_SECRET="$(mktemp)"

cleanup() {
  docker rm -f "$CORE_DB_SMOKE" >/dev/null 2>&1 || true
  docker rm -f "$CORE_SMOKE" >/dev/null 2>&1 || true
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker image rm -f "$CORE_IMAGE" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -f "$TMP_SECRET"
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" -e POSTGRES_DB="$DB_NAME" \
  "$PG_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$DB" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then break; fi
  sleep 1
done
sleep 8

# Model the Supabase roles and pg_net schema branch used by production.
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c \
  "DO \$\$ BEGIN
     CREATE ROLE authenticated NOLOGIN;
     CREATE ROLE anon NOLOGIN;
     CREATE ROLE service_role NOLOGIN;
     CREATE ROLE supabase_functions_admin NOLOGIN;
   EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
   CREATE SCHEMA IF NOT EXISTS net;
   GRANT USAGE ON SCHEMA net TO PUBLIC;" >/dev/null

for migration in \
  20260914_001_core_multitenant_auth_v1.sql \
  20260914_002_ana_vertical_slice_v1.sql \
  20260914_003_core_runtime_role_v1.sql; do
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f "/tmp/$migration" >/dev/null
done

for verifier in \
  VERIFY_20260914_ANA_VERTICAL_SLICE_V1_LIVE.sql \
  VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql \
  VERIFY_20260914_ANA_VERTICAL_SLICE_V1.sql; do
  docker cp "$VERIFIERS/$verifier" "$DB:/tmp/$verifier" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f "/tmp/$verifier"
done

# Only the disposable harness enables the canonical runtime login. No production
# credential is created by the migration itself. Fixture administration remains separate.
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c \
  "ALTER ROLE wandora_core_runtime CONNECTION LIMIT 4 PASSWORD '${CORE_PASSWORD}';
   CREATE ROLE wandora_fixture_admin_test LOGIN BYPASSRLS PASSWORD '${FIXTURE_PASSWORD}';
   GRANT USAGE ON SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA wandora TO wandora_fixture_admin_test;" >/dev/null

ACTIVATED_VERIFIER="VERIFY_20260914_CORE_RUNTIME_ACTIVATED_V1_LIVE.sql"
docker cp "$VERIFIERS/$ACTIVATED_VERIFIER" "$DB:/tmp/$ACTIVATED_VERIFIER" >/dev/null
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f "/tmp/$ACTIVATED_VERIFIER"

docker run --rm --network "$NET" -v "$CORE:/app" -w /app \
  -e DATABASE_URL="postgresql://wandora_core_runtime:${CORE_PASSWORD}@${DB}:5432/${DB_NAME}" \
  -e FIXTURE_DATABASE_URL="postgresql://wandora_fixture_admin_test:${FIXTURE_PASSWORD}@${DB}:5432/${DB_NAME}" \
  "$NODE_IMAGE" sh -lc 'node -v && npm ci --ignore-scripts >/dev/null && npm run verify'

# The production image must boot privately in standby without any real credential.
docker build -t "$CORE_IMAGE" "$CORE" >/dev/null
docker run -d --name "$CORE_SMOKE" --network none \
  -e WANDORA_CORE_MODE=standby -e PORT=8788 "$CORE_IMAGE" >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$CORE_SMOKE" node -e \
    "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"; then
    break
  fi
  sleep 1
done
docker exec "$CORE_SMOKE" node -e \
  "fetch('http://127.0.0.1:8788/readyz').then(r=>process.exit(r.status===503?0:1)).catch(()=>process.exit(1))"
test -z "$(docker port "$CORE_SMOKE")"

# Database mode must also prove that the non-root Node process can read a
# group-owned secret without widening it to world-readable permissions.
printf '%s\n' "$CORE_PASSWORD" > "$TMP_SECRET"
chmod 0640 "$TMP_SECRET"
docker run -d --name "$CORE_DB_SMOKE" --network "$NET" \
  --group-add "$(id -g)" \
  -v "$TMP_SECRET:/run/secrets/wandora_core_db_password:ro" \
  -e WANDORA_CORE_MODE=database \
  -e WANDORA_CORE_DB_HOST="$DB" \
  -e WANDORA_CORE_DB_PORT=5432 \
  -e WANDORA_CORE_DB_NAME="$DB_NAME" \
  -e WANDORA_CORE_DB_USER=wandora_core_runtime \
  -e WANDORA_CORE_DB_PASSWORD_FILE=/run/secrets/wandora_core_db_password \
  -e PORT=8788 \
  "$CORE_IMAGE" >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$CORE_DB_SMOKE" node -e \
    "fetch('http://127.0.0.1:8788/readyz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"; then
    break
  fi
  sleep 1
done
docker exec "$CORE_DB_SMOKE" node -e \
  "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
docker exec "$CORE_DB_SMOKE" node -e \
  "fetch('http://127.0.0.1:8788/readyz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
test -z "$(docker port "$CORE_DB_SMOKE")"

# Both standby and later database-activation Compose shapes must remain valid.
docker compose -f "$ROOT/infra/stacks/core/compose.yaml" config >/dev/null
WANDORA_CORE_DB_PASSWORD_FILE="$TMP_SECRET" WANDORA_CORE_SECRET_GID="$(id -g)" docker compose \
  -f "$ROOT/infra/stacks/core/compose.yaml" \
  -f "$ROOT/infra/stacks/core/compose.database.yaml" config >/dev/null

echo "WANDORA_CORE_PRIVATE_RUNTIME_V1_OK"
echo "ANA_VERTICAL_SLICE_V1_VERIFY_OK"
