# Cardity Schema Registry

Cardity Schema Registry is the stable machine-readable index for all Cardity
contract schemas.

The registry lets Agent runtimes, CI jobs, MCP clients, and generated
workspaces reference the same schema files instead of copying local paths.

## Registry URL

```text
https://api.cardity.org/schemas
```

Equivalent JSON file URL:

```text
https://api.cardity.org/schemas/registry.json
```

Local source of truth:

```text
schemas/registry.json
```

## Schema URLs

| Contract | URL |
|---|---|
| Agent OS manifest v1 | `https://api.cardity.org/schemas/agent_manifest_v1.schema.json` |
| Agent action contract v1 | `https://api.cardity.org/schemas/agent_action_contract_v1.schema.json` |
| Projection contract v1.1 | `https://api.cardity.org/schemas/projection_contract_v1_1.schema.json` |
| Runtime adapter contract v1 | `https://api.cardity.org/schemas/runtime_adapter_contract_v1.schema.json` |
| Conformance report v1 | `https://api.cardity.org/schemas/conformance_report_v1.schema.json` |
| Security review v1 | `https://api.cardity.org/schemas/security_review_v1.schema.json` |
| Protocol diff v1 | `https://api.cardity.org/schemas/protocol_diff_v1.schema.json` |
| Manifest visualization v1 | `https://api.cardity.org/schemas/manifest_visualization_v1.schema.json` |
| Explain result v1 | `https://api.cardity.org/schemas/explain_result_v1.schema.json` |
| Diagnostics v1 | `https://api.cardity.org/schemas/diagnostics_v1.schema.json` |
| Package v1 | `https://api.cardity.org/schemas/package_v1.schema.json` |
| Ecosystem registry v1 | `https://api.cardity.org/schemas/ecosystem_registry_v1.schema.json` |

The `$id` inside schemas remains under:

```text
https://cardity.org/schemas/<schema-file>
```

The hosted API currently serves the retrievable registry endpoints under
`api.cardity.org`.

## CLI

List registry entries:

```bash
cardity schemas
```

Print one schema:

```bash
cardity schemas runtime_adapter_contract_v1
cardity schemas runtime_adapter_contract_v1.schema.json
cardity schemas cardity.runtime_adapter_contract.v1
```

## MCP

Tool:

```text
cardity_schema_registry
```

Inputs:

```json
{}
```

```json
{
  "name": "projection_contract_v1_1"
}
```

## Hosted API

```bash
curl https://api.cardity.org/schemas
curl https://api.cardity.org/schemas/runtime_adapter_contract_v1.schema.json
```

## PMTSoul Usage

PMTSoul Agent OS should store these URLs alongside generated workspace metadata:

```json
{
  "cardity": {
    "manifest_version": "cardity.agent_manifest.v1",
    "manifest_schema_url": "https://api.cardity.org/schemas/agent_manifest_v1.schema.json",
    "action_contract_schema_url": "https://api.cardity.org/schemas/agent_action_contract_v1.schema.json",
    "projection_contract_schema_url": "https://api.cardity.org/schemas/projection_contract_v1_1.schema.json",
    "runtime_adapter_schema_url": "https://api.cardity.org/schemas/runtime_adapter_contract_v1.schema.json"
  }
}
```

This keeps PMTSoul validation aligned with the same Cardity contract versions
that the hosted API, CLI, and MCP tools expose.
