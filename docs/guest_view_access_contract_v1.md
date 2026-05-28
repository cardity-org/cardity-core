# Guest View Access Contract v1

Guest view access contract v1 defines the boundary for invited read-only users.

It is a contract layer. Cardity does not issue guest tokens, validate sessions,
filter endpoints, stream SSE, or render guest UIs. The consuming runtime owns
token issuance, expiry, revocation, endpoint enforcement, SSE filtering, audit
storage, and UI rendering.

## Core Rules

- Guest tokens must be scope-bound, expiring, and revocable.
- Allowed endpoints must be `GET` only and scope-filtered.
- Mutations are forbidden.
- Chat/send/task approval/task run/tool execution are forbidden.
- SSE streams must be read-only and scope-filtered.
- Guest token creation, use, revocation, and denied access should be audited.

## Reference Example

```text
examples/17_guest_view_access_contract_v1.json
```

## Local Verification

```bash
node scripts/verify_guest_view_access_contract.js
```
