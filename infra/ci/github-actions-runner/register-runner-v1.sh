#!/usr/bin/env bash
set -euo pipefail

CI_USER="wandora-ci"
REPO_URL="https://github.com/OARANHA/wandora"
RUNNER_NAME="wandora-vps-01-ci"
TOKEN_FILE="${1:-/run/wandora-actions-runner.token}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "must_run_as_root" >&2
  exit 1
fi

if [[ "$(hostname)" != "wandora-vps-01" ]]; then
  echo "wrong_host" >&2
  exit 1
fi

id "${CI_USER}" >/dev/null
CI_UID="$(id -u "${CI_USER}")"
RUNNER_DIR="/home/${CI_USER}/actions-runner"

if [[ -f "${RUNNER_DIR}/.runner" ]]; then
  echo "runner_already_registered"
  systemctl enable --now wandora-actions-runner.service
  exit 0
fi

if [[ ! -f "${TOKEN_FILE}" ]]; then
  echo "registration_token_file_missing" >&2
  exit 1
fi

mode="$(stat -c '%a' "${TOKEN_FILE}")"
case "${mode}" in
  400|600) ;;
  *) echo "registration_token_file_mode_must_be_400_or_600" >&2; exit 1 ;;
esac

token="$(cat "${TOKEN_FILE}")"
if [[ -z "${token}" ]]; then
  echo "registration_token_empty" >&2
  exit 1
fi

runuser -u "${CI_USER}" -- env \
  HOME="/home/${CI_USER}" \
  USER="${CI_USER}" \
  XDG_RUNTIME_DIR="/run/user/${CI_UID}" \
  DOCKER_HOST="unix:///run/user/${CI_UID}/docker.sock" \
  "${RUNNER_DIR}/config.sh" \
    --unattended \
    --url "${REPO_URL}" \
    --token "${token}" \
    --name "${RUNNER_NAME}" \
    --labels "wandora-ci,docker-rootless" \
    --work "_work"

unset token
shred -u "${TOKEN_FILE}"

systemctl enable --now wandora-actions-runner.service
sleep 2
systemctl is-active --quiet wandora-actions-runner.service

echo "WANDORA_ACTIONS_RUNNER_REGISTERED"
echo "runner_name=${RUNNER_NAME}"
echo "ci_uid=${CI_UID}"
