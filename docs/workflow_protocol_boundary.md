# Workflow Protocol Boundary

Cardity may define workflow contracts, but it must not become a workflow
runtime.

This doctrine exists to keep Cardity aligned with agent-native workflow ideas
without copying code-oriented dynamic workflow runtimes into business execution.

## Boundary

```text
Cardity = Workflow Protocol / Contract
PMTSoul or another Agent OS = Workflow Compiler + Verifier + Runtime + Audit
LLM = Workflow Draft Generator
```

Cardity may define:

- what a legal workflow looks like;
- which capabilities a workflow may call;
- required tenant/account/workspace context;
- policy gates, human approval gates, and risk controls;
- checkpoint, readback, audit, replay, and failure-policy requirements;
- runtime boundary and conformance expectations.

Cardity must not define or execute:

- JavaScript, Python, shell, or arbitrary workflow scripts;
- runtime scheduling, queues, or locks;
- database access, email sending, ERP writes, or customer-data mutation;
- credential handling;
- real workflow state, cursor, or journal persistence;
- production execution or recovery.

## Future Contract Shape

If Cardity adds `cardity.workflow_protocol_contract.v1`, v1 should be a
declarative, bounded workflow protocol:

```json
{
  "schema": "cardity.workflow_protocol_contract.v1",
  "workflow": {
    "id": "market_research_to_outreach",
    "version": "1.0.0",
    "mode": "read | proposal | write",
    "risk_level": "low | medium | high",
    "scope_keys": ["enterprise_id", "account_id", "workspace_id", "workflow_id"]
  },
  "inputs_schema": {},
  "outputs_schema": {},
  "allowed_capabilities": [],
  "required_context": [],
  "steps": [],
  "graph": {
    "type": "dag",
    "nodes": [],
    "edges": [],
    "parallel_groups": [],
    "barriers": []
  },
  "state_schema": {},
  "artifact_schema": {},
  "policy_gates": {},
  "human_gates": {},
  "checkpoints": {},
  "readback": {},
  "audit": {},
  "replay": {
    "run_id_required": true,
    "idempotency_required": true,
    "resume_contract": {}
  },
  "failure_policy": {},
  "runtime_boundary": {
    "cardity_executes": false,
    "cardity_generates_code": false,
    "runtime_owner": "downstream_runtime",
    "llm_can_generate_draft": true,
    "llm_can_bypass_contract": false,
    "arbitrary_script_allowed": false
  }
}
```

## V1 Constraints

Workflow protocol v1 should support:

- declarative DAGs;
- parallel groups;
- barriers;
- structured handoffs;
- policy and human gates;
- checkpoints, readback, audit, replay, and failure policy.

Workflow protocol v1 should not support:

- arbitrary JavaScript or Python;
- shell execution;
- unbounded loops;
- runtime-generated capabilities outside `allowed_capabilities`;
- direct production writes without production-write contracts and readback.

Future versions may add bounded loops such as `bounded_loop`,
`until_checkpoint_passed`, and `max_iterations`, but only after downstream
runtimes prove safe execution and replay semantics.

## Step Categories

Data / analysis:

- `query`
- `skill_call`
- `summary`
- `deliverable`

Control flow:

- `parallel`
- `barrier`
- `handoff`
- `approval`
- `checkpoint`
- `finalize`

Write safety:

- `write_action`
- `readback`
- `compensation`
- `manual_review`

## Composition Layer

Workflow protocol should compose existing Cardity contracts rather than replace
them:

```text
workflow_protocol_contract.v1
  -> capability_runtime_tool_contract.v1
  -> production_write_contract.v1
  -> checkpoint_contract.v1
  -> workspace_conversation_scope_contract.v1
  -> task_collaboration_event_contract.v1
  -> guest_view_access_contract.v1
  -> projection / readback / audit
```

## Timing

Do not implement the workflow protocol schema until downstream runtimes have
consumed the current P0/P1 contracts and run release gates successfully.

The next step is downstream validation, not a new runtime inside Cardity.
