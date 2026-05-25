# Runtime Adapter Contract v1

Runtime adapter contract v1 is the machine-readable declaration a downstream
Agent runtime publishes to say how it consumes Cardity manifests.

Cardity stays the protocol contract layer. The runtime stays responsible for
workspace generation, execution, permission gates, dry runs, readback, audit,
and replay protection.

## Schema

Schema file:

```text
schemas/runtime_adapter_contract_v1.schema.json
```

Stable schema id:

```text
https://cardity.org/schemas/runtime_adapter_contract_v1.schema.json
```

## Required Fields

| Field | Purpose |
| --- | --- |
| `schema` | Must be `cardity.runtime_adapter_contract.v1`. |
| `runtime.name` | Runtime or Agent OS name. |
| `runtime.version` | Runtime adapter version. |
| `supported_manifest_versions` | Cardity manifest versions accepted by the runtime. |
| `supported_action_contracts` | Action contract versions accepted by the runtime. |
| `supported_projection_contracts` | Projection contract versions accepted by the runtime. |
| `supported_production_write_contracts` | Optional production write contract versions accepted by the runtime. |
| `supported_checkpoint_contracts` | Optional checkpoint contract versions accepted by the runtime. |
| `capabilities` | Boolean capability map for execution behavior. |
| `production_write_policy` | Production write boundary. |
| `conformance.status` | Current Cardity compatibility status. |

## Capabilities

| Capability | Meaning |
| --- | --- |
| `register_actions` | Runtime can register Cardity actions as executable/plannable actions. |
| `permission_gate` | Runtime can enforce action permission metadata. |
| `dry_run_executor` | Runtime can preview or plan actions without writes. |
| `write_executor` | Runtime can execute production writes. |
| `readback_executor` | Runtime can run readback queries after writes. |
| `audit_sink` | Runtime can persist audit events. |
| `replay_guard` | Runtime can protect against duplicate/replayed writes. |
| `external_navigation` | Runtime can expose external navigation entries. |
| `external_services` | Runtime can expose external service entries. |
| `conformance_gate` | Runtime blocks generation when Cardity conformance fails. |
| `manifest_validation` | Runtime validates manifest schema/contract before generation. |
| `workspace_metadata` | Runtime stores Cardity contract version metadata in generated workspaces. |
| `diagnostics_surface` | Runtime exposes Cardity diagnostics/conformance errors to users or logs. |

## Production Write Policy

Cardity treats production writes as unsafe unless a runtime explicitly declares
its safety boundary.

```json
{
  "production_write_policy": {
    "mode": "dry_run_only",
    "requires_permission_contract": true,
    "requires_confirm_required": true,
    "requires_readback_query": true,
    "requires_idempotency_key": true,
    "requires_replay_policy": true,
    "requires_production_write_contract": true
  }
}
```

Allowed modes:

| Mode | Meaning |
| --- | --- |
| `disabled` | Runtime never executes production writes from Cardity actions. |
| `dry_run_only` | Runtime can plan/preview writes, but production write execution is disabled. |
| `permissioned` | Runtime may execute writes only when full permission/readback/idempotency/replay contracts exist. |

When a runtime supports real writes, it should declare
`supported_production_write_contracts` and require
`production_write_policy.requires_production_write_contract=true`.

## PMTSoul Reference Adapter

Reference file:

```text
examples/runtime_adapter_pmtsoul_agent_os.json
```

The PMTSoul adapter declares:

- manifest v1 support;
- agent action contract v1 support;
- projection contract v1.1 support;
- conformance gate before workspace generation;
- workspace metadata persistence;
- dry-run write behavior;
- production writes disabled until an explicit deployment/write permission
  contract exists.

Merchant ERP remains only a reference implementation. The adapter contract is
generic and should apply to any downstream Agent runtime.

## CLI

```bash
cardity adapter examples/runtime_adapter_pmtsoul_agent_os.json
cardity adapter examples/runtime_adapter_pmtsoul_agent_os.json --json
```

Use an adapter during manifest conformance:

```bash
cardity conformance examples/02_member_points_agent.car \
  --runtime-adapter examples/runtime_adapter_pmtsoul_agent_os.json
```

## Hosted API

```bash
curl https://api.cardity.org/v1/runtime-adapter/validate \
  -H "content-type: application/json" \
  -d @examples/runtime_adapter_pmtsoul_agent_os.json
```

Or wrap it:

```json
{
  "runtime_adapter": {
    "schema": "cardity.runtime_adapter_contract.v1"
  },
  "format": "json"
}
```

## MCP

Tool:

```text
cardity_validate_runtime_adapter
```

Input:

```json
{
  "runtime_adapter": {},
  "format": "json"
}
```

Output:

```json
{
  "schema": "cardity.runtime_adapter_validation_tool_result.v1",
  "ok": true,
  "report": {
    "schema": "cardity.runtime_adapter_validation.v1"
  }
}
```
