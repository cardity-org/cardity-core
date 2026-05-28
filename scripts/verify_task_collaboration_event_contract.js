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

function enumValues(schema, pointer) {
  let current = schema;
  for (const segment of pointer.split("/").filter(Boolean)) {
    current = current?.[segment];
  }
  return current?.enum || [];
}

const schema = readJson("schemas/task_collaboration_event_contract_v1.schema.json");
const example = readJson("examples/16_task_collaboration_event_contract_v1.json");
const lifecycleEvents = [
  "account.task.employee.started",
  "account.task.employee.progress",
  "account.task.employee.handoff",
  "account.task.employee.completed",
  "account.task.employee.failed",
  "account.task.employee.cancelled"
];
const requiredPayloadFields = ["task_id", "employee_id", "lane_id", "task_lead_employee_id"];

if (schema.properties.schema.const !== "cardity.task_collaboration_event_contract.v1") {
  fail("task collaboration event schema has wrong const");
}
for (const field of ["schema", "scope", "task_lead", "collaborator_lanes", "event_contracts", "barrier", "finalization", "failure_policy", "frontend_rules", "conformance", "runtime_boundary"]) {
  if (!schema.required.includes(field)) fail(`task collaboration event schema missing required ${field}`);
  if (!(field in example)) fail(`task collaboration event example missing ${field}`);
}
for (const event of lifecycleEvents) {
  if (!enumValues(schema, "/properties/collaborator_lanes/items/properties/lifecycle_events/items").includes(event)) {
    fail(`task collaboration event schema missing lifecycle event ${event}`);
  }
}
if (example.schema !== "cardity.task_collaboration_event_contract.v1") {
  fail("task collaboration event example has wrong schema");
}
for (const key of ["enterprise_id", "account_id", "workspace_id", "task_id"]) {
  if (!example.scope.scope_keys.includes(key)) fail(`task collaboration event example missing scope key ${key}`);
}
if (!example.task_lead.task_lead_employee_id) fail("task collaboration event example missing task lead");
const laneIds = new Set(example.collaborator_lanes.map((lane) => lane.lane_id));
if (laneIds.size < 2) fail("task collaboration event example must include multiple lanes");
for (const lane of example.collaborator_lanes) {
  if (!lane.employee_id) fail(`${lane.lane_id} missing employee_id`);
  for (const event of ["account.task.employee.started", "account.task.employee.progress", "account.task.employee.handoff", "account.task.employee.completed"]) {
    if (!lane.lifecycle_events.includes(event)) fail(`${lane.lane_id} missing lifecycle event ${event}`);
  }
}
for (const event of lifecycleEvents.filter((item) => item !== "account.task.employee.cancelled")) {
  const eventContract = example.event_contracts.find((item) => item.event === event);
  if (!eventContract) fail(`task collaboration event example missing event contract ${event}`);
  for (const field of requiredPayloadFields) {
    if (!eventContract.required_payload_fields.includes(field)) {
      fail(`${event} missing required payload field ${field}`);
    }
  }
}
if (example.barrier.type !== "all_collaborators_completed") {
  fail("task collaboration event example must use all_collaborators_completed barrier");
}
for (const laneId of laneIds) {
  if (!example.barrier.wait_for.includes(laneId)) {
    fail(`barrier missing lane ${laneId}`);
  }
}
for (const output of ["consolidated_result", "deliverable_or_document", "workspace_summary", "llm_summary_email", "task_completed_event"]) {
  if (!example.finalization.required_outputs.includes(output)) {
    fail(`task collaboration event example missing finalization output ${output}`);
  }
}
if (example.failure_policy.lane_failure_policy !== "manual_review") {
  fail("task collaboration event example must send lane failure to manual review");
}
if (!example.failure_policy.partial_consolidation_allowed) {
  fail("task collaboration event example must allow partial consolidation");
}
if (!example.frontend_rules.show_lane_status) fail("frontend must show lane status");
if (!example.frontend_rules.forbid_natural_language_progress_parsing) {
  fail("frontend must not parse natural-language progress");
}
for (const check of ["barrier_waits_for_collaborators", "frontend_uses_structured_lane_events"]) {
  if (!example.conformance.checks.includes(check)) {
    fail(`task collaboration event example missing conformance check ${check}`);
  }
}
if (!example.runtime_boundary.cardity_owns.includes("task collaboration event contract")) {
  fail("task collaboration event example missing Cardity boundary");
}
if (!example.runtime_boundary.runtime_owns.includes("barrier enforcement")) {
  fail("task collaboration event example missing runtime barrier boundary");
}

console.log("Task collaboration event contract verification passed");
