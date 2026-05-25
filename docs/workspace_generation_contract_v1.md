# Cardity Workspace Generation Contract v1

Workspace generation contract v1 describes how a Cardity manifest can become a
runtime-owned workspace for one account.

It is not a multi-tenant SaaS framework. Cardity declares tenant/account scope
metadata and mapping expectations. PMTSoul or another runtime owns actual tenant
isolation, database partitioning, auth, UI routing, execution, recovery, and
audit output.

## Positioning

```text
Cardity = system blueprint / contract layer
PMTSoul = workspace generator + runtime Agent OS
Account = isolated ERP/CRM instance
Agent / LLM = goal interpreter + action caller
```

## Schema

```text
schemas/workspace_generation_contract_v1.schema.json
https://api.cardity.org/schemas/workspace_generation_contract_v1.schema.json
```

## Required Blocks

| Block | Purpose |
|---|---|
| `tenant_scope` | Account/workspace keys and metadata-only isolation policy. |
| `workspace` | Target runtime and artifact kinds to generate. |
| `resource_mapping` | How Cardity actions/read models/projections/queries/checkpoints map into runtime workspace resources. |
| `role_tool_bindings` | Generic role-to-action/tool permission bindings. |
| `account_conformance` | Per-account checks and metadata fields a runtime should preserve. |

## PMTSoul Usage

For each PMTSoul account, PMTSoul can consume:

```text
Cardity protocol / manifest
  -> workspace_generation_contract_v1
  -> PMTSoul account-scoped ERP/CRM workspace
```

PMTSoul remains responsible for:

- tenant isolation;
- database partitioning;
- auth and role enforcement;
- UI rendering;
- workflow execution;
- data persistence;
- recovery and audit output.

Cardity remains responsible for:

- generic contract schemas;
- manifest compatibility rules;
- schema registry;
- conformance checks;
- reference mapping examples.

