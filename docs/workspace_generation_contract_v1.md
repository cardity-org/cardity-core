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
| `tenant_scope` | Enterprise/account/workspace keys and metadata-only isolation policy. |
| `workspace` | Target runtime and artifact kinds to generate, such as API, database, UI, audit, recovery, deliverables, documents, media, and integrations. |
| `resource_mapping` | How Cardity actions/read models/projections/queries/checkpoints and optional deliverables/documents/media/integrations map into runtime workspace resources. |
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

For PMTSoul ERP/CRM, Cardity reference examples use `enterprise_id`,
`account_id`, and `workspace_id` as tenant metadata. Cardity only declares these
keys. PMTSoul must enforce that read models, CRM buyers, orders, tasks,
documents, media, campaigns, storefronts, and deliverables remain scoped by
`enterprise_id + account_id`, with enterprise-level aggregation handled by
PMTSoul policy.

The contract also has generic account-level conformance checks for
`enterprise_scope_present`, `account_scope_present`, `resources_tenant_scoped`,
`role_tool_permissions_bound`, `deliverables_tenant_scoped`,
`audit_tenant_scoped`, and `cross_account_leak_check`. These checks are
metadata for the runtime conformance gate; Cardity does not inspect PMTSoul D1
rows directly.

PMTSoul can use `examples/10_pmtsoul_account_conformance_fixture.json` as a
control-plane mapping fixture for `control_account_workspaces`,
`control_workspace_resources`, `control_employee_skill_bindings`, and
`control_account_conformance_runs`.

Cardity remains responsible for:

- generic contract schemas;
- manifest compatibility rules;
- schema registry;
- conformance checks;
- reference mapping examples.
