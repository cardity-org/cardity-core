# Cardity External Release Plan

## Release Channels

| Channel | Artifact | Audience |
|---|---|---|
| GitHub Release | Source archive, binaries, changelog | Developers and agent framework maintainers |
| NPM | `cardity`, `cardity_agent`, `cardity_mcp_server`, `cardity_http_server` | Local agents and desktop MCP users |
| Docker / GHCR | `ghcr.io/cardity-org/cardity-core` | Hosted API and self-hosted agent runtimes |
| Public API | `https://api.cardity.org` | Any external agent |

## First Public Version

Ship as:

```text
Cardity Protocol Compiler for Agents
```

Scope:

- compile `.car` source text;
- validate protocols;
- generate ABI;
- generate `cardity.agent_manifest.v1`;
- expose local MCP and HTTP API.

Out of scope:

- deploy;
- signing;
- private-key handling;
- workspace writes;
- arbitrary file reads in hosted mode.

## Suggested Commands

NPM:

```bash
npm publish --access public
```

Docker:

```bash
docker build -t ghcr.io/cardity-org/cardity-core:0.1.0 .
docker push ghcr.io/cardity-org/cardity-core:0.1.0
```

Hosted service:

```bash
PORT=8787 node bin/cardity_http_server.js
```

## Verification Before Release

```bash
npm run build
npm test
node bin/cardity_agent.js compile examples/01_counter.car --include-manifest
npm run serve
```

Then call:

```bash
curl -s http://127.0.0.1:8787/health
curl -s http://127.0.0.1:8787/v1/manifest \
  -H 'content-type: application/json' \
  -d '{"source_text":"protocol Counter { version: \"1.0.0\"; owner: \"doge1\"; state { count: int = 0; } method get_count() { state.count = state.count; } returns: int state.count; }"}'
```
