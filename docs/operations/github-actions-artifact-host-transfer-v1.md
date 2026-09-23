# GitHub Actions Artifact Host Transfer V1

## Purpose

Canonical host-side transfer and qualification of GitHub Actions artifacts for Wandora production promotion.

## Credential

Host-only file:

```text
/etc/wandora/github-artifacts.env
```

Expected names only:

```text
GH_TOKEN
GH_REPO
```

Required permissions:

```text
0640 root:wandora-ops
```

Never print, commit, copy into a container, or expose the token to application runtime.

## Helper

```text
/home/wandora-admin/bin/wandora-github-artifact
```

Usage:

```bash
/home/wandora-admin/bin/wandora-github-artifact \
  <artifact-id> \
  /home/wandora-admin/executions/<promotion>/artifact-download
```

Successful output must prove:

- GitHub digest;
- identical local ZIP SHA-256;
- internal `SHA256SUMS` success;
- manifest/source SHA;
- expected image tag.

## Promotion gate

Do not load/promote an artifact unless:

1. artifact is not expired;
2. GitHub digest matches the downloaded ZIP;
3. internal checksums pass;
4. manifest `source_sha` equals the exact intended merged `main`;
5. image tag matches the intended candidate;
6. relevant post-merge CI is GREEN;
7. pre-effect runtime/selector/rollback snapshot is recorded.

## Security property

Authentication is used only against GitHub API.

The helper obtains GitHub's signed artifact redirect, then downloads from the signed storage URL without forwarding the bearer token to the storage host.

## Failure handling

On 401:

- confirm token has Actions Read and repository access;
- confirm `GH_REPO`;
- rotate token if invalid/expired.

On 403:

- inspect token repository selection and Actions permission;
- do not fall back automatically to connector-hosted temporary URLs.

On digest/checksum mismatch:

- stop;
- do not load the image;
- redownload once through the canonical helper;
- if mismatch persists, investigate the artifact/workflow.

## Rotation

The current credential is a fine-grained PAT. Rotate before expiry.

A future GitHub App installation token may replace PAT custody without changing the qualification contract.
