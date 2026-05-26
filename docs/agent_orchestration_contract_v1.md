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
roles -> control_employees
authority -> control_employee_authority / employee scope_authority
tool permissions -> control_employee_skill_bindings + runtime whitelist
handoffs -> control_agent_handoff_graph
verification -> checkpoint, readback, conformance, and approval gates
coordination.shared_state_lock -> account/workspace scoped lock table
failure_policy -> recovery employee and retry/rollback policy
audit trail -> control_audit_events + workspace console SSE
```

The reference PMTSoul runtime fixture is:

```text
examples/11_pmtsoul_agent_orchestration_runtime_fixture.json
```

It keeps the boundary explicit: Cardity defines roles, authority, handoffs,
verification, coordination, and failure policy; PMTSoul owns employee records,
runtime sets, skill whitelists, scheduling, memory, locks, durable confirmation,
audit, SSE, and recovery execution.

## Local Verification

```bash
node scripts/verify_agent_orchestration_contract.js
node scripts/verify_agent_orchestration_runtime_fixture.js
```
