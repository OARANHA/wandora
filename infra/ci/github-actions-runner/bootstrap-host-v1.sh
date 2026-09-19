#!/usr/bin/env bash
set -euo pipefail

EXPECTED_HOST="wandora-vps-01"
CI_USER="wandora-ci"
RUNNER_VERSION="2.337.0"
RUNNER_SHA256="70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

if [[ "${EUID}" -ne 0 ]]; then
  echo "must_run_as_root" >&2
  exit 1
fi

if [[ "$(hostname)" != "${EXPECTED_HOST}" ]]; then
  echo "wrong_host: expected=${EXPECTED_HOST} actual=$(hostname)" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends uidmap slirp4netns ca-certificates curl

if ! id "${CI_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash --comment "Wandora GitHub Actions CI" "${CI_USER}"
fi

passwd -l "${CI_USER}" >/dev/null 2>&1 || true
chmod 0700 "/home/${CI_USER}"

if id -nG "${CI_USER}" | tr ' ' '\n' | grep -qx docker; then
  echo "ci_user_must_not_be_in_host_docker_group" >&2
  exit 1
fi

CI_UID="$(id -u "${CI_USER}")"
CI_GID="$(id -g "${CI_USER}")"

grep -q "^${CI_USER}:" /etc/subuid
grep -q "^${CI_USER}:" /etc/subgid

loginctl enable-linger "${CI_USER}"
systemctl start "user@${CI_UID}.service"

run_as_ci() {
  runuser -u "${CI_USER}" -- env \
    HOME="/home/${CI_USER}" \
    USER="${CI_USER}" \
    XDG_RUNTIME_DIR="/run/user/${CI_UID}" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${CI_UID}/bus" \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    "$@"
}

if ! run_as_ci systemctl --user is-enabled docker.service >/dev/null 2>&1; then
  run_as_ci dockerd-rootless-setuptool.sh install
fi
run_as_ci systemctl --user enable --now docker.service

for _ in $(seq 1 30); do
  if [[ -S "/run/user/${CI_UID}/docker.sock" ]]; then
    break
  fi
  sleep 1
done
test -S "/run/user/${CI_UID}/docker.sock"

install -d -m 0755 "/etc/systemd/system/user-${CI_UID}.slice.d"
cat >"/etc/systemd/system/user-${CI_UID}.slice.d/wandora-ci.conf" <<EOF
[Slice]
CPUQuota=300%
MemoryHigh=3G
MemoryMax=4G
TasksMax=4096
EOF

RUNNER_DIR="/home/${CI_USER}/actions-runner"
if [[ ! -x "${RUNNER_DIR}/bin/Runner.Listener" ]]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp:-}"' EXIT
  curl -fL --retry 3 --retry-delay 2 --connect-timeout 15 \
    -o "${tmp}/runner.tar.gz" "${RUNNER_URL}"
  printf '%s  %s\n' "${RUNNER_SHA256}" "${tmp}/runner.tar.gz" | sha256sum -c -
  install -d -o "${CI_USER}" -g "${CI_USER}" -m 0755 "${RUNNER_DIR}"
  tar -xzf "${tmp}/runner.tar.gz" -C "${RUNNER_DIR}"
  chown -R "${CI_USER}:${CI_USER}" "${RUNNER_DIR}"
  "${RUNNER_DIR}/bin/installdependencies.sh"
  rm -rf "${tmp}"
  trap - EXIT
fi

install -d -o "${CI_USER}" -g "${CI_USER}" -m 0700 "/home/${CI_USER}/bin"

cat >"/home/${CI_USER}/bin/job-start.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
expected="unix:///run/user/${CI_UID}/docker.sock"
test "\${DOCKER_HOST:-}" = "\${expected}"
test ! -r /var/run/docker.sock
docker info --format '{{json .SecurityOptions}}' | grep -q rootless
docker info --format '{{.DockerRootDir}}' | grep -qx "/home/${CI_USER}/.local/share/docker"
if docker ps --format '{{.Names}}' | grep -Eq '^wandora-(core|web|paperclip|messaging-gateway|traefik)$'; then
  echo "production_container_visible_inside_ci_docker" >&2
  exit 1
