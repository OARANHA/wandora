#!/usr/bin/env python3
import argparse
import hashlib
import json
import re
import sys
import tarfile
from pathlib import Path, PurePosixPath

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
OCI_DIGEST_RE = re.compile(r"^sha256:([0-9a-f]{64})$")
GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
FORBIDDEN_ENV_RE = re.compile(
    r"WANDORA_ORGANIZATION_ADAPTER_ENABLED|"
    r"WANDORA_ORGANIZATION_ADAPTER_SECRET|HMAC|PASSWORD|TOKEN|API_KEY"
)
EXPECTED_CONTRACT = "organization-adapter-core-v1"


class VerificationError(RuntimeError):
    pass


def fail(message: str) -> None:
    raise VerificationError(message)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_member_name(name: str) -> bool:
    path = PurePosixPath(name)
    return not path.is_absolute() and ".." not in path.parts


def read_member(archive: tarfile.TarFile, members: dict[str, tarfile.TarInfo], name: str) -> bytes:
    member = members.get(name)
    if member is None or not member.isfile():
        fail(f"candidate_archive_missing_file:{name}")
    stream = archive.extractfile(member)
    if stream is None:
        fail(f"candidate_archive_unreadable_file:{name}")
    return stream.read()


def parse_json(data: bytes, name: str):
    try:
        return json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        fail(f"candidate_archive_invalid_json:{name}:{exc}")


def digest_to_blob_path(digest: str, field: str) -> str:
    match = OCI_DIGEST_RE.fullmatch(digest)
    if not match:
        fail(f"candidate_archive_invalid_digest:{field}")
    return f"blobs/sha256/{match.group(1)}"


def validate_blob_digest(data: bytes, digest: str, field: str) -> None:
    expected = digest_to_blob_path(digest, field).rsplit("/", 1)[1]
    actual = sha256_bytes(data)
    if actual != expected:
        fail(f"candidate_archive_blob_digest_mismatch:{field}")


def parse_manifest_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        fail(f"candidate_manifest_unreadable:{exc}")
    for line in lines:
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            fail("candidate_manifest_invalid_line")
        key, value = line.split("=", 1)
        if not key or key in values:
            fail(f"candidate_manifest_duplicate_or_empty_key:{key}")
        values[key] = value
    return values


def inspect_archive(path: Path) -> dict[str, object]:
    if not path.is_file():
        fail("candidate_archive_missing")
    try:
        archive = tarfile.open(path, mode="r:gz")
    except (tarfile.TarError, OSError) as exc:
        fail(f"candidate_archive_unreadable:{exc}")

    with archive:
        members: dict[str, tarfile.TarInfo] = {}
        for member in archive.getmembers():
            if not safe_member_name(member.name):
                fail(f"candidate_archive_unsafe_member:{member.name}")
            if member.name in members:
                fail(f"candidate_archive_duplicate_member:{member.name}")
            members[member.name] = member

        legacy = parse_json(read_member(archive, members, "manifest.json"), "manifest.json")
        index = parse_json(read_member(archive, members, "index.json"), "index.json")
        if not isinstance(legacy, list) or len(legacy) != 1 or not isinstance(legacy[0], dict):
            fail("candidate_archive_expected_single_legacy_manifest")
        index_manifests = index.get("manifests") if isinstance(index, dict) else None
        if not isinstance(index_manifests, list) or len(index_manifests) != 1 or not isinstance(index_manifests[0], dict):
            fail("candidate_archive_expected_single_oci_manifest")

        legacy_entry = legacy[0]
        repo_tags = legacy_entry.get("RepoTags")
        if not isinstance(repo_tags, list) or len(repo_tags) != 1 or not isinstance(repo_tags[0], str):
            fail("candidate_archive_expected_single_repo_tag")
        image_tag = repo_tags[0]

        config_path = legacy_entry.get("Config")
        if not isinstance(config_path, str) or not re.fullmatch(r"blobs/sha256/[0-9a-f]{64}", config_path):
            fail("candidate_archive_invalid_legacy_config_path")
        config_digest = f"sha256:{config_path.rsplit('/', 1)[1]}"
        config_bytes = read_member(archive, members, config_path)
        validate_blob_digest(config_bytes, config_digest, "oci_config_digest")

        manifest_digest = index_manifests[0].get("digest")
        if not isinstance(manifest_digest, str):
            fail("candidate_archive_missing_oci_manifest_digest")
        manifest_path = digest_to_blob_path(manifest_digest, "oci_manifest_digest")
        oci_manifest_bytes = read_member(archive, members, manifest_path)
        validate_blob_digest(oci_manifest_bytes, manifest_digest, "oci_manifest_digest")
        oci_manifest = parse_json(oci_manifest_bytes, manifest_path)
        if not isinstance(oci_manifest, dict):
            fail("candidate_archive_invalid_oci_manifest")
        oci_config = oci_manifest.get("config")
        if not isinstance(oci_config, dict) or oci_config.get("digest") != config_digest:
            fail("candidate_archive_oci_config_reference_mismatch")

        config_json = parse_json(config_bytes, config_path)
        if not isinstance(config_json, dict):
            fail("candidate_archive_invalid_config_json")
        runtime_config = config_json.get("config")
        if not isinstance(runtime_config, dict):
            fail("candidate_archive_missing_runtime_config")
        user = runtime_config.get("User") or ""
        labels = runtime_config.get("Labels") or {}
        env = runtime_config.get("Env") or []
        if not isinstance(labels, dict) or not isinstance(env, list):
            fail("candidate_archive_invalid_runtime_metadata")
        if any(not isinstance(item, str) for item in env):
            fail("candidate_archive_invalid_env")

        revision = labels.get("org.opencontainers.image.revision") or ""
        contract = labels.get("io.wandora.candidate") or ""
        if user != "node":
            fail("candidate_archive_must_run_as_node")
        if contract != EXPECTED_CONTRACT:
            fail("candidate_archive_contract_label_mismatch")
        if not GIT_SHA_RE.fullmatch(revision):
            fail("candidate_archive_invalid_revision_label")
        if any(FORBIDDEN_ENV_RE.search(item) for item in env):
            fail("candidate_archive_baked_sensitive_or_enable_env")

        return {
            "archive_sha256": sha256_file(path),
            "image_tag": image_tag,
            "oci_config_digest": config_digest,
            "oci_manifest_digest": manifest_digest,
            "image_user": user,
            "source_sha": revision,
            "candidate_contract": contract,
        }


