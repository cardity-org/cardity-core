# Cardity Bench Demo

This demo is a small, contract-first answer to SaaS-Bench-style failures.

It does not claim Cardity is an Agent Runtime. It shows how a runtime can use
Cardity contracts before execution so long-horizon work is verifiable,
recoverable, replayable, and auditable.

## Positioning

SaaS-Bench shows that GUI-only Computer-Use Agents are unreliable for real
cross-app enterprise workflows. The failure mode is not that agents are useless;
it is that agents cannot safely depend on long human-UI traces without explicit
state contracts.

Cardity's role:

```text
Cardity = Agent-native contract layer
Runtime = execution, confirmation, readback, recovery, and audit layer
SaaS / enterprise system = real data and write APIs
Agent / LLM = intent understanding, planning, and explanation
```

## Demo Goal

Compare the same workflow in two paths:

| Path | Description |
|---|---|
| GUI-only agent | Agent clicks through a human UI and self-reports success. |
| Cardity contract path | Runtime consumes action, production write, checkpoint, projection, and replay contracts. |

Workflow:

```text
Update catalog item
  -> confirm permissioned write
  -> read back committed item state
  -> verify checkpoint
  -> apply downstream projection
  -> record checkpoint ledger
  -> stop or recover if state diverges
```

For PMTSoul, the same demo should be interpreted as a per-account ERP/CRM
runtime path, not GUI automation. Every generated workspace is account-isolated,
and account-scoped data must carry `enterprise_id + account_id`. Enterprise
views may aggregate only through PMTSoul-owned policy checks.

## Evidence Assets

| Asset | Purpose |
|---|---|
| `examples/06_cardity_bench_demo.json` | Machine-readable demo plan and acceptance criteria. |
| `examples/04_production_write_contract_v1.json` | Permission, confirmation, readback, idempotency, audit, replay, and compensation. |
| `examples/05_checkpoint_contract_v1.json` | Step verification, expected state, checkpoint ledger, and recovery policy. |
| `examples/07_workspace_generation_contract_v1.json` | Enterprise/account/workspace scope metadata for generated ERP/CRM workspaces. |
| `scripts/verify_cardity_bench_demo.js` | Local verification that the demo remains contract-layer only. |

## Metrics

| Metric | GUI-only path | Cardity contract path |
|---|---|---|
| Step count | Browser/UI actions. | Contract actions and readbacks. |
| Success | Final state or external verifier. | All declared checkpoints pass. |
| Verification | Often implicit or manual. | `readback` and `checkpoint_contract`. |
| Recovery | Ad hoc. | `recovery_policy` and `compensation_policy`. |
| Replay | Not guaranteed. | Idempotency and replay policy. |
| Audit | Trace review. | Ledger and audit events. |
| Tenant safety | Hard to prove from UI traces. | `enterprise_id + account_id` scope on actions/read models. |

## PMTSoul Reference Actions

| Demo action | Contract path |
|---|---|
| Create or update SKU | `production_write` + confirmed readback. |
| Generate market research report | `checkpoint` + deliverable. |
| Publish storefront | `checkpoint` + readback. |
| Generate poster/media | `checkpoint` + media deliverable. |
| Classify CRM buyer | Projection + read model. |
| Draft or send email | `production_write` + policy confirmation. |

The demo report should include GUI-only step count, Cardity contract step
count, checkpoint pass/fail, readback verification, audit event count,
deliverables, replay/resume support, and whether any cross-account data leak was
detected.

## Non-Goals

- Cardity does not drive browsers.
- Cardity does not execute production writes.
- Cardity does not replace PMTSoul or another Agent OS runtime.
- Cardity does not benchmark model quality directly.

## Local Verification

```bash
node scripts/verify_cardity_bench_demo.js
```
