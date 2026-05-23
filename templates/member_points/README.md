# Member Points Template

This template demonstrates a table-first membership points protocol for Agent
OS generation.

```bash
cardity_agent compile src/protocol.car \
  --out-dir dist \
  --include-manifest \
  --include-protocol \
  --include-abi
```

Expected generated surface:

- balance and ledger tables;
- earn/spend/admin command actions;
- balance query action;
- confirmation requirements for mutating methods;
- events for projection/read-model updates.