def verify_manifest(archive_path: Path, manifest_path: Path, facts: dict[str, object]) -> None:
    manifest = parse_manifest_file(manifest_path)
    required = {
        "candidate_contract",
        "source_sha",
        "source_tree_sha",
        "image_tag",
        "runner_image_id",
        "image_user",
        "archive_file",
        "archive_sha256",
        "oci_config_digest",
        "oci_manifest_digest",
    }
    missing = sorted(required - manifest.keys())
    if missing:
        fail(f"candidate_manifest_missing_keys:{','.join(missing)}")
    if manifest["candidate_contract"] != EXPECTED_CONTRACT:
        fail("candidate_manifest_contract_mismatch")
    if not GIT_SHA_RE.fullmatch(manifest["source_sha"]):
        fail("candidate_manifest_invalid_source_sha")
    if not GIT_SHA_RE.fullmatch(manifest["source_tree_sha"]):
        fail("candidate_manifest_invalid_source_tree_sha")
    if not OCI_DIGEST_RE.fullmatch(manifest["runner_image_id"]):
        fail("candidate_manifest_invalid_runner_image_id")
    if not OCI_DIGEST_RE.fullmatch(manifest["oci_config_digest"]):
        fail("candidate_manifest_invalid_oci_config_digest")
    if not OCI_DIGEST_RE.fullmatch(manifest["oci_manifest_digest"]):
        fail("candidate_manifest_invalid_oci_manifest_digest")
    if not SHA256_RE.fullmatch(manifest["archive_sha256"]):
        fail("candidate_manifest_invalid_archive_sha256")
    if Path(manifest["archive_file"]).name != manifest["archive_file"]:
        fail("candidate_manifest_archive_file_must_be_basename")
    if manifest["archive_file"] != archive_path.name:
        fail("candidate_manifest_archive_file_mismatch")

    comparisons = {
        "candidate_contract": "candidate_contract",
        "source_sha": "source_sha",
        "image_tag": "image_tag",
        "image_user": "image_user",
        "archive_sha256": "archive_sha256",
        "oci_config_digest": "oci_config_digest",
        "oci_manifest_digest": "oci_manifest_digest",
    }
    for manifest_key, fact_key in comparisons.items():
        if manifest[manifest_key] != facts[fact_key]:
            fail(f"candidate_manifest_fact_mismatch:{manifest_key}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", required=True, type=Path)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()

    try:
        facts = inspect_archive(args.archive)
        if args.manifest is not None:
            verify_manifest(args.archive, args.manifest, facts)
    except VerificationError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"archive_sha256={facts['archive_sha256']}")
    print(f"image_tag={facts['image_tag']}")
    print(f"oci_config_digest={facts['oci_config_digest']}")
    print(f"oci_manifest_digest={facts['oci_manifest_digest']}")
    print(f"image_user={facts['image_user']}")
    print(f"source_sha={facts['source_sha']}")
    print(f"candidate_contract={facts['candidate_contract']}")
    if args.manifest is not None:
        print("PORTABLE_CANDIDATE_ARCHIVE_V1_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
