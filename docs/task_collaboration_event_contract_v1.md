# Task Collaboration Event Contract v1

Task collaboration event contract v1 defines structured events for a task lead
and multiple collaborator lanes.

It is a contract layer. Cardity does not schedule employees, run tasks, send SSE,
persist events, store deliverables, send emails, or mark tasks completed. The
consuming runtime owns execution and storage.

## Core Model

```text
task_lead_employee_id
collaborator_employee_ids
lane_id
structured lane lifecycle events
barrier
task lead finalization
failure policy
frontend lane status rules
```

## Lane Lifecycle Events

- `account.task.employee.started`
- `account.task.employee.progress`
- `account.task.employee.handoff`
- `account.task.employee.completed`
- `account.task.employee.failed`
- `account.task.employee.cancelled`

Every lane event must carry structured identifiers such as `task_id`,
`employee_id`, `lane_id`, and `task_lead_employee_id`. Frontends should display
lane status from structured events, not by parsing natural-language progress.

## Barrier And Finalization

The reference example requires all collaborator lanes to complete before the
task lead consolidates results. Finalization declares the expected outputs:
consolidated result, deliverable or document, workspace summary, summary email,
and task completed event.

## Reference Example

```text
examples/16_task_collaboration_event_contract_v1.json
```

## Local Verification

```bash
node scripts/verify_task_collaboration_event_contract.js
```
