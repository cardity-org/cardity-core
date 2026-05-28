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
| Production write contract v1 | `schemas/production_write_contract_v1.schema.json` |
| Checkpoint contract v1 | `schemas/checkpoint_contract_v1.schema.json` |
| Projection contract v1.1 | `schemas/projection_contract_v1_1.schema.json` |
| Company operating contract v1 | `schemas/company_operating_contract_v1.schema.json` |
| Diagnostics v1 | `schemas/diagnostics_v1.schema.json` |
| Runtime adapter contract v1 | `schemas/runtime_adapter_contract_v1.schema.json` |
| Security review v1 | `schemas/security_review_v1.schema.json` |
| Protocol diff v1 | `schemas/protocol_diff_v1.schema.json` |
| Conformance report v1 | `schemas/conformance_report_v1.schema.json` |
| Manifest visualization v1 | `schemas/manifest_visualization_v1.schema.json` |
| Explain result v1 | `schemas/explain_result_v1.schema.json` |
| Package v1 | `schemas/package_v1.schema.json` |
| Ecosystem registry v1 | `schemas/ecosystem_registry_v1.schema.json` |

Hosted registry:

```text
https://api.cardity.org/schemas
```

## Reference Examples

| Example | Purpose |
|---|---|
| `examples/01_counter.car` | Minimal query/command manifest generation. |
| `examples/02_member_points_agent.car` | Table-first membership points manifest and projections. |
| `examples/03_merchant_erp_agent.car` | Downstream ERP reference protocol. |
| `examples/03_merchant_erp_projection_v1_1.json` | Full v1.1 read-model, projection, query, action, module, and external-service baseline. |
| `examples/04_production_write_contract_v1.json` | Generic production write contract example for permissioned command execution. |
| `examples/05_checkpoint_contract_v1.json` | Generic long-horizon checkpoint contract example for state verification and recovery. |
| `examples/07_workspace_generation_contract_v1.json` | Account-scoped workspace generation contract with enterprise/account/workspace scope metadata. |
| `examples/10_pmtsoul_account_conformance_fixture.json` | PMTSoul control-plane fixture for account-level workspace conformance runs. |
| `examples/11_pmtsoul_agent_orchestration_runtime_fixture.json` | PMTSoul runtime fixture for mapping agent orchestration into digital employee control objects. |
| `examples/12_company_operating_contract_v1.json` | Generic company protocol for systems, digital employees, evaluation, capability-gap responsibility, and governance. |
| `examples/13_ai_company_bootstrap_contract_v1.json` | Generic account-level AI company bootstrap contract using canonical company operating fields only. |
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
node scripts/verify_workspace_generation_contract.js
node scripts/verify_account_conformance_fixture.js
node scripts/verify_agent_orchestration_contract.js
node scripts/verify_agent_orchestration_runtime_fixture.js
node scripts/verify_company_operating_contract.js
node bin/cardity.js explain examples/01_counter.car --diagram
node bin/cardity.js visualize examples/02_member_points_agent.car
node bin/cardity.js visualize examples/02_member_points_agent.car --html -o /tmp/cardity_visualizer.html
node bin/cardity.js review examples/02_member_points_agent.car
node bin/cardity.js diff examples/01_counter.car examples/01_counter.car
node bin/cardity.js conformance examples/02_member_points_agent.car
node bin/cardity.js conformance examples/02_member_points_agent.car --runtime-adapter examples/runtime_adapter_cardity_mock.json --json
node bin/cardity.js adapter examples/runtime_adapter_pmtsoul_agent_os.json
```

Company operating snapshots should use the canonical top-level blocks from
`cardity.company_operating_contract.v1`. The schema remains forward-compatible
with `additionalProperties: true`, but runtime conformance may be stricter and
reject top-level modules that are not part of the canonical company contract
shape, such as `hiring`, `memory`, or `knowledge_base`.

## Conformance Report

`cardity conformance` produces Markdown by default and JSON with `--json`.
The JSON report is intended for CI, hosted MCP tools, and downstream Agent
runtimes that need a compatibility gate before consuming generated workspaces.
Warnings do not fail the report; failed checks set `ok=false`.

`cardity adapter` validates a runtime adapter declaration independently of any
manifest. It checks supported contract versions, capability declarations,
conformance status, and production write policy.

Production-write checks are included in `cardity review` and
`cardity conformance`. If an action enables real write execution, Cardity
requires a valid `cardity.production_write_contract.v1` contract at either
`production_write_contract` or `agent_contract.production_write_contract`.

Checkpoint checks are also included. If an action declares `long_horizon: true`,
`checkpoint_required: true`, or `agent_contract.checkpoint_required: true`,
Cardity requires a valid `cardity.checkpoint_contract.v1` contract at either
`checkpoint_contract` or `agent_contract.checkpoint_contract`.

## Runtime Boundary

Downstream Agent runtimes should treat these contracts as stable input. Cardity
does not write workspace files, bypass confirmation, or execute production
writes by itself. Runtimes own planning, policy, user confirmation, workspace
writes, readback execution, and replay storage.
