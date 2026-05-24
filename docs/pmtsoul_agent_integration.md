# PMTSoul Agent Integration

Cardity Core should integrate with PMTSoul Agent as a protocol engine, not as
business logic inside the agent runtime.

## Recommended Boundary

```text
PMTSoul Agent
  -> tool call / MCP call
  -> Cardity Core
  -> compiled protocol JSON
  -> ABI
  -> Agent OS manifest
  -> generated system plan / workspace artifacts
```

Cardity owns protocol semantics. PMTSoul Agent owns run orchestration, streaming
events, workspace writes, policy confirmation, and user-visible execution.

## MCP Configuration

Hosted MCP configuration:

```json
{
  "mcpServers": {
    "cardity_core": {
      "url": "https://api.cardity.org/mcp"
    }
  }
}
```

Local stdio MCP configuration:

```yaml
mcp_servers:
  cardity:
    command: "node"
    args:
      - "/Users/dogesong/Documents/workspace/cardity-core/bin/cardity_mcp_server.js"
    timeout: 180
```

Before using the server, build Cardity Core:

```bash
cd /Users/dogesong/Documents/workspace/cardity-core
npm run build
```

## Exposed Tools

| Tool | Purpose |
|---|---|
| `cardity_generation_guide` | Return the current agent-safe protocol generation rules and table-first prompt scaffold. |
| `cardity_compile` | Compile `.car` into protocol JSON, ABI, CARC, and Agent OS manifest. |
| `cardity_manifest` | Generate only the Agent OS manifest. |
| `cardity_explain_manifest` | Explain methods, actions, permissions, routes, database contracts, events, and workflows. |
| `cardity_visualize_manifest` | Render the manifest as a layered business/system/agent contract graph. |
| `cardity_review_security` | Review action/projection safety before generated workspaces enable execution. |
| `cardity_diff` | Compare old/new protocol or manifest contracts for breaking changes. |
| `cardity_conformance` | Produce a compatibility report for manifest/action/projection/runtime-adapter consumption. |
| `cardity_validate_runtime_adapter` | Validate PMTSoul's runtime adapter compatibility declaration. |
| `cardity_schema_registry` | Return stable Cardity schema URLs or schema documents. |
| `cardity_runtime_compatibility` | Return PMTSoul's Cardity-compatible runtime registry entry. |
| `cardity_ecosystem_registry` | Return templates, schema refs, runtime adapters, badges, and package examples. |

Example `cardity_compile` arguments:

```json
{
  "file": "/Users/dogesong/Documents/workspace/cardity-core/examples/01_counter.car",
  "out_dir": "/tmp/cardity-agent-artifacts",
  "include_manifest": true,
  "include_abi": false,
  "include_protocol": false,
  "carc": true
}
```

The tool returns a text payload containing a JSON envelope:

```json
{
  "schema": "cardity.agent_compile_result.v1",
  "ok": true,
  "artifacts": {
    "protocol_json": "/tmp/cardity-agent-artifacts/01_counter.json",
    "abi": "/tmp/cardity-agent-artifacts/01_counter.abi.json",
    "agent_manifest": "/tmp/cardity-agent-artifacts/01_counter.agent.json",
    "carc": "/tmp/cardity-agent-artifacts/01_counter.carc"
  },
  "summary": {
    "state": [],
    "methods": [],
    "events": [],
    "tools": []
  }
}
```

## PMTSoul Run Flow

```text
user says: "generate a membership credit system"
  -> PMTSoul planner drafts Cardity protocol
  -> cardity_compile
  -> PMTSoul reads manifest.agent.tools, manifest.system, manifest.permissions
  -> PMTSoul writes workspace artifacts
  -> PMTSoul streams progress over /v1/runs/{run_id}/events
  -> PMTSoul asks for confirmation before deploy or state-changing actions
```

## Confirmation Rule

Use `manifest.permissions` as the first policy signal. Methods that write state
or emit events are marked:

```json
{
  "action": "set_count",
  "requires_confirmation": true,
  "reason": "Method writes state or emits protocol events"
}
```

