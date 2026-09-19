#!/bin/sh
set -eu

src=/run/secrets-root/wandora/paperclip-execution-bridge.hmac
dst_dir=/run/secrets/wandora
dst="$dst_dir/paperclip-execution-bridge.hmac"

test -r "$src"
mkdir -p "$dst_dir"
chown node:node "$dst_dir"
chmod 0700 "$dst_dir"
cp "$src" "$dst.tmp"
chown node:node "$dst.tmp"
chmod 0400 "$dst.tmp"
mv "$dst.tmp" "$dst"

exec /usr/local/bin/docker-entrypoint.sh "$@"
