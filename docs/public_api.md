# Cardity Public API

Cardity Public API exposes the protocol compiler to external agents. It accepts
source text and returns machine-readable artifacts; it does not deploy, sign,
read arbitrary files, or mutate a user's workspace.

## Start Locally

```bash
npm run build
npm run serve
```

Default URL:

```text
http://127.0.0.1:8787
```

## Docker

```bash
docker build -t cardity-core .
docker run --rm -p 8787:8787 cardity-core
```

## Cloudflare Containers

The public API can be deployed as a Cloudflare Container behind a Worker:

```bash
npm install
npm run build
npm run deploy:cloudflare
```

The Worker is configured in `wrangler.jsonc` and exposes:

```text
https://api.cardity.org
```

Cloudflare Containers are required because `cardity-core` currently relies on
native C++ binaries. Plain Workers cannot execute those binaries directly.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check. |
| `POST /v1/compile` | Compile Cardity source into protocol JSON, ABI, CARC, and Agent OS manifest. |
| `POST /v1/validate` | Validate source and return protocol summary. |
| `POST /v1/manifest` | Return only the Agent OS manifest. |
| `POST /v1/abi` | Return only ABI. |
| `POST /v1/explain` | Explain a source/manifest contract as Markdown plus JSON summary. |
| `POST /v1/review` | Review action/projection safety. |
| `POST /v1/diff` | Compare two sources/manifests for breaking contract changes. |
| `POST /v1/conformance` | Run manifest/action/projection/runtime compatibility checks. |
| `POST /v1/generation-guide` | Return the current agent-safe protocol generation rules. |
| `POST /mcp` | Minimal JSON-RPC MCP-over-HTTP endpoint for tool discovery and calls. |

## Compile

```http
POST /v1/compile
content-type: application/json
```

```json
{
  "source_text": "protocol Counter { version: \"1.0.0\"; owner: \"doge1\"; state { count: int = 0; } method get_count() { state.count = state.count; } returns: int state.count; }",
  "include_manifest": true,
  "include_abi": true,
  "include_protocol": false,
  "carc": false
}
```

Response:

```json
{
  "schema": "cardity.agent_compile_result.v1",
  "ok": true,
  "protocol": {
    "name": "Counter",
    "version": "1.0.0"
  },
  "artifacts": {
    "protocol_json": "/tmp/cardity-public-artifacts/protocol.json",
    "abi": "/tmp/cardity-public-artifacts/protocol.abi.json",
    "agent_manifest": "/tmp/cardity-public-artifacts/protocol.agent.json"
  },
  "manifest": {}
}
```

## Security Model

The public API is intentionally compiler-only:

- accepts `source_text`;
- writes only temporary artifacts;
- does not deploy;
- does not sign;
- does not read user workspace paths in hosted mode;
- does not run arbitrary shell commands;
- limits request body size through `CARDITY_MAX_BODY_BYTES`.

For hosted deployments, set a private temporary artifact directory and delete
old files periodically.

## MCP-over-HTTP

The `/mcp` endpoint supports:

- `initialize`
- `tools/list`
- `tools/call` with `cardity_generation_guide`
- `tools/call` with `cardity_compile`
- `tools/call` with `cardity_manifest`
- `tools/call` with `cardity_explain_manifest`
- `tools/call` with `cardity_review_security`
- `tools/call` with `cardity_diff`
- `tools/call` with `cardity_conformance`

`cardity_generation_guide` should be the first call for agents that generate a
protocol from natural language. It tells the model to keep `state` scalar and to
place keyed business data in top-level `table` blocks:

```cardity
table balances {
  user: address;
  balance: int = 0;
}
```

Hosted `/mcp` rejects agent-unsafe indexed state access such as
`state.balances[params.user]`. That shape belongs in `table` declarations and
Agent OS persistence, not scalar protocol state.

Example:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "cardity_compile",
    "arguments": {
      "source_text": "protocol Counter { ... }",
      "include_manifest": true
    }
  }
}
```

For local desktop agents, prefer `bin/cardity_mcp_server.js` over `/mcp`.