Read-only methods can be treated as query tools by PMTSoul Agent.

## Generic Action Contract

Cardity stays runtime-agnostic. Downstream Agent runtimes should consume
actions from `system.ui.actions` as a generic planning and execution contract,
not as PMTSoul-specific ERP instructions.

Agent action contract v1 is the normative generic action contract. See
`docs/agent_action_contract_v1.md`.

Each action includes:

| Field | Detail |
|---|---|
| `kind` | One of `query`, `command`, or `external_navigation`. |
| `intent_names` | Names and aliases planners can match against user intent. |
| `intent_examples` | Example user intents for planner grounding. |
| `disambiguation_keys` | Input fields that identify the target object. |
| `required_context` | Runtime context such as `ctx.sender`, `ctx.merchant_id`, or `ctx.workspace_id`. |
| `input_schema` | JSON schema for action input. |
| `output_schema` / `returns_read_model` | JSON schema or read model returned by the action. |
| `permission` | Permission contract identifier, or `null` when no write permission has been granted. |
| `confirm_required` | Whether the runtime must request confirmation before execution. |
| `dry_run_supported` | Whether the runtime can plan without committing writes. |
| `readback_required` | Whether a committed command must produce a confirmed readback payload. |
| `readback_query` | Query contract or post-commit route used to fetch readback state. |
| `idempotency_key` | Expression used to prevent duplicate execution, usually `$run.id`. |
| `risk_level` | Planner-facing risk hint such as `low`, `medium`, or `high`. |
| `side_effects` | Declared reads, writes, emits, or external effects. |
| `audit_event` | Event name a runtime can use for auditing. |
| `replay_policy` | Replay behavior for idempotent command execution. |

Module-level planner hints are emitted under `system.modules[].intent_names`.
External entries live under `system.external.navigation[]` and
`system.external.services[]`. DK verification, app update checks, and contact-us
entries should remain static/external navigation items until a runtime grants a
concrete service/action permission contract.

## Database Projection Contract

Projection contract v1.1 is the first stable Cardity <-> PMTSoul Agent OS
baseline. See `docs/projection_contract_v1_1.md` for the normative contract.

PMTSoul Agent should prefer explicit table projections from:

```json
{
  "system": {
    "database": {
      "tables": [],
      "read_models": [],
      "queries": [],
      "projections": []
    }
  }
}
```

`projections` is the handoff from Cardity events to Agent OS business tables.
It lets Cardity say what should be written after an event without requiring
PMTSoul to guess from event names.

Example for a membership points protocol:

```json
{
  "name": "points_earned_to_member_points",
  "on": { "event": "PointsEarned" },
  "writes": [
    {
      "table": "member_point_balances",
      "operation": "upsert_delta",
      "key": { "user": "$event.user" },
      "delta": { "balance": "$event.amount" }
    },
    {
      "table": "member_point_ledger",
      "operation": "insert",
      "values": {
        "user": "$event.user",
        "delta": "$event.amount",
        "reason": "$event.reason",
        "actor": "$ctx.sender",
        "operation": "earn_points"
      }
    }
  ]
}
```

Required PMTSoul behavior:

| Requirement | Detail |
|---|---|
| Read `system.database.projections` | Treat it as the primary event-to-table write contract. |
| Support `insert` | Insert a row using `values`. |
| Support `upsert_delta` | Find row by `key`; insert if missing; otherwise add `delta` fields to existing numeric columns. |
| Support `upsert_snapshot` | Find row by `key`; insert if missing; otherwise replace the current-state columns from `values` or `snapshot`. |
| Support composite keys | Accept `key` as either an object map or an ordered array such as `["merchant_id", "goods_id"]`. |
| Support delete semantics | Support `delete` and `soft_delete` for removed or archived read-model rows. |
| Resolve expressions | Support `$event.<field>`, `-$event.<field>`, `$readback.<field>`, `-$readback.<field>`, `$source.<field>`, `$ctx.sender`, `$ctx.merchant_id`, `$ctx.workspace_id`, `$run.id`, and literal strings/numbers. |
| Support readback source | `source: "confirmed_readback"` means projection values should be read from the post-write readback payload after commit. |
| Preserve idempotency | Use `source_id`, `projection.name`, `projection.version`, and write index to prevent duplicate replay writes. |
| Validate event source fields | If a projection references `$event.id`, `$event.write_index`, or any other `$event.*` idempotency field, require that field in `events[].runtime_fields` or `events[].params`. |
| Keep confirmation policy | Apply projections only after the corresponding write operation has passed confirmation and committed. |
| Keep fallback compatibility | If `projections` is absent, PMTSoul may keep its existing heuristic event mapping. |

