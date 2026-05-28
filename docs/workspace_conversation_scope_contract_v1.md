# Workspace Conversation Scope Contract v1

Workspace conversation scope contract v1 defines how a runtime separates
ordinary chat conversations from workspace conversations.

It is a contract layer. Cardity does not store conversations, repair legacy
rows, route frontend sessions, or run chat endpoints. The consuming runtime owns
persistence, endpoint filtering, lazy repair, backfill, frontend rendering, SSE
scope filtering, and audit storage.

## Canonical Fields

Workspace conversation records should carry explicit scope fields:

```text
conversation_scope = chat | workspace
origin
source
mode = chat | workspace
workspace_chat_facade
```

Runtimes should use these fields directly. Frontends should not infer scope
from conversation ids, prefixes, timestamps, or other incidental patterns.

## Endpoint Rules

The reference example encodes these rules:

- `/api/sessions` defaults to ordinary chat and excludes workspace
  conversations.
- `/api/v1/workspace/conversation` returns only canonical workspace
  conversations.
- Workspace conversation creation should create or reuse a canonical workspace
  conversation with `workspace_chat_facade=true`.
- Legacy conversations may be lazy-repaired or backfilled, but repair must be
  audited.

## Reference Example

See:

```text
examples/15_workspace_conversation_scope_contract_v1.json
```

## Local Verification

```bash
node scripts/verify_workspace_conversation_scope_contract.js
```
