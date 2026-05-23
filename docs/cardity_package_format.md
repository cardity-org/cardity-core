# Cardity Package Format

`cardity.package.v1` defines a portable `.carditypkg` bundle for sharing a
Cardity protocol with agent runtimes, registries, CI systems, and browser tools.

This is separate from the legacy Dogecoin/Cardinals deployment package. A
`.carditypkg` is an off-chain distribution artifact: it keeps protocol source,
compiled artifacts, manifests, schemas, documentation, and checksums together.

## CLI

```bash
cardity pack dist --name member-points-system --pkg-version 1.0.0 -o member-points.carditypkg
cardity verify-package member-points.carditypkg
cardity unpack member-points.carditypkg --out-dir ./unpacked
```

Machine-readable verification:

```bash
cardity verify-package member-points.carditypkg --json
```

## Document Shape

```json
{
  "schema": "cardity.package.v1",
  "package": {
    "name": "member-points-system",
    "version": "1.0.0"
  },
  "format": {
    "version": "v1",
    "encoding": "json+base64",
    "hash": "sha256"
  },
  "artifacts": {
    "protocol_sources": ["protocol.car"],
    "compiled_protocols": ["protocol.carc"],
    "abis": ["protocol.abi.json"],
    "agent_manifests": ["protocol.agent.json"],
    "schemas": [],
    "documentation": ["README.md"]
  },
  "files": [
    {
      "path": "protocol.agent.json",
      "kind": "agent_manifest",
      "media_type": "application/json",
      "size": 1234,
      "sha256": "..."
    }
  ],
  "checksums": {
    "files_sha256": "..."
  },
  "signatures": []
}
```

Each file entry also contains `content_b64`. `cardity unpack` verifies every
file SHA-256 and the package-level `files_sha256` before writing files.

## Safety Rules

- Package paths must be relative.
- `..` path traversal is rejected.
- File sizes and SHA-256 hashes are verified before unpacking.
- Non-empty output directories require `--force`.
- `signatures` is reserved for a future signed package flow.

## Runtime Use

Agent runtimes can install a `.carditypkg` by:

1. Verifying `schema === "cardity.package.v1"`.
2. Checking `checksums.files_sha256`.
3. Reading `artifacts.agent_manifests`.
4. Running Cardity conformance on the selected manifest.
5. Registering actions only after conformance passes.

The canonical schema is available at:

```text
https://api.cardity.org/schemas/package_v1.schema.json
```
