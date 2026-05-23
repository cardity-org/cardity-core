# Runtime Compatibility List

The runtime compatibility list is Cardity's public index of downstream Agent
runtimes that declare support for Cardity contracts.

It is not an execution registry. It is a compatibility declaration surface:

- which runtime adapter contract a runtime publishes;
- which manifest/action/projection versions it supports;
- whether conformance gates generation;
- whether production writes are disabled, dry-run-only, or permissioned;
- which reference implementation was validated.

## Hosted URLs

```text
https://api.cardity.org/runtimes
https://api.cardity.org/runtimes/pmtsoul-agent-os
https://api.cardity.org/runtimes/pmtsoul-agent-os/badge.json
https://api.cardity.org/runtimes/pmtsoul-agent-os/badge.svg
```

Local source of truth:

```text
registry/runtimes.json
```

## CLI

```bash
cardity runtimes
cardity runtimes pmtsoul-agent-os
```

## MCP

Tool:

```text
cardity_runtime_compatibility
```

Inputs:

```json
{}
```

```json
{
  "id": "pmtsoul-agent-os"
}
```

## First Runtime

PMTSoul Agent OS is the first registered Cardity-compatible runtime.

Current boundary:

- supports `cardity.agent_manifest.v1`;
- supports `agent_action_contract_v1`;
- supports `projection_contract_v1_1`;
- publishes `cardity.runtime_adapter_contract.v1`;
- blocks workspace generation when Cardity conformance fails;
- stores Cardity metadata in generated workspaces;
- keeps production writes `dry_run_only`.

Production writes should stay disabled unless a future explicit
deployment/write permission contract is added.

## Badge

PMTSoul can embed the compatibility badge in Markdown:

```markdown
[![Cardity-compatible](https://api.cardity.org/runtimes/pmtsoul-agent-os/badge.svg)](https://api.cardity.org/runtimes/pmtsoul-agent-os)
```

The current badge message is:

```text
Cardity-compatible | dry_run_only
```

Badge JSON:

```bash
curl https://api.cardity.org/runtimes/pmtsoul-agent-os/badge.json
```

Badge SVG:

```bash
curl https://api.cardity.org/runtimes/pmtsoul-agent-os/badge.svg
```
