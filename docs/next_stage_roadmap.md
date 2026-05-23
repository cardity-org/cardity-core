# Cardity Next Stage Roadmap

Cardity should remain the protocol contract layer for AI-generated systems. It
should not become a full Agent Runtime, full project generator, low-code
platform, or production write executor.

## Product Boundary

```text
Cardity = protocol contract layer
Agent Runtime = execution layer
```

Cardity owns:

- protocol authoring rules;
- compiler validation;
- ABI, protocol JSON, and Agent OS manifest artifacts;
- generic action, projection, diagnostics, and adapter contracts;
- schema and conformance assets;
- explain, review, diff, and simulation tooling.

Downstream runtimes own:

- workspace file generation;
- API/UI/database implementation;
- permission gates and user confirmation;
- dry-run and write execution;
- confirmed readback;
- replay storage and audit logs.

## Milestone 1: Understand And Try

Goal: make Cardity understandable in minutes.

| Workstream | Deliverable |
|---|---|
| Playground | `.car` editor, compile action, artifact tabs, diagnostics panel. |
| Manifest Visualizer | Protocol, system generation, and agent execution graph. |
| Template Library | Official templates for member points, support tickets, refunds, and agent tools. |
| Explain | `cardity explain` for `.car` and manifest JSON. Initial CLI version is available. |

First implementation should keep natural-language generation optional. The
playground can start with templates and direct `.car` editing.

## Milestone 2: Stable Agent Authoring

Goal: make LLM-generated Cardity easier to repair and review.

| Workstream | Deliverable |
|---|---|
| Diagnostics v1 | Stable `error_code`, `repair_hint`, `llm_repair_prompt`, and patch suggestion fields. |
| Prompt Pack | Author, reviewer, repair, projection, and security prompts. |
| Security Review v1 | Manifest risk report for permissions, readback, idempotency, and projections. |

## Milestone 3: Runtime Compatibility

Goal: let downstream runtimes declare Cardity compatibility.

| Workstream | Deliverable |
|---|---|
| Runtime Adapter Contract v1 | Runtime capability declaration schema. |
| Conformance Suite | Manifest/action/projection/runtime adapter checks. |
| Mock Runtime Adapter | Minimal reference adapter declaration and report. |
| PMTSoul Adapter Declaration | PMTSoul compatibility declaration against the contract. |

## Milestone 4: Production Evolution

Goal: manage protocol change over time.

| Workstream | Deliverable |
|---|---|
| Protocol Diff | `.car` and manifest diff with breaking-change classification. |
| Migration Report | Human-readable migration advice. |
| Schema Registry | Stable schema URLs and changelog. |
| Package Format | `.carditypkg` layout for protocol distribution. |

## Milestone 5: Ecosystem

Goal: make Cardity a standard surface for agent-generated systems.

| Workstream | Deliverable |
|---|---|
| Registry | Templates, schemas, examples, runtime adapters, conformance badges. |
| Compatibility List | Runtimes that pass Cardity conformance. |
| Community Templates | Reusable protocol packages. |
| WASM Sandbox Runner | Browser/edge-safe validation and simulation subset. |

## Immediate P0 Scope

The first implementation batch is intentionally small:

- official template library skeleton;
- prompt pack skeleton;
- diagnostics v1 schema;
- runtime adapter contract v1 schema;
- local verification for those assets;
- `cardity init --template`;
- `cardity explain` Markdown/JSON summaries with optional Mermaid graph.

This creates a firm foundation for Playground, Repair Loop, and Conformance
Suite work without moving Cardity into runtime execution.
