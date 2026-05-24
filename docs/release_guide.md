# Cardity Release Guide

This guide describes the current release flow for Cardity Core. It is scoped to
the protocol contract layer: compiler, CLI, API, MCP, schemas, examples,
conformance, npm package, and website handoff. It does not describe a full Agent
Runtime, low-code platform, production write executor, or separate package
registry.

Use [docs/system_architecture_ops_map.md](system_architecture_ops_map.md) for
the current deployment map, Cloudflare targets, npm token location, adjacent
projects, and public URLs.

## Release Targets

| Target | Current path |
|---|---|
| Source | `cardity-org/cardity-core`, branch `master` |
| npm package | `cardity`, alpha tag |
| Hosted API | `https://api.cardity.org` |
| Hosted MCP | `https://api.cardity.org/mcp` |
| Schema registry | `https://api.cardity.org/schemas` |
| Runtime registry | `https://api.cardity.org/runtimes` |
| Ecosystem registry | `https://api.cardity.org/registry` |
| Website | `https://cardity.org` from `cardity_web` |

## Product Boundary

Release work must preserve Cardity's boundary:

- Cardity compiles `.car` protocols into protocol JSON, ABI, CARC, and Agent OS
  manifests.
- Cardity exposes machine-readable contracts for actions, projections, runtime
  adapters, schemas, conformance, security review, diff, and visualization.
- Cardity may provide CLI, API, MCP, WASM, templates, prompts, examples, and
  docs to help downstream agents consume these contracts.
- Downstream runtimes, such as PMTSoul Agent OS, own workspace generation,
  permission gates, dry-run/write execution, readback, replay storage, and audit
  sinks.

Do not release features that turn Cardity into a full runtime, project
generator, low-code platform, enterprise SaaS, or production write executor.

## Pre-Release Checklist

Run these checks before publishing npm, deploying the hosted API, or announcing a
release:

```bash
npm run build
npm test
npm run check:package
npm run check:imports
node scripts/verify_contract_schemas.js
node scripts/verify_next_stage_assets.js
npm_config_cache=/tmp/cardity-npm-cache npm pack --dry-run
```

Expected evidence:

- `npm test` ends with `Smoke test passed`.
- `npm run check:package` reports executable bin and package file counts.
- `npm run check:imports` reports import/using semantic check passed.
- schema verification reports all registered contract schemas verified.
- next-stage assets verification reports templates, prompts, and schemas.
- `npm pack --dry-run` includes `bin/`, `compiler/`, `schemas/`, `registry/`,
  `templates/`, `examples/`, `docs/`, `README.md`, and `LICENSE`.

## Compatibility Review

Before publishing, check whether the release changes any compatibility surface.

| Surface | Backward compatibility rule |
|---|---|
| CLI | Existing commands and flags should keep working. |
| API | Existing endpoints and response schemas should keep working. |
| MCP | Existing tool names and input/output shapes should keep working. |
| Schema registry | Existing schema names, files, and public URLs should remain stable. |
| Agent manifest | Existing fields should not be removed or renamed. |
| Action contract | Existing action semantics and safety fields should remain readable. |
| Projection contract | Existing projection v1.1 fields and idempotency semantics should remain readable. |
| Runtime adapter | Existing adapter declarations should continue to validate. |

If a breaking change is unavoidable, stop before release and document:

- why the breaking change is required;
- affected files, schemas, endpoints, tools, and examples;
- migration path;
- user decision needed before continuing.

## npm Alpha Release

The current npm package is source-based and builds native binaries during
install/build. It is intended for alpha distribution of the CLI, MCP server,
schemas, templates, examples, and docs.

1. Verify the package:

```bash
npm run build
npm test
npm run check:package
npm_config_cache=/tmp/cardity-npm-cache npm pack --dry-run
```

2. Confirm package metadata:

```bash
node -p "require('./package.json').version"
node -p "Object.keys(require('./package.json').bin).sort().join('\n')"
```

3. Publish alpha:

```bash
npm publish --tag alpha
```

4. Verify from a clean install environment when practical:

```bash
npm view cardity dist-tags version
npm install -g cardity@alpha
cardity --help
cardity_agent --help
cardity_mcp_server --help
```

Do not commit npm tokens or local credential files. The current local token file
is documented in the ops map and must stay outside the repo.

## Hosted API And MCP Deployment

The hosted API/MCP runs as Cloudflare Worker `cardity-core-api-proxy` backed by
the current container/native compiler setup.

Deploy:

```bash
npm run build
wrangler deploy
```

Verify:

