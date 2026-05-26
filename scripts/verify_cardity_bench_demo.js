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

const demo = readJson("examples/06_cardity_bench_demo.json");
if (demo.schema !== "cardity.bench_demo.v1") fail("bench demo has wrong schema");
if (demo.baseline_gui_agent?.mode !== "gui_only") fail("bench demo missing GUI-only baseline");
if (demo.cardity_contract_path?.mode !== "agent_native_contract") fail("bench demo missing Cardity contract path");

for (const contract of [
  "cardity.agent_action_contract.v1",
  "cardity.production_write_contract.v1",
  "cardity.checkpoint_contract.v1",
  "cardity.workspace_generation_contract.v1",
  "projection_contract_v1_1"
]) {
  if (!Object.values(demo.cardity_contract_path.contracts || {}).includes(contract)) {
    fail(`bench demo missing contract ${contract}`);
  }
}

for (const mode of ["long_click_path", "missing_post_action_verification", "non_deterministic_replay"]) {
  if (!demo.baseline_gui_agent.expected_failure_modes.includes(mode)) {
    fail(`bench demo missing GUI failure mode ${mode}`);
  }
}

for (const advantage of ["confirmed_readback", "checkpoint_verification", "idempotent_replay", "audit_ledger", "explicit_recovery_policy"]) {
  if (!demo.cardity_contract_path.expected_advantages.includes(advantage)) {
    fail(`bench demo missing Cardity advantage ${advantage}`);
  }
}

for (const field of ["gui_only_step_count", "cardity_contract_step_count", "cross_account_data_leak_detected"]) {
  if (!demo.report_fields.includes(field)) {
    fail(`bench demo missing report field ${field}`);
  }
}

if (!demo.task.pmtsoul_reference?.tenant_scope?.includes("enterprise_id")) {
  fail("bench demo PMTSoul reference must include enterprise_id tenant scope");
}
if (!demo.task.pmtsoul_reference?.tenant_scope?.includes("account_id")) {
  fail("bench demo PMTSoul reference must include account_id tenant scope");
}

const productionWrite = readJson(demo.evidence_contracts.production_write_contract);
if (productionWrite.schema !== "cardity.production_write_contract.v1") {
  fail("bench demo production write evidence has wrong schema");
}
for (const field of ["permission", "readback", "idempotency", "audit", "replay_policy", "compensation_policy"]) {
  if (!(field in productionWrite)) fail(`production write evidence missing ${field}`);
}

const checkpoint = readJson(demo.evidence_contracts.checkpoint_contract);
if (checkpoint.schema !== "cardity.checkpoint_contract.v1") {
  fail("bench demo checkpoint evidence has wrong schema");
}
for (const field of ["checkpoints", "ledger", "recovery_policy"]) {
  if (!(field in checkpoint)) fail(`checkpoint evidence missing ${field}`);
}

const workspaceGeneration = readJson(demo.evidence_contracts.workspace_generation_contract);
if (workspaceGeneration.schema !== "cardity.workspace_generation_contract.v1") {
  fail("bench demo workspace generation evidence has wrong schema");
}
for (const key of ["enterprise_id", "account_id"]) {
  if (!workspaceGeneration.tenant_scope.tenant_keys.includes(key)) {
    fail(`workspace generation evidence missing tenant key ${key}`);
  }
}

if (!demo.acceptance_criteria.some((item) => item.includes("does not require Cardity to drive a GUI"))) {
  fail("bench demo must state that Cardity does not drive a GUI");
}
if (!demo.acceptance_criteria.some((item) => item.includes("runtime execution"))) {
  fail("bench demo must separate Cardity from runtime execution");
}
if (!demo.acceptance_criteria.some((item) => item.includes("enterprise_id and account_id"))) {
  fail("bench demo must state enterprise/account tenant scope");
}

console.log("Cardity bench demo verified");