Read-model schemas are emitted under `system.database.read_models` and include
`columns`, `primary_key`, `indexes`, nullable/default metadata, and optional
`query_contracts`. Query/view contracts are also summarized under
`system.database.queries`, for example:

```json
{
  "name": "merchant_products.list",
  "read_model": "merchant_products",
  "operation": "list",
  "filters": ["merchant_id", "goods_id"]
}
```

## Adapter Strategy

Start with MCP because it keeps the repo boundary clean. Once the manifest
contract stabilizes, PMTSoul can add a built-in `tools/cardity_tool.py` wrapper
that calls the same `cardity_agent` CLI or links a future Cardity SDK.

PMTSoul should publish and keep current a runtime adapter declaration shaped by
`schemas/runtime_adapter_contract_v1.schema.json`. The current reference lives
at:

```text
examples/runtime_adapter_pmtsoul_agent_os.json
```

Validate it locally:

```bash
node bin/cardity.js adapter examples/runtime_adapter_pmtsoul_agent_os.json
```

Validate it through hosted Cardity:

```bash
curl https://api.cardity.org/v1/runtime-adapter/validate \
  -H "content-type: application/json" \
  -d @examples/runtime_adapter_pmtsoul_agent_os.json
```

The adapter declaration is how PMTSoul says: which Cardity manifest/action/
projection contract versions it supports, whether conformance blocks workspace
generation, how dry-run/readback/audit/replay are handled, and whether
production writes are disabled or permissioned.

PMTSoul should also store the Schema Registry URLs in generated workspace
metadata so future validation can resolve the same Cardity contract documents:

```text
https://api.cardity.org/schemas
https://api.cardity.org/schemas/agent_manifest_v1.schema.json
https://api.cardity.org/schemas/agent_action_contract_v1.schema.json
https://api.cardity.org/schemas/production_write_contract_v1.schema.json
https://api.cardity.org/schemas/projection_contract_v1_1.schema.json
https://api.cardity.org/schemas/runtime_adapter_contract_v1.schema.json
```

For PMTSoul's next production-write phase, Cardity now exposes a generic
`cardity.production_write_contract.v1` schema. PMTSoul can use it to gate real
writes with permission id, confirmation policy, confirmation UI state,
confirmed readback verification, idempotency, audit, replay, compensation,
long-running task result, and role-scoped tool permission metadata. This remains
a generic Agent action contract, not an ERP-specific DSL.

PMTSoul is also listed in the Cardity runtime compatibility registry:

```text
https://api.cardity.org/runtimes/pmtsoul-agent-os
```

The entry records PMTSoul's current boundary: conformance gate enabled,
Cardity metadata persisted, dry-run executor enabled, and production writes kept
`dry_run_only`.

PMTSoul can also consume the static ecosystem registry:

```text
https://api.cardity.org/registry
https://api.cardity.org/registry/templates/member_points
https://api.cardity.org/registry/packages/member-points-system
```

PMTSoul can embed the Cardity compatibility badge:

```markdown
[![Cardity-compatible](https://api.cardity.org/runtimes/pmtsoul-agent-os/badge.svg)](https://api.cardity.org/runtimes/pmtsoul-agent-os)
```

## Reference ERP Example

- Protocol: `examples/03_merchant_erp_agent.car`
- Projection contract example: `examples/03_merchant_erp_projection_v1_1.json`

The reference ERP shape covers product, inventory, and order read models,
confirmed readback projections, merchant-scoped composite keys, replay-safe
projection writes, and list/detail query contracts.