```bash
curl -sS https://api.cardity.org/edge-health
curl -sS https://api.cardity.org/v1/generation-guide \
  -H 'content-type: application/json' \
  -d '{"requirement":"member points"}'
curl -sS https://api.cardity.org/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

For endpoint-level verification, use [docs/public_api.md](public_api.md) as the
source of truth for the public API surface.

## Schema And Registry Release

Schemas and registry entries are part of the release contract. They must remain
stable and machine-readable.

Verify locally:

```bash
node scripts/verify_contract_schemas.js
node bin/cardity.js schemas
node bin/cardity.js schemas projection_contract_v1_1
node bin/cardity.js runtimes pmtsoul-agent-os
node bin/cardity.js registry templates member_points
```

Verify hosted URLs after API deployment:

```bash
curl -sS https://api.cardity.org/schemas
curl -sS https://api.cardity.org/schemas/projection_contract_v1_1.schema.json
curl -sS https://api.cardity.org/runtimes/pmtsoul-agent-os
curl -sS https://api.cardity.org/registry/templates/member_points
```

If adding a schema:

1. Add `schemas/<name>.schema.json`.
2. Register it in `schemas/registry.json`.
3. Add or update verification in `scripts/verify_contract_schemas.js` or
   `scripts/verify_next_stage_assets.js`.
4. Add public API/docs references only after the schema is stable.

## Examples And Templates

Examples and templates are release fixtures. They should compile and represent
current Cardity capabilities without becoming business-specific runtime logic.

Core fixtures:

| Fixture | Purpose |
|---|---|
| `examples/01_counter.car` | Minimal compiler and manifest sanity check. |
| `examples/02_member_points_agent.car` | Agent action, table, permission, event, and conformance baseline. |
| `examples/03_merchant_erp_projection_v1_1.json` | Projection v1.1 and PMTSoul contract reference. |
| `examples/runtime_adapter_pmtsoul_agent_os.json` | Runtime adapter compatibility example. |
| `templates/member_points` | Default `cardity init` template. |

Verify:

```bash
npm test
node scripts/verify_projection_contract.js \
  /tmp/cardity_member_points.agent.json \
  /tmp/cardity_member_points_agent_result.json \
  examples/03_merchant_erp_projection_v1_1.json
node scripts/verify_next_stage_assets.js
```

The smoke test already generates the `/tmp` artifacts used by the projection
verification command above.

## Website Sync

The website is not the core product. It should only expose concise explanation,
quickstart, core capability links, and a small number of examples.

Update `cardity_web` only when a release changes public positioning, install
commands, public API/MCP URLs, schema links, examples, or docs entry points.

Recommended website checks:

```bash
cd /Users/dogesong/Documents/workspace/cardity_web
npm run build
wrangler pages deploy out --project-name=cardity-org-web --branch=main
curl -sSI https://cardity.org/
curl -sSI https://cardity.org/visualizer/?lang=en
```

Do not expand the website into a runtime dashboard or generated-system product.

## GitHub Release Notes

Release notes should emphasize contract-layer changes:

- compiler or CLI changes;
- API/MCP changes;
- schema additions or compatibility updates;
- manifest/action/projection/runtime adapter changes;
- conformance or security review changes;
- npm package and install changes;
- migration notes and known risks.

Suggested structure:

```markdown
# Cardity vX.Y.Z

## Highlights
- ...

## Compatibility
- CLI:
- API:
- MCP:
- Schema:
- Manifest:
- Action contract:
- Projection contract:

## Validation
- `npm test`
- `npm run check:package`
- `npm_config_cache=/tmp/cardity-npm-cache npm pack --dry-run`

## Known Risks
- ...
```

## Rollback

For npm:

```bash
npm dist-tag add cardity@<previous-version> alpha
npm view cardity dist-tags version
```

For Cloudflare API/MCP:

```bash
wrangler deployments list
wrangler rollback
curl -sS https://api.cardity.org/edge-health
```

For website:

- use Cloudflare Pages deployment history for `cardity-org-web`;
- rollback to the previous successful deployment;
- verify `https://cardity.org` and key routes.

## Legacy Notes

Older docs and scripts may still mention Cardinals-only distribution,
cross-platform binary archives, custom package registries, IDE plugins, or
large ecosystem roadmaps. Those are not current release blockers unless they are
converted into verified Cardity protocol-contract-layer deliverables.

The current release path is:

```text
cardity-core source
  -> build/test/schema/conformance/package verification
  -> npm alpha package
  -> Cloudflare API/MCP deployment
  -> schema/runtime/ecosystem registry verification
  -> concise website sync when public entry points changed
```
