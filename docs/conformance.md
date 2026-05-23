# Cardity Contract Conformance

Cardity's stable baseline is:

- Agent OS manifest schema: `cardity.agent_manifest.v1`
- Agent action contract: `agent_action_contract_v1`
- Projection contract: `projection_contract_v1_1`
- Runtime adapter contract: `cardity.runtime_adapter_contract.v1`
- Conformance report: `cardity.conformance_report.v1`

The repository keeps conformance local and explicit. GitHub Actions are optional
for now; downstream runtimes can run the same scripts before consuming a new
Cardity release.

## Machine-Readable Schemas

| Contract | Schema |
|---|---|
| Agent OS manifest v1 | `schemas/agent_manifest_v1.schema.json` |
| Agent action contract v1 | `schemas/agent_action_contract_v1.schema.json` |
| Projection contract v1.1 | `schemas/projection_contract_v1_1.schema.json` |
| Diagnostics v1 | `schemas/diagnostics_v1.schema.json` |
| Runtime adapter contract v1 | `schemas/runtime_adapter_contract_v1.schema.json` |
| Security review v1 | `schemas/security_review_v1.schema.json` |
| Protocol diff v1 | `schemas/protocol_diff_v1.schema.json` |
| Conformance report v1 | `schemas/conformance_report_v1.schema.json` |
| Manifest visualization v1 | `schemas/manifest_visualization_v1.schema.json` |

## Reference Examples

| Example | Purpose |
|---|---|
| `examples/01_counter.car` | Minimal query/command manifest generation. |
| `examples/02_member_points_agent.car` | Table-first membership points manifest and projections. |
| `examples/03_merchant_erp_agent.car` | Downstream ERP reference protocol. |
| `examples/03_merchant_erp_projection_v1_1.json` | Full v1.1 read-model, projection, query, action, module, and external-service baseline. |
| `examples/runtime_adapter_cardity_mock.json` | Minimal runtime adapter declaration for conformance checks. |
| `examples/runtime_adapter_pmtsoul_agent_os.json` | PMTSoul Agent OS adapter declaration for the first Cardity-compatible runtime baseline. |

## Local Verification

```bash
npm run build
npm test
```

The smoke test verifies:

- compiler output for protocol JSON, ABI, CARC, and Agent OS manifest;
- hosted-agent compile envelope shape;
- local MCP tool listing and compile call;
- projection contract v1.1 event/runtime field references;
- generic agent-action contract fields;
- conformance report generation;
- manifest visualization generation;
- machine-readable schema files parse and contain required contract anchors.

Direct contract checks:

```bash
node scripts/verify_projection_contract.js examples/03_merchant_erp_projection_v1_1.json
node scripts/verify_agent_manifest_contract.js examples/03_merchant_erp_projection_v1_1.json
node scripts/verify_contract_schemas.js
node scripts/verify_next_stage_assets.js
node bin/cardity.js explain examples/01_counter.car --diagram
node bin/cardity.js visualize examples/02_member_points_agent.car
node bin/cardity.js review examples/02_member_points_agent.car
node bin/cardity.js diff examples/01_counter.car examples/01_counter.car
node bin/cardity.js conformance examples/02_member_points_agent.car
node bin/cardity.js conformance examples/02_member_points_agent.car --runtime-adapter examples/runtime_adapter_cardity_mock.json --json
node bin/cardity.js adapter examples/runtime_adapter_pmtsoul_agent_os.json
```

## Conformance Report

`cardity conformance` produces Markdown by default and JSON with `--json`.
The JSON report is intended for CI, hosted MCP tools, and downstream Agent
runtimes that need a compatibility gate before consuming generated workspaces.
Warnings do not fail the report; failed checks set `ok=false`.

`cardity adapter` validates a runtime adapter declaration independently of any
manifest. It checks supported contract versions, capability declarations,
conformance status, and production write policy.

## Runtime Boundary

Downstream Agent runtimes should treat these contracts as stable input. Cardity
does not write workspace files, bypass confirmation, or execute production
writes by itself. Runtimes own planning, policy, user confirmation, workspace
writes, readback execution, and replay storage.
