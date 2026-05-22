# Cardity Agent Action Contract v1

Agent action contract v1 is the generic manifest boundary for downstream Agent
runtimes. It is not a merchant ERP DSL. Merchant ERP is a reference
implementation that proves the contract can drive a real workspace.

Cardity emits actions in the Agent OS manifest. Agent runtimes consume those
actions to plan, ask for confirmation, run dry-runs, execute permissioned
commands, fetch readback state, and replay safely.

## Manifest Shape

```json
{
  "schema": "cardity.agent_manifest.v1",
  "system": {
    "modules": [],
    "ui": {
      "actions": []
    },
    "external": {
      "navigation": [],
      "services": []
    }
  }
}
```

## Action Semantics

Each `system.ui.actions[]` entry must expose planner-facing intent metadata and
runtime-facing execution safety metadata.

| Field | Required | Detail |
|---|---:|---|
| `kind` | yes | One of `query`, `command`, or `external_navigation`. |
| `intent_names` | yes | Stable names and aliases a planner can match against user intent. |
| `intent_examples` | yes | Natural-language examples for planner grounding. |
| `disambiguation_keys` | yes | Input fields used to identify the target object. |
| `required_context` | yes | Runtime context required before execution, such as `ctx.sender`, `ctx.merchant_id`, or `ctx.workspace_id`. |
| `input_schema` | yes | JSON schema for accepted action input. |
| `output_schema` | conditional | JSON schema for direct action output. Required when `returns_read_model` is absent. |
| `returns_read_model` | conditional | Read model returned by the action. Required when `output_schema` is absent. |
| `permission` | yes | Permission contract identifier. Use `null` when no concrete write permission exists. |
| `confirm_required` | yes | Whether the runtime must ask the user before execution. |
| `dry_run_supported` | yes | Whether the runtime can plan or preview without committing writes. |
| `readback_required` | yes | Whether a committed command must provide a confirmed readback payload. |
| `readback_query` | yes | Query contract or post-commit route used to fetch readback state. Use `null` when not applicable. |
| `idempotency_key` | yes | Expression used to deduplicate command execution, usually `$run.id`. Use `null` for pure queries. |
| `risk_level` | yes | Planner-facing risk hint, usually `low`, `medium`, or `high`. |
| `side_effects` | yes | Declared reads, writes, emitted events, or external effects. |
| `audit_event` | yes | Event name a runtime can use for audit trails. Use `null` when not applicable. |
| `replay_policy` | yes | Replay behavior for idempotent execution. |

## Query Actions

Query actions read state and should not require confirmation.

```json
{
  "name": "member_points_system_get_balance",
  "kind": "query",
  "intent_names": ["get_balance", "MemberPointsSystem.get_balance"],
  "intent_examples": ["Invoke MemberPointsSystem.get_balance"],
  "disambiguation_keys": ["user"],
  "required_context": [],
  "input_schema": {
    "type": "object",
    "properties": {
      "user": { "type": "address" }
    },
    "required": ["user"]
  },
  "output_schema": { "type": "int" },
  "returns_read_model": null,
  "permission": null,
  "confirm_required": false,
  "dry_run_supported": true,
  "readback_required": false,
  "readback_query": null,
  "idempotency_key": null,
  "risk_level": "low",
  "side_effects": { "reads": ["state"], "writes": [], "emits": [], "external": [] },
  "audit_event": null,
  "replay_policy": { "mode": "read_only" }
}
```

## Command Actions

Command actions may write state, emit events, or call an external system. They
must remain planned/dry-run unless a concrete permission contract grants
execution.

```json
{
  "name": "member_points_system_earn_points",
  "kind": "command",
  "intent_names": ["earn_points", "MemberPointsSystem.earn_points"],
  "intent_examples": ["Invoke MemberPointsSystem.earn_points"],
  "disambiguation_keys": ["user", "amount", "reason"],
  "required_context": ["ctx.sender"],
  "input_schema": {
    "type": "object",
    "properties": {
      "user": { "type": "address" },
      "amount": { "type": "int" },
      "reason": { "type": "string" }
    },
    "required": ["user", "amount", "reason"]
  },
  "output_schema": { "type": "string" },
  "returns_read_model": null,
  "permission": "earn_points",
  "confirm_required": true,
  "dry_run_supported": true,
  "readback_required": true,
  "readback_query": {
    "strategy": "post_commit",
    "route": "/protocols/MemberPointsSystem/methods/earn_points"
  },
  "idempotency_key": "$run.id",
  "risk_level": "medium",
  "side_effects": {
    "reads": [],
    "writes": ["state"],
    "emits": ["PointsEarned"],
    "external": []
  },
  "audit_event": "PointsEarned",
  "replay_policy": {
    "mode": "idempotent_command",
    "idempotency_key": "$run.id",
    "on_replay": "return_prior_result"
  }
}
```

## External Navigation And Services

External entries belong in `system.external.navigation[]` or
`system.external.services[]` unless Cardity emits a permissioned action contract
for execution.

Static navigation entries are for links such as DK verification, app update
checks, or contact-us pages. External services are for integrations a runtime
may show or route to, but should not execute as writes without an explicit
permission contract.

```json
{
  "system": {
    "external": {
      "navigation": [
        {
          "name": "contact_us",
          "kind": "external_navigation",
          "intent_names": ["contact_us"],
          "url": "https://example.com/contact",
          "ownership": "external"
        }
      ],
      "services": []
    }
  }
}
```

## Planner Hints

Modules may expose intent names at `system.modules[].intent_names`. Runtimes
should use module hints to choose a workspace area, then use action-level
`intent_names`, `intent_examples`, `disambiguation_keys`, and
`required_context` to select and validate an action.

## Safety Rules

Runtimes consuming this contract should apply these rules:

| Rule | Detail |
|---|---|
| No implicit writes | A command with `permission: null` is planned/dry-run only. |
| Confirmation is binding | `confirm_required: true` means a runtime must ask before execution. |
| Readback before projection | If `readback_required: true`, confirmed readback must be available before applying readback projections. |
| Idempotency before replay | Use `idempotency_key` and `replay_policy` to avoid duplicate command execution. |
| External stays external | Navigation/service entries do not imply write permission. |

## Stable Baseline

Cardity treats agent action contract v1 plus projection contract v1.1 as the
first stable Cardity <-> downstream Agent OS baseline.

PMTSoul Agent OS has validated this baseline with a merchant ERP reference
workspace. The validation covers action semantics, planner hints, input/output
schemas, permission and confirmation flags, dry-run/readback metadata,
idempotency, risk/audit/replay metadata, module intents, and external
navigation/services.
