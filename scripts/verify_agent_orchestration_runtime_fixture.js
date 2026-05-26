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

function authorityByRole(contract, role) {
  return contract.authority.find((item) => item.role === role);
}

const fixture = readJson("examples/11_pmtsoul_agent_orchestration_runtime_fixture.json");
const contract = readJson(fixture.source_contract);

if (fixture.schema !== "cardity.agent_orchestration_runtime_fixture.v1") {
  fail("agent orchestration runtime fixture has wrong schema");
}
if (fixture.target_runtime !== "pmtsoul-agent-os") {
  fail("agent orchestration runtime fixture should target pmtsoul-agent-os");
}
if (contract.schema !== "cardity.agent_orchestration_contract.v1") {
  fail("source orchestration contract has wrong schema");
}

for (const key of ["enterprise_id", "account_id", "workspace_id"]) {
  if (!fixture.scope_keys.includes(key)) {
    fail(`runtime fixture missing scope key ${key}`);
  }
  if (!contract.coordination.shared_state_lock.includes(key)) {
    fail(`source orchestration shared_state_lock missing ${key}`);
  }
}

const objects = new Map(fixture.control_plane_objects.map((item) => [item.name, item]));
for (const name of [
  "control_employees",
  "control_employee_authority",
  "control_employee_skill_bindings",
  "control_agent_handoff_graph",
  "control_agent_state_locks",
  "control_agent_approval_gates",
  "control_agent_recovery_policy",
  "control_audit_events"
]) {
  if (!objects.has(name)) fail(`runtime fixture missing ${name}`);
}

for (const object of fixture.control_plane_objects) {
  for (const key of ["enterprise_id", "account_id", "workspace_id"]) {
    if (!object.required_fields.includes(key)) {
      fail(`${object.name} missing required scope field ${key}`);
    }
  }
}

const planner = authorityByRole(contract, "planner");
if (!planner || !planner.forbidden_actions.includes("production_write")) {
  fail("hard rule failed: planner must forbid production_write");
}

const operator = authorityByRole(contract, "operator");
if (!operator || operator.can_approve !== false || !operator.forbidden_actions.includes("review.self_approve")) {
  fail("hard rule failed: operator cannot self approve");
}

for (const requirement of ["reviewer", "checkpoint", "readback"]) {
  if (!contract.verification.high_risk_requires.includes(requirement)) {
    fail(`hard rule failed: high risk missing ${requirement}`);
  }
}
if (!contract.verification.high_risk_requires.includes("human_approval")) {
  fail("hard rule failed: high risk missing human_approval");
}

const audit = objects.get("control_audit_events");
for (const field of ["from_employee", "to_employee", "artifact", "acceptance_criteria", "checkpoint_id", "action_id"]) {
  if (!audit.required_fields.includes(field)) {
    fail(`control_audit_events missing ${field}`);
  }
}

if (!fixture.acceptance_criteria.some((item) => item.includes("Cardity remains contract-only"))) {
  fail("runtime fixture must preserve Cardity runtime boundary");
}

console.log("Agent orchestration runtime fixture verified");
