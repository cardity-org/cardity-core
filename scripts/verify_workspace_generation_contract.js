#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function fail(message) {
  throw new Error(message);
}

const schema = readJson("schemas/workspace_generation_contract_v1.schema.json");
if (schema.properties.schema.const !== "cardity.workspace_generation_contract.v1") {
  fail("workspace generation schema has wrong const");
}
for (const field of ["schema", "tenant_scope", "workspace", "resource_mapping", "role_tool_bindings", "account_conformance"]) {
  if (!schema.required.includes(field)) fail(`workspace generation schema missing required ${field}`);
}
if (!schema.properties.tenant_scope.properties.enterprise_key) {
  fail("workspace generation schema missing tenant_scope.enterprise_key");
}
for (const artifact of ["api", "database", "ui", "workflow", "agent_roles", "permissions", "audit", "recovery", "deliverables", "documents", "media", "integrations"]) {
  const values = schema.properties.workspace.properties.generated_artifacts.items.enum;
  if (!values.includes(artifact)) fail(`workspace generation schema missing artifact ${artifact}`);
}

const example = readJson("examples/07_workspace_generation_contract_v1.json");
if (example.schema !== "cardity.workspace_generation_contract.v1") {
  fail("workspace generation example has wrong schema");
}
if (example.tenant_scope.isolation_policy.mode !== "metadata_only") {
  fail("workspace generation example must keep Cardity tenant isolation metadata-only");
}
if (example.tenant_scope.isolation_policy.runtime_owned !== true) {
  fail("workspace generation example must declare runtime-owned isolation");
}
for (const key of ["enterprise_id", "account_id"]) {
  if (!example.tenant_scope.tenant_keys.includes(key)) {
    fail(`workspace generation example missing tenant key ${key}`);
  }
}
if (example.workspace.target_runtime !== "pmtsoul-agent-os") {
  fail("workspace generation example should target pmtsoul-agent-os");
}
for (const artifact of ["deliverables", "documents", "media", "integrations"]) {
  if (!example.workspace.generated_artifacts.includes(artifact)) {
    fail(`workspace generation example missing generated artifact ${artifact}`);
  }
}
for (const collection of ["actions", "read_models", "projections", "queries", "checkpoints", "deliverables", "documents", "media", "integrations"]) {
  if (!Array.isArray(example.resource_mapping[collection]) || example.resource_mapping[collection].length === 0) {
    fail(`workspace generation example missing resource mapping ${collection}`);
  }
  for (const mapping of example.resource_mapping[collection]) {
    for (const key of ["enterprise_id", "account_id"]) {
      if (!mapping.tenant_scoped_by.includes(key)) {
        fail(`workspace generation ${collection} mapping missing tenant scope ${key}`);
      }
    }
  }
}
if (!Array.isArray(example.role_tool_bindings) || example.role_tool_bindings.length === 0) {
  fail("workspace generation example missing role_tool_bindings");
}
for (const check of ["tenant_scope_present", "workspace_metadata_present", "actions_mapped", "roles_bound", "enterprise_scope_present", "account_scope_present", "resources_tenant_scoped", "cross_account_leak_check"]) {
  if (!example.account_conformance.checks.includes(check)) {
    fail(`workspace generation example missing account conformance check ${check}`);
  }
}

console.log("Workspace generation contract verification passed");
