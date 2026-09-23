# ADR 0192 — Host-Authenticated GitHub Actions Artifact Transfer V1

Status: **EXECUTED / GREEN**
Date: 2026-09-23

## Problem

Production promotions repeatedly depended on short-lived artifact links produced through an external connector. This caused recurring 401/403 failures and unnecessary delays even when the GitHub Actions artifact itself was healthy.

The VPS did not have a non-interactive GitHub identity for Actions artifact download.

## Decision

Use a host-side fine-grained GitHub token for artifact metadata/download only.

Current host custody:

```text
credential file = /etc/wandora/github-artifacts.env
mode = 0640
owner = root
group = wandora-ops
```

The token value is never stored in the repository, Docker images, product environment, or documentation.

The current fine-grained token is read-only for:

- Actions;
- Metadata.

The helper uses `GH_REPO=OARANHA/wandora` for Wandora artifact operations.

## Canonical helper

```text
/home/wandora-admin/bin/wandora-github-artifact
mode = 0750
owner = wandora-admin
sha256 = e79120d5f100a5d280e45846e6802e42de39b821bfb6331258f72a4545ed7239
```

Usage:

```bash
/home/wandora-admin/bin/wandora-github-artifact <artifact-id> <output-dir>
```

The helper:

1. reads the token from the host-only credential file;
2. requests artifact metadata through the GitHub API;
3. requests the authenticated artifact download endpoint;
4. extracts the signed redirect;
5. downloads the blob from the signed storage URL **without forwarding the GitHub bearer token**;
6. compares the downloaded ZIP SHA-256 to the GitHub artifact digest;
7. rejects path traversal and symlink ZIP entries;
8. validates every discovered `SHA256SUMS`;
9. prints provenance fields from `manifest.txt` when present.

## Proof

Artifact `10727436371` was used as the acceptance proof.

```text
GitHub artifact digest =
sha256:41e7117e4c0f47abab2d65a2d20d76e5e36704429fa40d900ce0c1cddffad913

downloaded ZIP sha256 =
41e7117e4c0f47abab2d65a2d20d76e5e36704429fa40d900ce0c1cddffad913

web-image.tar = OK
manifest.txt = OK
source_sha = 840469b365d1b0af25fcb91f365dc74e0da04ea6
image_tag = wandora/web:candidate-840469b365d1
```

## Operational rule

Normal Wandora production promotion must no longer rely on temporary connector-hosted artifact URLs.

Preferred path:

```text
GitHub Actions artifact
→ host-authenticated GitHub API
→ signed artifact redirect
→ VPS
→ GitHub digest verification
→ internal SHA256SUMS
→ manifest/source SHA qualification
→ promotion
```

Temporary connector URLs remain fallback/debug only.

## Git write boundary

This token does **not** grant Git write/push capability.

Artifact read identity and Git write identity remain separate. If non-interactive Git push from the VPS is required later, use a dedicated SSH/GitHub App identity or a separately reviewed credential.

## Replacement boundary

A GitHub App installation token may replace the fine-grained PAT later without changing the artifact qualification procedure.

Only the token acquisition mechanism changes.

## Security notes

- never echo `GH_TOKEN`;
- never place the token in process arguments intentionally;
- never commit the credential file;
- rotate/revoke the token on expiry or suspected exposure;
- do not use this token inside application containers.

## Housekeeping

Two orphaned root `sudo install` processes were observed from an abandoned attempt to install the helper in `/usr/local/sbin`.

They are not part of the canonical mechanism and must be treated as separate host housekeeping. The canonical helper is the user-owned path documented above.
