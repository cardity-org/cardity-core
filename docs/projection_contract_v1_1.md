# Cardity Projection Contract v1.1

Projection contract v1.1 is the first stable Cardity <-> downstream Agent OS
baseline for replay-safe read-model writes. Merchant ERP is a reference
implementation, not a Cardity-specific DSL.

Cardity emits an Agent OS manifest. Agent runtimes consume the manifest to
generate API routes, tables, read models, UI actions, workflows, permissions,
and replay-safe projection writes.

## Manifest Shape

```json
{
  "schema": "cardity.agent_manifest.v1",
  "system": {
    "database": {
      "tables": [],
      "read_models": [],
      "projections": [],
      "queries": []
    }
  }
}
```

## Tables And Read Models

Tables describe storage. Read models describe current-state views that agents
can use for generated ERP screens and query tools.

```json
{
  "name": "merchant_products",
  "columns": [
    { "name": "merchant_id", "type": "string", "nullable": false },
    { "name": "goods_id", "type": "string", "nullable": false },
    { "name": "name", "type": "string" },
    { "name": "price", "type": "int", "default": "0" },
    { "name": "status", "type": "string", "default": "active" }
  ],
  "primary_key": ["merchant_id", "goods_id"],
  "indexes": [
    { "name": "merchant_products_status_idx", "columns": ["merchant_id", "status"] }
  ]
}
```

Required metadata:

| Field | Purpose |
|---|---|
| `columns` | Name, type, nullable, and default metadata. |
| `primary_key` | Single or composite table identity. |
| `indexes` | Query/index hints for generated stores and views. |
| `query_contracts` | Optional list/detail contracts exposed by the model. |

## Projection Operations

Projection writes run only after a state-changing action has passed policy
confirmation and committed.

| Operation | Semantics |
|---|---|
| `insert` | Insert a new row from `values`. |
| `upsert_delta` | Find by `key`, insert if missing, otherwise add numeric deltas. |
| `upsert_snapshot` | Find by `key`, insert if missing, otherwise replace snapshot fields. |
| `delete` | Delete rows matching `key`. |
| `soft_delete` | Update matching rows with archive/delete marker fields. |

## Expression Sources

Projection expressions can reference event payloads, confirmed readbacks, runtime
context, and run metadata.

| Expression | Meaning |
|---|---|
| `$event.<field>` | Field from the emitted Cardity event. |
| `-$event.<field>` | Negative numeric event field. |
| `$event.id` | Runtime-provided stable event source id. Must appear in `events[].runtime_fields` or `events[].params`. |
| `$event.write_index` | Runtime-provided deterministic write index. Must appear in `events[].runtime_fields` or `events[].params`. |
| `$event.source_run_id` | Runtime-provided run id for the event source. |
| `$readback.<field>` | Field from the confirmed post-write readback payload. |
| `-$readback.<field>` | Negative numeric readback field. |
| `$source.<field>` | Field from the projection source, usually event or readback. |
| `$ctx.sender` | Runtime actor/user. |
| `$ctx.merchant_id` | Merchant scope. |
| `$ctx.workspace_id` | Agent OS workspace scope. |
| `$run.id` | Stable run/idempotency key. |

`source_path` is an optional projection field for fan-out snapshots from a
confirmed readback array, for example `"$readback.rankings"` or
`"$readback.complaints"`. When present, `$source.<field>` resolves against each
item in that array while idempotency still uses the parent event source id and
write index.

## Event Payload Schema

Every event in an Agent OS manifest must make idempotency source fields
explicit. Business event arguments are listed in `events[].params`. Runtime
event metadata is listed in `events[].runtime_fields` and is part of the event
payload visible to projection consumers.

```json
{
  "name": "ProductSaved",
  "params": [
    { "name": "merchant_id", "type": "string" },
    { "name": "goods_id", "type": "string" }
  ],
  "runtime_fields": [
    { "name": "id", "type": "string", "required": true, "source": "runtime" },
    { "name": "write_index", "type": "int", "required": true, "source": "runtime" },
    { "name": "source_run_id", "type": "string", "required": true, "source": "runtime" },
    { "name": "idempotency_key", "type": "string", "required": true, "source": "runtime" }
  ]
}
```

If a projection uses `$event.id`, `$event.write_index`, or any other
`$event.*` idempotency expression, that field must be declared in either
`events[].runtime_fields` or `events[].params`. If a runtime cannot provide the
named payload fields, it may fall back to its internal `event_id` /
`idempotency_key`, but that should be treated as a degraded replay guard rather
than a fully Cardity-specified source id.

Cardity compilers validate this rule for generated manifests: every `$event.*`
reference in a projection must resolve against the trigger event's declared
`params` or `runtime_fields`. `confirmed_readback` projections should use
`idempotency.source_id = "$event.id"` and replay-safe projections should use
`idempotency.write_index = "$event.write_index"`.

## Confirmed Readback Projection

Use `source: "confirmed_readback"` when the current-state row must come from the
post-write readback result rather than the original event payload.

```json
{
  "name": "product_saved_snapshot",
  "version": "1.1",
  "source": "confirmed_readback",
  "source_id": "$event.id",
  "idempotency": {
    "source_id": "$event.id",
    "source_run_id": "$event.source_run_id",
    "projection_version": "$projection.version",
    "write_index": "$event.write_index"
  },
  "on": { "event": "ProductSaved" },
  "writes": [
    {
      "table": "merchant_products",
      "operation": "upsert_snapshot",
      "key": ["merchant_id", "goods_id"],
      "values": {
        "workspace_id": "$ctx.workspace_id",
        "name": "$readback.name",
        "price": "$readback.price",
        "status": "$readback.status",
        "source_run_id": "$run.id"
      }
    }
  ]
}
```

## Idempotency And Replay

Projection consumers must treat these fields as replay guards:

| Field | Purpose |
|---|---|
| `source_id` | Stable event/readback/run source identity. |
| `name` | Projection identity. |
| `version` | Projection logic version. |
| write index | Position of the write in `writes`. |

The tuple `(source_id, projection.name, projection.version, write_index)` should
be applied at most once. Replaying a run must not duplicate ledger rows or
corrupt read-model snapshots.

## Query Contracts

Query contracts describe generated list/detail views for agents.

```json
{
  "name": "merchant_products.list",
  "read_model": "merchant_products",
  "operation": "list",
  "filters": ["merchant_id", "status"]
}
```

PMTSoul Agent OS validated v1.1 with a complete merchant ERP reference covering
product, inventory, order, store dashboard, store profile, ranking, and
complaint read models, confirmed readback projections, composite scoped keys,
replay-safe idempotency metadata, and list/detail query contracts.
