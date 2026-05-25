# Cardity Agent Orchestration Contract v1

Agent orchestration contract v1 describes how multiple agents should cooperate
inside a runtime-owned workspace.

Cardity does not schedule agents, run queues, store state, or execute tools.
Cardity only defines the orchestration contract. PMTSoul or another Agent OS
owns runtime scheduling, state storage, permission enforcement, recovery, and
audit output.

## Why

More agents can increase error rates when role boundaries, permissions,
handoffs, checkpoints, and shared-state locks are implicit. This contract makes
those boundaries explicit before runtime execution.

## Required Blocks

| Block | Purpose |
|---|---|
| `roles` | Planner, operator, reviewer, auditor, and recovery agent responsibilities. |
| `authority` | Allowed actions, forbidden actions, and approval ability per role. |
| `handoffs` | Structured artifacts, readback, checkpoint refs, and acceptance criteria required between agents. |
| `verification` | Review, human approval, checkpoint, readback, permission, confirmation, and audit requirements. |
| `coordination` | Sequential/parallel mode, max agents, shared state locks, and conflict policy. |
| `failure_policy` | What happens on disagreement, checkpoint failure, or missing context. |

## Safety Rules

| Rule | Contract expectation |
|---|---|
| Planner cannot write | Planner roles must forbid `production_write`. |
| Operator cannot self-approve | Operator roles must set `can_approve=false` and forbid self approval. |
| Handoff is structured | Handoffs must carry `required_artifacts`; natural-language summaries are not enough. |
| Parallel needs locks | Parallel or hybrid coordination must declare `shared_state_lock`. |
| High risk needs review | High-risk actions must require reviewer or human approval plus checkpoint/readback. |
| Recovery stays bounded | Recovery agents must not bypass permission to execute new unapproved writes. |

## PMTSoul Usage

PMTSoul can map this contract into each generated account workspace:

```text
roles -> agent roles
authority -> tool/action permissions
handoffs -> handoff graph
verification -> checkpoint/readback graph
coordination -> runtime scheduling policy
failure_policy -> retry, recovery, and human escalation
```

## Local Verification

```bash
node scripts/verify_agent_orchestration_contract.js
```

