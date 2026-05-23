# Cardity Contract Conformance

Cardity's stable baseline is:

- Agent OS manifest schema: `cardity.agent_manifest.v1`
- Agent action contract: `agent_action_contract_v1`
- Projection contract: `projection_contract_v1_1`

The repository keeps conformance local and explicit. GitHub Actions are optional
for now; downstream runtimes can run the same scripts before consuming a new
Cardity release.

## Machine-Readable Schemas

| Contract | Schema |
|---|---|
| Agent OS manifest v1 | `schemas/agent_manifest_v1.schema.json` |
| Agent action contract v1 | `schemas/agent_action_contract_v1.schema.json` |
| Projection contract v1.1 | `schemas/projection_contract_v1_1.schema.json` |

## Reference Examples

| Example | Purpose |
|---|---|
| `examples/01_counter.car` | Minimal query/command manifest generation. |
| `examples/02_member_points_agent.car` | Table-first membership points manifest and projections. |
| `examples/03_merchant_erp_agent.car` | Downstream ERP reference protocol. |
| `examples/03_merchant_erp_projection_v1_1.json` | Full v1.1 read-model, projection, query, action, module, and external-service baseline. |

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
- machine-readable schema files parse and contain required contract anchors.

Direct contract checks:

```bash
node scripts/verify_projection_contract.js examples/03_merchant_erp_projection_v1_1.json
node scripts/verify_agent_manifest_contract.js examples/03_merchant_erp_projection_v1_1.json
node scripts/verify_contract_schemas.js
```

## Runtime Boundary

Downstream Agent runtimes should treat these contracts as stable input. Cardity
does not write workspace files, bypass confirmation, or execute production
writes by itself. Runtimes own planning, policy, user confirmation, workspace
writes, readback execution, and replay storage.
