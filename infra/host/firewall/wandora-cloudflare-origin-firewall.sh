#!/usr/bin/env bash
set -euo pipefail

IPTABLES="${IPTABLES:-/usr/sbin/iptables}"
IP="${IP:-/usr/sbin/ip}"
OLD_CHAIN="WANDORA-CF-HTTPS"
NEW_CHAIN="WANDORA-CF-HTTPS-NEXT"
PUBLIC_IFACE="${PUBLIC_IFACE:-$($IP route show default | awk 'NR == 1 { print $5 }')}"

if [[ -z "$PUBLIC_IFACE" ]]; then
  echo "Unable to determine public interface" >&2
  exit 1
fi

CLOUDFLARE_IPV4_RANGES=(
  "173.245.48.0/20"
  "103.21.244.0/22"
  "103.22.200.0/22"
  "103.31.4.0/22"
  "141.101.64.0/18"
  "108.162.192.0/18"
  "190.93.240.0/20"
  "188.114.96.0/20"
  "197.234.240.0/22"
  "198.41.128.0/17"
  "162.158.0.0/15"
  "104.16.0.0/13"
  "104.24.0.0/14"
  "172.64.0.0/13"
  "131.0.72.0/22"
)

# Docker owns the DOCKER-USER hook. Wait briefly for it after boot/restart.
for _ in $(seq 1 30); do
  if "$IPTABLES" -w 2 -nL DOCKER-USER >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! "$IPTABLES" -w 2 -nL DOCKER-USER >/dev/null 2>&1; then
  echo "DOCKER-USER chain is unavailable" >&2
  exit 1
fi

# Remove stale NEXT jumps/chains left by an interrupted previous run. Support
# both the corrected ingress-scoped form and the earlier broad form.
while "$IPTABLES" -w 10 -C DOCKER-USER -i "$PUBLIC_IFACE" -p tcp --dport 443 -j "$NEW_CHAIN" >/dev/null 2>&1; do
  "$IPTABLES" -w 10 -D DOCKER-USER -i "$PUBLIC_IFACE" -p tcp --dport 443 -j "$NEW_CHAIN"
done
while "$IPTABLES" -w 10 -C DOCKER-USER -p tcp --dport 443 -j "$NEW_CHAIN" >/dev/null 2>&1; do
  "$IPTABLES" -w 10 -D DOCKER-USER -p tcp --dport 443 -j "$NEW_CHAIN"
done
if "$IPTABLES" -w 10 -nL "$NEW_CHAIN" >/dev/null 2>&1; then
  "$IPTABLES" -w 10 -F "$NEW_CHAIN"
  "$IPTABLES" -w 10 -X "$NEW_CHAIN"
fi

# Build the replacement chain completely before switching ingress traffic to it.
"$IPTABLES" -w 10 -N "$NEW_CHAIN"
for cidr in "${CLOUDFLARE_IPV4_RANGES[@]}"; do
  "$IPTABLES" -w 10 -A "$NEW_CHAIN" -s "$cidr" -p tcp --dport 443 -j ACCEPT
done
"$IPTABLES" -w 10 -A "$NEW_CHAIN" -p tcp --dport 443 -j DROP

# Only traffic entering through the public interface is subject to the origin
# allowlist. Container egress to HTTPS must not be captured by this rule.
"$IPTABLES" -w 10 -I DOCKER-USER 1 -i "$PUBLIC_IFACE" -p tcp --dport 443 -j "$NEW_CHAIN"

# Retire both corrected and legacy broad jumps. Keeping the new scoped jump in
# place first avoids a fail-open ingress window during refresh/migration.
while "$IPTABLES" -w 10 -C DOCKER-USER -i "$PUBLIC_IFACE" -p tcp --dport 443 -j "$OLD_CHAIN" >/dev/null 2>&1; do
  "$IPTABLES" -w 10 -D DOCKER-USER -i "$PUBLIC_IFACE" -p tcp --dport 443 -j "$OLD_CHAIN"
done
while "$IPTABLES" -w 10 -C DOCKER-USER -p tcp --dport 443 -j "$OLD_CHAIN" >/dev/null 2>&1; do
  "$IPTABLES" -w 10 -D DOCKER-USER -p tcp --dport 443 -j "$OLD_CHAIN"
done

if "$IPTABLES" -w 10 -nL "$OLD_CHAIN" >/dev/null 2>&1; then
  "$IPTABLES" -w 10 -F "$OLD_CHAIN"
  "$IPTABLES" -w 10 -X "$OLD_CHAIN"
fi

# Renaming updates the existing jump reference atomically from NEXT to canonical.
"$IPTABLES" -w 10 -E "$NEW_CHAIN" "$OLD_CHAIN"

# Verify the canonical ingress-scoped jump and terminal deny are present.
"$IPTABLES" -w 10 -C DOCKER-USER -i "$PUBLIC_IFACE" -p tcp --dport 443 -j "$OLD_CHAIN"
"$IPTABLES" -w 10 -C "$OLD_CHAIN" -p tcp --dport 443 -j DROP
