# Cardity Agent Protocol Layer

## Direction

Cardity can evolve from a blockchain protocol DSL into an agent protocol layer:
users describe an intent in one sentence, an LLM turns it into a typed Cardity
protocol, and tooling generates the runnable system around that protocol.

Example:

> Build a prepaid membership system where users buy credits, spend credits, and
> admins can freeze suspicious accounts.

Expected output:

- Cardity protocol: state, methods, events, permissions, and invariants.
- ABI contract: method input/output types and emitted events.
- Runtime adapter: local execution, persistence, and invoke envelopes.
- Frontend/API scaffold: forms, admin views, event log, and generated SDK.
- Deployment artifact: `.carc`, deploy envelope, invoke encoder, and indexer schema.

## Core Idea

The protocol should become the source of truth for both agents and software:

```text
natural language intent
  -> protocol draft
  -> typed Cardity IR
  -> compiler validation
  -> generated app/system
  -> deploy/invoke/runtime artifacts
```

The LLM should not generate arbitrary application code first. It should generate
or refine a protocol first, then deterministic tools generate the surrounding
system from that protocol.

## Layering

The protocol layer is not the same thing as an MCP server or CLI wrapper.
Cardity should keep the protocol engine independent, then expose it through
adapters:

```text
Protocol Core
  -> compiler / validator / ABI / agent manifest
  -> adapters: CLI, MCP, HTTP, SDK, built-in agent tools
```

For PMTSoul Agent OS, the stable boundary is the generated Agent OS manifest.
PMTSoul can call Cardity through MCP, CLI, HTTP, or a built-in tool, but all of
those adapters should consume the same manifest contract.

## Protocol Contract

The minimal contract an agent needs:

| Section | Purpose | Example |
|---|---|---|
| `state` | Persistent scalar model | `balance: int = 0` |
| `table` | Agent OS database/resource schema | `table balances { user: address; balance: int = 0; }` |
| `method` | Allowed actions | `transfer(to: address, amount: int)` |
| `returns` | User/API-visible result | `returns: string state._result` |
| `event` | Observable state changes | `Transfer(from, to, amount)` |
| `ctx` | Runtime identity/input context | `ctx.sender`, `ctx.txid` |
| `import/using` | Module composition | `using Ledger as L` |

This is enough for an agent to reason about:

- which UI forms to create;
- which API endpoints are needed;
- what validation and permission checks must exist;
- how to display history and audit logs;
- how to encode deploy/invoke payloads.

## Agent-Safe Generation Rules

Current Cardity agent generation uses a strict subset so LLM output can compile
and hand off cleanly to Agent OS:

- Keep `state` scalar and explicit: `int`, `string`, `bool`, `address`.
- Do not use `state.foo[key]` or undeclared state fields.
- Put keyed business collections into top-level `table` blocks.
- Use methods for callable intent, params, return values, events, and scalar
  summary/audit state.
- Let Agent OS implement table persistence and generated CRUD/query behavior
  from the manifest database schema.

Example:

```cardity
table member_point_balances {
  user: address;
  balance: int = 0;
}
```

`cardity_compile` rejects indexed state access in agent mode and tells the LLM
to move the collection into a table. This gives the repair loop a concrete,
compiler-backed boundary.

## Generation Pipeline

1. Intent parser: turn one sentence into a structured product brief.
2. Protocol planner: propose state, methods, events, roles, and error codes.
3. Protocol compiler: emit `.car`, compile to JSON/ABI/CARC, run smoke tests.
4. System generator: use ABI to generate SDK, API routes, UI screens, and event log.
5. Runtime verifier: execute sample method calls against local state.
6. Deployment planner: produce deploy/invoke envelopes and indexer expectations.

## Agent OS Manifest

`cardityc` can emit an Agent OS manifest:

```bash
cardityc examples/01_counter.car --format agent-manifest -o dist/counter.agent.json
```

For agent runtimes that need one clean machine-readable response, use the
adapter CLI:

```bash
cardity_agent compile examples/01_counter.car --out-dir dist --include-manifest
```

It writes the compiled protocol JSON, ABI, CARC, and Agent OS manifest, then
returns a JSON envelope:

```json
{
  "schema": "cardity.agent_compile_result.v1",
  "ok": true,
  "artifacts": {
    "protocol_json": "dist/01_counter.json",
    "abi": "dist/01_counter.abi.json",
    "agent_manifest": "dist/01_counter.agent.json",
    "carc": "dist/01_counter.carc"
  }
}
```

The manifest is designed as the handoff from Cardity Core to an agent runtime:

```json
{
  "schema": "cardity.agent_manifest.v1",
  "protocol": {
    "name": "MembershipCredits",
    "version": "1.0.0"
  },
  "state": [],
  "methods": [],
  "events": [],
  "permissions": [],
  "system": {
    "api": { "routes": [] },
    "database": {
      "tables": [],
      "read_models": [],
      "projections": [],
      "queries": []
    },
    "ui": { "resources": [], "actions": [] },
    "workflows": []
  },
  "agent": {
    "tools": [],
    "events": []
  }
}
```

This keeps the LLM loop narrow: generate or repair protocol first, compile it,
then let deterministic generators derive APIs, UI actions, tools, event streams,
database shape, and confirmation requirements.

## PMTSoul Agent Integration

Recommended integration order:

1. Treat Cardity Core as the Protocol Core and manifest generator.
2. Let `pmtsoul-agent` invoke Cardity through a thin adapter first, preferably
   MCP or CLI because the runtime already supports external tools.
3. Promote the adapter to a built-in `tools/cardity_tool.py` only after the
   manifest shape stabilizes.
4. Keep writes, deploys, and state-changing actions behind PMTSoul's policy
   confirmation flow.

See `docs/pmtsoul_agent_integration.md` for the concrete MCP configuration and
tool payloads.

Runtime flow:

```text
user intent
  -> pmtsoul-agent /v1/runs
  -> Cardity protocol draft
  -> cardityc --format agent-manifest
  -> ABI + manifest
  -> workspace artifacts / generated system plan
  -> SSE progress + user confirmation
```

## Near-Term Requirements

Before this can work reliably, Cardity Core needs:

- Stable ABI that includes typed methods, returns, and events.
- Deterministic runtime semantics for assignment, conditions, table adapters, and emit.
- Validation errors that are useful to LLM repair loops.
- Golden examples that represent common apps: counter, credits, wallet, membership.
- A protocol-to-system manifest format, for example:

```json
{
  "name": "MembershipCredits",
  "protocol": "dist/membership.json",
  "abi": "dist/membership.abi.json",
  "targets": ["sdk", "api", "admin-ui", "event-log"],
  "runtime": {
    "state": "local-json",
    "identity": "ctx.sender"
  }
}
```

## Product Shape

The first useful product is not a general app builder. It is a protocol-first
agent workflow:

```text
User: "Make a credit membership system."
Agent: drafts protocol -> compiles -> runs scenarios -> generates app shell.
User: edits rules in protocol terms.
Agent: repairs protocol -> regenerates affected system parts.
```

This keeps the LLM inside a narrow, verifiable loop. The protocol is the
contract, generated code is disposable, and tests prove the behavior.
