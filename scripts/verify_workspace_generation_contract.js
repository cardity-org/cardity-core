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
for (const artifact of ["api", "database", "ui", "workflow", "agent_roles", "permissions", "audit", "recovery"]) {
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
if (example.workspace.target_runtime !== "pmtsoul-agent-os") {
  fail("workspace generation example should target pmtsoul-agent-os");
}
for (const collection of ["actions", "read_models", "projections", "queries", "checkpoints"]) {
  if (!Array.isArray(example.resource_mapping[collection]) || example.resource_mapping[collection].length === 0) {
    fail(`workspace generation example missing resource mapping ${collection}`);
  }
}
if (!Array.isArray(example.role_tool_bindings) || example.role_tool_bindings.length === 0) {
  fail("workspace generation example missing role_tool_bindings");
}
for (const check of ["tenant_scope_present", "workspace_metadata_present", "actions_mapped", "roles_bound"]) {
  if (!example.account_conformance.checks.includes(check)) {
    fail(`workspace generation example missing account conformance check ${check}`);
  }
}

console.log("Workspace generation contract verification passed");
