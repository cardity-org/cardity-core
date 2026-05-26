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

const fixture = readJson("examples/10_pmtsoul_account_conformance_fixture.json");
const workspaceContract = readJson(fixture.source_contract);

if (fixture.schema !== "cardity.account_conformance_fixture.v1") {
  fail("account conformance fixture has wrong schema");
}
if (fixture.target_runtime !== "pmtsoul-agent-os") {
  fail("account conformance fixture should target pmtsoul-agent-os");
}
if (workspaceContract.schema !== "cardity.workspace_generation_contract.v1") {
  fail("account conformance fixture source contract has wrong schema");
}

for (const key of ["enterprise_id", "account_id", "workspace_id"]) {
  if (!fixture.scope_keys.includes(key)) {
    fail(`account conformance fixture missing scope key ${key}`);
  }
  if (!workspaceContract.tenant_scope.tenant_keys.includes(key)) {
    fail(`source workspace contract missing tenant key ${key}`);
  }
}

const objects = new Map(fixture.control_plane_objects.map((item) => [item.name, item]));
for (const name of [
  "control_account_workspaces",
  "control_workspace_resources",
  "control_employee_skill_bindings",
  "control_account_conformance_runs"
]) {
  if (!objects.has(name)) fail(`account conformance fixture missing ${name}`);
}

for (const object of fixture.control_plane_objects) {
  for (const key of ["enterprise_id", "account_id", "workspace_id"]) {
    if (!object.required_fields.includes(key)) {
      fail(`${object.name} missing required scope field ${key}`);
    }
  }
  if (!Array.isArray(object.conformance_checks) || object.conformance_checks.length === 0) {
    fail(`${object.name} missing conformance checks`);
  }
}

const resourceObject = objects.get("control_workspace_resources");
for (const type of ["d1_table", "r2_bucket_path", "api_route", "ui_module", "deliverable", "document", "media", "integration"]) {
  if (!resourceObject.resource_types.includes(type)) {
    fail(`control_workspace_resources missing resource type ${type}`);
  }
}

for (const field of ["cross_account_leak_detected", "generated_resources_count", "role_bindings_count"]) {
  if (!fixture.minimum_report_fields.includes(field)) {
    fail(`account conformance fixture missing report field ${field}`);
  }
}

if (!fixture.acceptance_criteria.some((item) => item.includes("Cardity remains contract-only"))) {
  fail("account conformance fixture must preserve Cardity runtime boundary");
}

console.log("Account conformance fixture verified");
