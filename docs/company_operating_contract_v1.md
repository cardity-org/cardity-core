# Cardity Company Operating Contract v1

Company operating contract v1 describes how a generated company workspace is
organized: systems, digital employees, responsibilities, ownership, evaluation,
hiring, memory, audit, and conformance.

It is a contract layer. Cardity does not name product-specific employees, manage
employees, run tasks, mutate memory, deploy sites, or write runtime
control-plane rows. The consuming runtime owns execution, scheduling,
persistence, skill enforcement, audit, streaming, and recovery.

## Runtime Fit

The contract follows a generic Agent OS model:

| Runtime layer | Contract role |
|---|---|
| Control Plane | Enterprise/account governance, permissions, credentials, employee records, workspace metadata. |
| Runtime | Run facts, tool calls, RunEvent, writes, readback, audit, artifacts. |
| SkillHub | Capability catalog and entitlement source. |
| Workbench | Employee workspace, operations console, management dashboard. |

## Required Blocks

| Block | Purpose |
|---|---|
| `company` | Enterprise/account/workspace identity and business domains. |
| `operating_model` | Control Plane, runtime, capability catalog, and workbench boundaries. |
| `systems` | Company systems such as website, ERP, CRM, knowledge base, storefront, marketing, operations. |
| `digital_employees` | Account-scoped employee identities, responsibilities, skill whitelists, authority, and memory scopes. Evaluators and HR roles are employees here too. |
| `ownership_matrix` | Which employees own and review each system. |
| `governance` | Scope, permission, and audit policies. |
| `evaluation` | Evaluation policy that references reviewer employee ids from `digital_employees`. |
| `hiring` | Hiring/capability-gap policy that references HR employee ids from `digital_employees`. |
| `conformance` | Runtime checks before the company workspace is considered valid. |
| `runtime_boundary` | What Cardity defines vs what the runtime executes. |

## Public Site Example

The public site is not owned by one vague "site agent". The contract can assign
responsibilities across runtime-supplied employee ids:

| Responsibility | Example employee |
|---|---|
| Engineering and deploy | `employee_engineering` |
| Content and positioning | `employee_content` |
| Approval and orchestration | `employee_planner` |
| Risk/readback review | `employee_reviewer` |
| Capability gap and hiring review | an existing employee id such as `employee_planner` |

`evaluation.reviewer_roles` and `hiring.hr_roles` do not create separate actor
pools. They must reference employees already declared in `digital_employees`.
Reference examples must not invent product-specific employee names that do not
exist in the target runtime. If a new employee is needed, the contract should
produce a hiring/capability-gap proposal first.

## Local Verification

```bash
node scripts/verify_company_operating_contract.js
```
