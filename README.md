# Cardity Core

Cardity Core is an agent protocol compiler. It turns a typed `.car` protocol
into the artifacts an AI agent needs to generate and operate a system:

- compiled protocol JSON
- ABI
- CARC deploy artifact
- Agent OS manifest
- MCP tools
- HTTP compiler API
- CLI adapters for local agents

The project started as a Dogecoin/Cardinals protocol toolchain. That deployment
path still exists, but the current product direction is broader: Cardity is the
protocol layer between natural-language intent and generated agent systems.

```text
user intent
  -> Cardity protocol
  -> compiler validation
  -> ABI + Agent OS manifest
  -> API routes, database tables, UI actions, workflows, permissions
  -> agent-generated system
```

## Hosted API

The public compiler API is deployed at:

```text
https://api.cardity.org
```

Useful endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /edge-health` | Edge Worker health check. |
| `GET /health` | Container API health check. |
| `POST /v1/compile` | Compile source into protocol JSON, ABI, and Agent OS manifest. |
| `POST /v1/validate` | Validate source and return a protocol summary. |
| `POST /v1/manifest` | Return only the Agent OS manifest. |
| `POST /v1/abi` | Return only ABI. |
| `POST /v1/generation-guide` | Return agent-safe generation rules. |
| `POST /mcp` | Minimal MCP-over-HTTP JSON-RPC endpoint. |

Example:

```bash
curl -sS https://api.cardity.org/v1/compile \
  -H 'content-type: application/json' \
  --data '{
    "source_text": "protocol Counter { version: \"1.0.0\"; owner: \"agent-os\"; state { count: int = 0; } event CountChanged { value: int; } method set_count(value: int) { state.count = params.value; emit CountChanged(params.value); } returns: int state.count; }",
    "include_manifest": true,
    "include_protocol": true
  }'
```

## MCP

Cardity exposes two primary MCP tools:

| Tool | Purpose |
|---|---|
| `cardity_generation_guide` | Return the current agent-safe protocol generation rules. |
| `cardity_compile` | Compile Cardity source text into protocol JSON, ABI, CARC, and an Agent OS manifest. |

For local desktop agents, run the stdio MCP server:

```bash
npm install
npm run build
node bin/cardity_mcp_server.js
```

For hosted agents, call the `/mcp` JSON-RPC endpoint:

```bash
curl -sS https://api.cardity.org/mcp \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Agent OS Manifest

The Agent OS manifest is the main handoff from Cardity Core to an agent runtime.
It describes the system implied by the protocol:

```json
{
  "schema": "cardity.agent_manifest.v1",
  "protocol": { "name": "Counter", "version": "1.0.0" },
  "state": [],
  "tables": [],
  "events": [],
  "methods": [],
  "permissions": [],
  "system": {
    "api": { "routes": [] },
    "database": { "tables": [] },
    "ui": { "resources": [], "actions": [] },
    "workflows": []
  },
  "agent": { "tools": [], "events": [] }
}
```

An agent can read this manifest to generate:

- API routes
- database schema
- UI actions
- event workflows
- tool definitions
- confirmation policy for state-changing actions

## Example Protocol

```cardity
protocol Counter {
  version: "1.0.0";
  owner: "agent-os";

  state {
    count: int = 0;
    status: string = "idle";
  }

  event CountChanged {
    count: int;
    status: string;
  }

  method set_count(value: int) {
    state.count = params.value;
    if (state.count >= 10) { state.status = "large" }
    emit CountChanged(state.count, state.status);
  }
  returns: string state.status;

  method get_count() {
    state.count = state.count;
  }
  returns: int state.count;
}
```

Compile it:

```bash
npm run build
node bin/cardity_agent.js compile examples/01_counter.car \
  --out-dir /tmp/cardity_counter \
  --include-manifest \
  --include-abi \
  --include-protocol
```

Or generate only the Agent OS manifest:

```bash
./build/cardityc examples/01_counter.car \
  --format agent-manifest \
  -o /tmp/counter.agent.json
```

## Agent-Safe Protocol Rules

Cardity gives LLMs a narrow, compiler-checked shape to generate:

- Use `protocol`, `version`, `owner`, `state`, `table`, `event`, `method`, and
  `returns` blocks.
- Keep `state` scalar and explicit: `int`, `string`, `bool`, `address`.
- Put keyed business data in top-level `table` blocks.
- Use methods for callable intent, params, return values, events, and scalar
  summary/audit state.
- Methods that write state or emit events become confirmation-required actions
  in the manifest.
- Read-only query methods should avoid writes and emits so they become query
  tools.

For example, do this:

```cardity
table member_point_balances {
  user: address;
  balance: int = 0;
}
```

Not this:

```cardity
state.balances[params.user] = state.balances[params.user] + params.amount;
```

The hosted compiler rejects agent-unsafe indexed state access and returns repair
guidance so an LLM can fix the protocol.

## Local Development

Requirements:

- Node.js 18+
- CMake
- C++17 compiler
- `nlohmann_json`

Install, build, and test:

```bash
npm install
npm run build
npm test
```

Run the HTTP API locally:

```bash
npm run serve
curl -sS http://127.0.0.1:8787/health
```

## CLI Reference

Compile to protocol JSON:

```bash
./build/cardityc examples/01_counter.car --format json -o /tmp/counter.json
```

Compile to CARC:

```bash
./build/cardityc examples/01_counter.car --format carc -o /tmp/counter.carc
```

Compile to Agent OS manifest:

```bash
./build/cardityc examples/01_counter.car --format agent-manifest -o /tmp/counter.agent.json
```

Use the agent-friendly adapter:

```bash
node bin/cardity_agent.js compile examples/02_member_points_agent.car \
  --out-dir /tmp/member_points \
  --include-manifest
```

Run a compiled protocol locally:

```bash
./build/cardity_runtime /tmp/counter.json set_count 12 --state /tmp/counter_state.json
./build/cardity_runtime /tmp/counter.json get_count --state /tmp/counter_state.json
```

## PMTSoul Agent Integration

PMTSoul Agent integrates with Cardity through the generated manifest:

```text
PMTSoul Agent
  -> Cardity MCP/CLI/API
  -> protocol JSON + ABI + Agent OS manifest
  -> workspace scaffold
  -> policy confirmation
  -> runtime execution
```

The `pmtsoul-agent` integration currently consumes:

- `manifest.system.api.routes`
- `manifest.system.database.tables`
- `manifest.system.ui.actions`
- `manifest.system.workflows`
- `manifest.permissions`
- compiled `protocol_json.cpl.methods`

See [docs/pmtsoul_agent_integration.md](docs/pmtsoul_agent_integration.md).

## Deploying the Public API

The hosted API runs as a Cloudflare Worker with a Cloudflare Container behind a
Durable Object binding. Containers are used because Cardity Core includes native
C++ compiler/runtime binaries.

```bash
npm install
npm run build
npm run deploy:cloudflare
```

The deployment config lives in [wrangler.jsonc](wrangler.jsonc). The current
production route is:

```text
api.cardity.org/*
```

## Documentation

- [Agent protocol layer](docs/agent_protocol_layer.md)
- [Public API](docs/public_api.md)
- [PMTSoul Agent integration](docs/pmtsoul_agent_integration.md)
- [Release plan](docs/release_plan.md)

Legacy Dogecoin/Cardinals deployment, package, inscription, and SDK tools remain
in the repository for compatibility. They are no longer the primary README
entry point.

## License

MIT License
