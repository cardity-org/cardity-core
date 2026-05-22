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

Add Cardity Core as an external MCP server in the PMTSoul/Hermes MCP config:

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

## Database Projection Contract

PMTSoul Agent should prefer explicit table projections from:

```json
{
  "system": {
    "database": {
      "tables": [],
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
| Resolve expressions | Support `$event.<field>`, `-$event.<field>`, `$ctx.sender`, and literal strings/numbers. |
| Keep confirmation policy | Apply projections only after the corresponding write operation has passed confirmation and committed. |
| Keep fallback compatibility | If `projections` is absent, PMTSoul may keep its existing heuristic event mapping. |

## Adapter Strategy

Start with MCP because it keeps the repo boundary clean. Once the manifest
contract stabilizes, PMTSoul can add a built-in `tools/cardity_tool.py` wrapper
that calls the same `cardity_agent` CLI or links a future Cardity SDK.