fi
available_kb="\$(df -Pk "/home/${CI_USER}" | awk 'NR==2{print \$4}')"
test "\${available_kb}" -ge 16777216
echo "WANDORA_CI_ROOTLESS_BOUNDARY_OK"
EOF

cat >"/home/${CI_USER}/bin/job-complete.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
expected="unix:///run/user/${CI_UID}/docker.sock"
test "\${DOCKER_HOST:-}" = "\${expected}"
test ! -r /var/run/docker.sock
docker container prune -f >/dev/null 2>&1 || true
docker network prune -f >/dev/null 2>&1 || true
docker volume prune -f >/dev/null 2>&1 || true
docker image prune -f --filter 'until=168h' >/dev/null 2>&1 || true
echo "WANDORA_CI_CLEANUP_OK"
EOF

chown "${CI_USER}:${CI_USER}" "/home/${CI_USER}/bin/job-start.sh" "/home/${CI_USER}/bin/job-complete.sh"
chmod 0700 "/home/${CI_USER}/bin/job-start.sh" "/home/${CI_USER}/bin/job-complete.sh"

cat >"/etc/systemd/system/wandora-actions-runner.service" <<EOF
[Unit]
Description=Wandora repository GitHub Actions runner
After=network-online.target user@${CI_UID}.service
Wants=network-online.target
Requires=user@${CI_UID}.service
ConditionPathExists=/home/${CI_USER}/actions-runner/.runner

[Service]
Type=simple
User=${CI_USER}
Group=${CI_USER}
WorkingDirectory=/home/${CI_USER}/actions-runner
Environment=HOME=/home/${CI_USER}
Environment=XDG_RUNTIME_DIR=/run/user/${CI_UID}
Environment=DOCKER_HOST=unix:///run/user/${CI_UID}/docker.sock
Environment=ACTIONS_RUNNER_HOOK_JOB_STARTED=/home/${CI_USER}/bin/job-start.sh
Environment=ACTIONS_RUNNER_HOOK_JOB_COMPLETED=/home/${CI_USER}/bin/job-complete.sh
ExecStartPre=/usr/bin/test -S /run/user/${CI_UID}/docker.sock
ExecStart=/home/${CI_USER}/actions-runner/run.sh
Restart=always
RestartSec=5
TimeoutStopSec=90
KillMode=control-group
CPUQuota=300%
MemoryHigh=3G
MemoryMax=4G
TasksMax=4096
UMask=0077
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ReadWritePaths=/home/${CI_USER} /run/user/${CI_UID}
InaccessiblePaths=-/opt/wandora -/home/wandora-admin -/root -/var/run/docker.sock -/run/docker.sock
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
ProtectKernelLogs=yes
ProtectClock=yes
ProtectHostname=yes
LockPersonality=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
RestrictNamespaces=yes
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemd-analyze verify /etc/systemd/system/wandora-actions-runner.service

DOCKER_HOST="unix:///run/user/${CI_UID}/docker.sock" run_as_ci docker info >/dev/null
if run_as_ci test -r /var/run/docker.sock; then
  echo "host_docker_socket_readable_by_ci_user" >&2
  exit 1
fi

DOCKER_HOST="unix:///run/user/${CI_UID}/docker.sock" run_as_ci docker run --rm --network none alpine:3.22 sh -c 'echo WANDORA_CI_INNER_DOCKER_OK'

echo "WANDORA_CI_HOST_BOOTSTRAP_READY"
echo "ci_uid=${CI_UID}"
echo "runner_version=$(run_as_ci "${RUNNER_DIR}/bin/Runner.Listener" --version)"
echo "runner_registered=$([[ -f "${RUNNER_DIR}/.runner" ]] && echo yes || echo no)"
echo "runner_service=$(systemctl is-active wandora-actions-runner.service 2>/dev/null || true)"
