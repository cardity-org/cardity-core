# Cardity Production Write Contract v1

Production write contract v1 is the generic Cardity contract for actions that
may execute real writes in a downstream Agent runtime.

It is not a PMTSoul ERP DSL and it is not a runtime executor. Cardity only
describes the protocol contract; PMTSoul or another runtime decides whether and
how to execute it.

## Scope

This contract answers one question:

```text
Can this generated action be safely moved from dry-run to production write?
```

The answer is machine-readable. A runtime can check permission, confirmation,
readback, idempotency, audit, replay, compensation, task status, and role scope
before enabling a write button or tool call.

## Schema

```text
schemas/production_write_contract_v1.schema.json
https://api.cardity.org/schemas/production_write_contract_v1.schema.json
```

## Required Blocks

| Block | Purpose |
|---|---|
| `permission` | Stable permission id, scope, and runtime grant reference. |
| `confirm_policy` | When confirmation is required and when it expires. |
| `confirmation_ui` | States such as `draft`, `preparing`, `pending`, `approved`, `verified`, and `failed`. |
| `readback` | Query and expected fields for confirmed post-write state. |
| `idempotency` | Key, source id, and write index used to prevent duplicate writes. |
| `audit` | Event and fields emitted for traceability. |
| `replay_policy` | How replay behaves and which tuple deduplicates execution. |
| `compensation_policy` | Whether failed or reversed writes need manual or compensating action handling. |

Optional blocks:

| Block | Purpose |
|---|---|
| `long_running_task` | Status and result contract for exports, uploads, media generation, sync, or batch jobs. |
| `role_scope` | Runtime role, skill whitelist, tool permission, credential, visibility, and runnable rules. |

## Action Integration

Agent action contract v1 remains stable. A command action may reference this
contract through an optional `production_write_contract` field:

```json
{
  "name": "catalog_item_update",
  "kind": "command",
  "permission": "catalog.item.update",
  "confirm_required": true,
  "dry_run_supported": true,
  "readback_required": true,
  "production_write_contract": {
    "schema": "cardity.production_write_contract.v1"
  }
}
```

Commands without a production write contract should remain planned or dry-run
only unless the runtime has a separate explicit permission contract.

## Runtime Rules

| Rule | Detail |
|---|---|
| Permission first | `permission.id` must map to a runtime grant before commit. |
| Confirmation gates execution | Runtime UI should not allow commit outside `confirmation_ui.runnable_states`. |
| Readback confirms truth | A write is not verified until `readback.expected_fields` are observed. |
| Idempotency prevents duplicates | Use `idempotency.key`, `source_id`, and `write_index` before replay. |
| Audit is required | Every production write emits the declared audit event. |
| Compensation is explicit | Runtime must know whether rollback is none, manual, or a compensating action. |

## Example

See:

```text
examples/04_production_write_contract_v1.json
```
