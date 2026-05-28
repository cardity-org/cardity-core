# Capability Runtime Tool Contract v1

Capability runtime tool contract v1 maps employee-visible capabilities to the
runtime tools they may see and call.

It is a contract layer. Cardity does not register tools, execute tools, manage
credentials, or resolve runtime identities. The consuming runtime owns actual
tool registration, permission enforcement, execution, audit persistence, and UI
visibility.

## Core Mapping

Each mapping binds:

```text
employee_role + skill_slug
  -> allowed_runtime_tools[]
  -> forbidden_runtime_tools[]
  -> allowed_employee_ids[]
  -> risk_level
  -> requires_confirm
  -> audit_event
```

This lets a runtime expose native tools such as website builders, SEO helpers,
poster renderers, or message drafters while keeping unrelated tools hidden.

## Safety Rules

- Default visibility should be `hidden`.
- Unknown tools should be denied.
- Unlisted employees should not see or call the skill tools.
- Terminal, shell, raw database, and unrelated ERP tools should stay forbidden
  unless a separate explicit policy grants them.
- Medium/high risk capabilities should declare confirmation and audit
  requirements.

## Reference Example

`examples/14_capability_runtime_tool_contract_v1.json` includes six generic
capability mappings:

- `web.site.build`
- `web.site.iterate`
- `marketing.seo.optimize`
- `marketing.poster.design`
- `visual.brand_system_maintain`
- `sales.outreach_draft`

The example is intentionally runtime-neutral. PMTSoul or another Agent OS can
map these declarations to its own native tools, employees, credentials, and
audit tables.

## Local Verification

```bash
node scripts/verify_capability_runtime_tool_contract.js
```
