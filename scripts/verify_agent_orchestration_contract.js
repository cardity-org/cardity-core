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

function byRole(contract, role) {
  return contract.authority.find((item) => item.role === role);
}

const schema = readJson("schemas/agent_orchestration_contract_v1.schema.json");
if (schema.properties.schema.const !== "cardity.agent_orchestration_contract.v1") {
  fail("agent orchestration schema has wrong const");
}
for (const field of ["schema", "roles", "authority", "handoffs", "verification", "coordination", "failure_policy"]) {
  if (!schema.required.includes(field)) fail(`agent orchestration schema missing required ${field}`);
}
for (const roleKind of ["planner", "operator", "reviewer", "auditor", "recovery_agent"]) {
  const values = schema.properties.roles.items.properties.kind.enum;
  if (!values.includes(roleKind)) fail(`agent orchestration schema missing role kind ${roleKind}`);
}

const example = readJson("examples/08_agent_orchestration_contract_v1.json");
if (example.schema !== "cardity.agent_orchestration_contract.v1") {
  fail("agent orchestration example has wrong schema");
}

for (const roleKind of ["planner", "operator", "reviewer", "auditor", "recovery_agent"]) {
  if (!example.roles.some((role) => role.kind === roleKind)) {
    fail(`agent orchestration example missing ${roleKind} role`);
  }
}

const planner = byRole(example, "planner");
if (!planner || !planner.forbidden_actions.includes("production_write") || planner.can_approve !== false) {
  fail("planner must not production write or approve");
}

const operator = byRole(example, "operator");
if (!operator || operator.can_approve !== false || !operator.forbidden_actions.includes("review.self_approve")) {
  fail("operator must not approve its own write");
}

const reviewer = byRole(example, "reviewer");
if (!reviewer || reviewer.can_approve !== true) {
  fail("reviewer must be able to approve/recommend approval");
}

const recovery = byRole(example, "recovery_agent");
if (!recovery || !recovery.forbidden_actions.includes("production_write.unapproved")) {
  fail("recovery agent must not bypass approval for new writes");
}

for (const handoff of example.handoffs) {
  if (!Array.isArray(handoff.required_artifacts) || handoff.required_artifacts.length === 0) {
    fail(`handoff ${handoff.from}->${handoff.to} must carry structured artifacts`);
  }
  if (!Array.isArray(handoff.acceptance_criteria) || handoff.acceptance_criteria.length === 0) {
    fail(`handoff ${handoff.from}->${handoff.to} must declare acceptance criteria`);
  }
}

for (const requirement of ["reviewer", "checkpoint", "readback"]) {
  if (!example.verification.high_risk_requires.includes(requirement)) {
    fail(`high risk verification missing ${requirement}`);
  }
}
for (const requirement of ["permission", "confirmation", "readback", "checkpoint", "audit"]) {
  if (!example.verification.write_requires.includes(requirement)) {
    fail(`write verification missing ${requirement}`);
  }
}

if (example.coordination.max_parallel_agents > 1 && example.coordination.shared_state_lock.length === 0) {
  fail("parallel or hybrid orchestration must declare shared_state_lock");
}
if (example.failure_policy.recovery_role !== "recovery_agent") {
  fail("failure policy must route recovery to recovery_agent");
}

console.log("Agent orchestration contract verification passed");
