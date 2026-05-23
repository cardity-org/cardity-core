# Cardity Core System Architecture And Ops Map

This document is the common operating map for Cardity Core. Keep it updated
when deployment targets, public URLs, MCP tools, release commands, or adjacent
projects change.

## Common Memory

| Item | Value |
|---|---|
| Core repo | `/Users/dogesong/Documents/workspace/cardity-core` |
| GitHub repo | `cardity-org/cardity-core` |
| Public API | `https://api.cardity.org` |
| Hosted MCP | `https://api.cardity.org/mcp` |
| Cloudflare Worker | `cardity-core-api-proxy` |
| Cloudflare account | Seven.psong@gmail.com's Account |
| Website repo | `/Users/dogesong/Documents/workspace/cardity_web` |
| Website URL | `https://cardity.org` |
| WASM repo | `/Users/dogesong/Documents/workspace/cardity_wasm` |
| PMTSoul Agent OS repo | `/Users/dogesong/Documents/workspace/pmtsoul-agent` |
| npm package | `cardity` |
| npm alpha install | `npm install -g cardity@alpha` |
| npm 90-day token file | `/Users/dogesong/.npm_cardity_deploy_90` |
| Git SSH deploy key | `~/.ssh/cardity-core-deploy` |

Do not commit local token files, npm credentials, Cloudflare credentials, or
private user data.

## Product Boundary

```text
Cardity Core
  -> protocol authoring contract
  -> compiler validation
  -> protocol JSON / ABI / CARC
  -> Agent OS manifest
  -> explain / review / diff / conformance assets
  -> MCP and HTTP API surface

Agent Runtime / PMTSoul
  -> workspace generation
  -> file writes
  -> policy gates and user confirmation
  -> dry-run and write execution
  -> readback, replay storage, audit logs
```

Cardity must stay a protocol contract layer. It should not become a full Agent
Runtime, low-code platform, production write executor, or PMTSoul-specific DSL.

## Runtime Architecture

```text
.car source
  -> C++ compiler binaries
     -> cardityc
     -> cardity_abi
     -> cardity_runtime
  -> Node CLI wrappers
     -> cardity
     -> cardity_agent
     -> cardity_mcp_server
     -> cardity_http_server
  -> Artifacts
     -> protocol JSON
     -> ABI JSON
     -> CARC
     -> Agent OS manifest
     -> explain/review/diff reports
  -> Consumers
     -> PMTSoul Agent OS
     -> Codex / Claude / Cursor through MCP
     -> Cloudflare hosted API and MCP
     -> cardity_web documentation/download pages
```

## Main Local Commands

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Build native compiler | `npm run build` |
| Run full smoke test | `npm test` |
| Compile for agents | `node bin/cardity_agent.js compile examples/01_counter.car --out-dir dist --include-manifest` |
| Generate manifest | `node bin/cardity.js manifest examples/01_counter.car` |
| Explain manifest | `node bin/cardity.js explain examples/01_counter.car --diagram` |
| Visualize manifest | `node bin/cardity.js visualize examples/02_member_points_agent.car` |
| Security review | `node bin/cardity.js review examples/02_member_points_agent.car` |
| Protocol diff | `node bin/cardity.js diff examples/01_counter.car examples/01_counter.car` |
| Conformance report | `node bin/cardity.js conformance examples/02_member_points_agent.car --runtime-adapter examples/runtime_adapter_cardity_mock.json` |
| Verify schemas | `node scripts/verify_contract_schemas.js` |
| Verify next-stage assets | `node scripts/verify_next_stage_assets.js` |

## Public API And MCP

The hosted API is served by Cloudflare Worker `cardity-core-api-proxy` at
`api.cardity.org`.

| Endpoint | Purpose |
|---|---|
| `GET /playground` | Browser playground for source, manifest, graph, review, and conformance output. |
| `GET /edge-health` | Worker edge health. |
| `GET /health` | Container health through fallback path. |
| `POST /v1/generation-guide` | Agent-safe authoring rules. |
| `POST /v1/compile` | Compile source text into artifacts. |
| `POST /v1/validate` | Validate source and return summary. |
| `POST /v1/manifest` | Return Agent OS manifest only. |
| `POST /v1/abi` | Return ABI only. |
| `POST /v1/explain` | Explain source/manifest contract. |
| `POST /v1/visualize` | Layered manifest graph. |
| `POST /v1/review` | Security review for action/projection safety. |
| `POST /v1/diff` | Contract diff for old/new source or manifest. |
| `POST /v1/conformance` | Manifest/action/projection/runtime compatibility report. |
| `POST /mcp` | MCP-over-HTTP tool endpoint. |

