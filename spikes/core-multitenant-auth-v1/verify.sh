#!/usr/bin/env bash
set -euo pipefail

IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
NAME="wandora-core-contract-v1-$$"
DB="wandora_test"
PASSWORD="wandora-test-only"

cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD="$PASSWORD" \
  -e POSTGRES_DB="$DB" \
  "$IMAGE" >/dev/null

for _ in $(seq 1 45); do
  if docker exec "$NAME" pg_isready -U postgres -d "$DB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$NAME" pg_isready -U postgres -d "$DB" >/dev/null

docker exec "$NAME" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB" -c \
  "DO \$\$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;"

docker cp "$(dirname "$0")/schema.sql" "$NAME:/tmp/schema.sql" >/dev/null
docker cp "$(dirname "$0")/verify.sql" "$NAME:/tmp/verify.sql" >/dev/null

docker exec "$NAME" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB" -f /tmp/schema.sql
docker exec "$NAME" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB" -f /tmp/verify.sql

echo "verify=ok image=$IMAGE"
