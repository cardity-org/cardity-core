# Cardity Checkpoint Contract v1

Checkpoint contract v1 is Cardity's generic contract for long-horizon Agent
workflows. It lets a runtime verify state after important steps instead of
trusting that a UI click or tool call succeeded.

This is a protocol contract, not a GUI automation framework. Cardity describes
what must be checked; the runtime executes the query, records the ledger entry,
and chooses recovery behavior.

## Why

SaaS-Bench-style workflows fail because agents lose state across long,
cross-app tasks, skip post-action verification, and cannot recover cleanly after
early mistakes. Checkpoint contract v1 gives generated systems an explicit
state-verification surface:

```text
action or workflow step
  -> checkpoint verify query
  -> expected state comparison
  -> ledger event
  -> retry, stop, manual review, or compensation
```

## Schema

```text
schemas/checkpoint_contract_v1.schema.json
https://api.cardity.org/schemas/checkpoint_contract_v1.schema.json
```

## Required Blocks

| Block | Purpose |
|---|---|
| `scope` | Whether checkpoints apply to an action, workflow, module, or system. |
| `checkpoints` | Ordered verification points with query, expected fields, expected state, and failure behavior. |
| `ledger` | Event and fields a runtime appends for replay and explainability. |
| `recovery_policy` | Default recovery behavior when a checkpoint cannot pass. |

## Action Integration

Agent action contract v1 remains stable. Actions may attach a checkpoint
contract at either `checkpoint_contract` or
`agent_contract.checkpoint_contract`.

```json
{
  "name": "catalog_item_update",
  "kind": "command",
  "execution_mode": "production_write",
  "checkpoint_contract": {
    "schema": "cardity.checkpoint_contract.v1"
  }
}
```

If an action sets `long_horizon: true`, `checkpoint_required: true`, or
`agent_contract.checkpoint_required: true`, Cardity expects a valid checkpoint
contract.

## Verification

```bash
cardity review manifest.json
cardity conformance manifest.json
node scripts/verify_checkpoint_contract.js
```

