# AI Company Bootstrap Reference

`examples/13_ai_company_bootstrap_contract_v1.json` is a generic reference for
an account-level AI company after bootstrap.

It is not an ERP/CRM template and it is not a runtime initializer. It only shows
how Cardity can describe the operating contract that a runtime materializes.

## What Cardity Defines

- Company/account scope keys, such as `enterprise_id`, `account_id`, and
  `company_id`.
- Company systems, such as public site, mailbox, context index, and growth
  pipeline.
- Digital employee responsibilities, skill whitelists, authority, and memory
  scopes.
- System ownership, reviewers, checkpoints, governance, evaluation, conformance,
  and runtime boundary.

## What The Runtime Owns

- Creating the company entity.
- Provisioning email and domains.
- Sending welcome email.
- Generating websites, market research, user profile, deliverables, and memory
  indexes.
- Running manual-start tasks.
- Persisting mailbox records, audit events, recovery state, and workbench UI.

## Canonical Boundary

The example uses only canonical top-level
`cardity.company_operating_contract.v1` fields:

```text
schema, company, operating_model, systems, digital_employees,
ownership_matrix, governance, evaluation, conformance, runtime_boundary
```

Do not add top-level `hiring`, `memory`, `knowledge_base`, `mailbox`, `tasks`,
`website`, or `market_research` blocks to a Cardity company operating snapshot.
Those are runtime resources, employee responsibilities, systems, audit events,
or deliverables.

## Verification

```bash
node scripts/verify_company_operating_contract.js
```
