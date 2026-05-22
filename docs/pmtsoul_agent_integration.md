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

## Adapter Strategy

Start with MCP because it keeps the repo boundary clean. Once the manifest
contract stabilizes, PMTSoul can add a built-in `tools/cardity_tool.py` wrapper
that calls the same `cardity_agent` CLI or links a future Cardity SDK.