Hosted MCP tools:

| Tool | Purpose |
|---|---|
| `cardity_generation_guide` | Return Cardity authoring rules. |
| `cardity_compile` | Compile source text into artifacts. |
| `cardity_manifest` | Return manifest from source text. |
| `cardity_explain_manifest` | Explain source or manifest. |
| `cardity_visualize_manifest` | Render a layered manifest graph. |
| `cardity_review_security` | Review action/projection safety. |
| `cardity_diff` | Compare old/new source or manifest contracts. |
| `cardity_conformance` | Run manifest/action/projection/runtime compatibility checks. |

Local stdio MCP entry:

```yaml
mcp_servers:
  cardity_core:
    command: "node"
    args:
      - "/Users/dogesong/Documents/workspace/cardity-core/bin/cardity_mcp_server.js"
    timeout: 180
```

## Cloudflare Deployment

Config file:

```text
wrangler.jsonc
```

Important values:

| Field | Value |
|---|---|
| Worker name | `cardity-core-api-proxy` |
| Main | `src/cloudflare-worker.js` |
| Route | `api.cardity.org/*` |
| Durable Object | `CARDITY_API_CONTAINER` |
| Container image | `./Dockerfile` |

Deploy:

```bash
npm run build
wrangler deploy
```

Verify after deploy:

```bash
curl -sS https://api.cardity.org/edge-health
curl -sS https://api.cardity.org/v1/generation-guide \
  -H 'content-type: application/json' \
  -d '{"requirement":"member points"}'
```

MCP tool list smoke:

```bash
curl -sS https://api.cardity.org/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Release Map

| Target | Current path |
|---|---|
| GitHub source | commit to `master`, push to `origin master` |
| GitHub release | tag alpha releases, attach release notes when publishing |
| npm alpha | publish `cardity@0.1.0-alpha.x` with `--tag alpha` |
| Website | update `/Users/dogesong/Documents/workspace/cardity_web`, deploy Cloudflare Pages |
| Hosted API/MCP | `wrangler deploy` from `cardity-core` |

Recommended release verification before npm or GitHub release:

```bash
npm test
node scripts/verify_contract_schemas.js
node scripts/verify_next_stage_assets.js
node bin/cardity.js explain examples/01_counter.car --diagram
node bin/cardity.js visualize examples/02_member_points_agent.car
node bin/cardity.js review examples/02_member_points_agent.car
node bin/cardity.js diff examples/01_counter.car examples/01_counter.car
node bin/cardity.js conformance examples/02_member_points_agent.car --runtime-adapter examples/runtime_adapter_cardity_mock.json
```

## Adjacent Project Handoff

PMTSoul Agent OS consumes the Agent OS manifest and should treat Cardity as a
contract source, not an execution runtime. Key docs:

| Document | Purpose |
|---|---|
| `docs/pmtsoul_agent_integration.md` | PMTSoul integration boundary and MCP usage. |
| `docs/agent_action_contract_v1.md` | Generic action contract. |
| `docs/projection_contract_v1_1.md` | Read-model projection contract. |
| `docs/conformance.md` | Compatibility checks. |
| `docs/next_stage_roadmap.md` | Product/technical roadmap. |

When PMTSoul requests new manifest fields, keep them generic first, then use
merchant ERP only as a reference example.

## Troubleshooting

| Symptom | Check |
|---|---|
| MCP tool missing | Run `node bin/cardity_mcp_server.js` through a `tools/list` JSON-RPC smoke. |
| Hosted tool missing | Check `/mcp` after `wrangler deploy`. |
| Build missing native binary | Run `npm run build`. |
| Hosted compile differs from local | Check `src/cloudflare-worker.js` edge parser/compiler path and Docker/container fallback. |
| Wrangler uses wrong account | Run `wrangler whoami` and confirm Seven.psong@gmail.com's Account. |
| npm publish auth issue | Check `/Users/dogesong/.npm_cardity_deploy_90`, but never commit it. |
| Website metadata stale | Update `cardity_web` Open Graph metadata and redeploy Pages. |
