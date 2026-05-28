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

const schema = readJson("schemas/guest_view_access_contract_v1.schema.json");
const example = readJson("examples/17_guest_view_access_contract_v1.json");

if (schema.properties.schema.const !== "cardity.guest_view_access_contract.v1") {
  fail("guest view access schema has wrong const");
}
for (const field of ["schema", "scope", "token_policy", "allowed_read_endpoints", "forbidden_actions", "sse_policy", "audit_policy", "conformance", "runtime_boundary"]) {
  if (!schema.required.includes(field)) fail(`guest view access schema missing required ${field}`);
  if (!(field in example)) fail(`guest view access example missing ${field}`);
}
if (example.schema !== "cardity.guest_view_access_contract.v1") {
  fail("guest view access example has wrong schema");
}
for (const key of ["enterprise_id", "account_id", "workspace_id", "guest_token_id"]) {
  if (!example.scope.scope_keys.includes(key)) fail(`guest view access example missing scope key ${key}`);
}
if (example.scope.access_mode !== "guest_view_only") fail("guest view access must be guest_view_only");
if (example.token_policy.token_type !== "guest") fail("guest view token_type must be guest");
for (const field of ["expires_required", "revocable", "scope_bound"]) {
  if (example.token_policy[field] !== true) fail(`guest token policy must set ${field}=true`);
}
for (const endpoint of example.allowed_read_endpoints) {
  if (endpoint.method !== "GET") fail(`${endpoint.endpoint} must be GET-only`);
  if (!endpoint.scope_filter_required) fail(`${endpoint.endpoint} must require scope filtering`);
}
const forbiddenActions = new Set(example.forbidden_actions.map((item) => item.action));
for (const action of ["mutation", "chat.send", "message.send", "task.approve", "task.run", "tool.execute"]) {
  if (!forbiddenActions.has(action)) fail(`guest view access example must forbid ${action}`);
}
if (!example.sse_policy.read_only) fail("guest SSE policy must be read-only");
if (!example.sse_policy.scope_filter_required) fail("guest SSE policy must require scope filtering");
for (const event of ["policy.require_confirm", "chat.message.created", "task.approval.requested", "tool.execution.requested"]) {
  if (!example.sse_policy.forbidden_event_types.includes(event)) {
    fail(`guest SSE policy must forbid ${event}`);
  }
}
for (const event of ["guest_token.created", "guest_token.used", "guest_token.revoked", "guest_access.denied"]) {
  if (!example.audit_policy.required_events.includes(event)) {
    fail(`guest audit policy missing ${event}`);
  }
}
for (const check of ["mutations_forbidden", "chat_send_forbidden", "task_approve_forbidden", "sse_read_only_scope_filtered"]) {
  if (!example.conformance.checks.includes(check)) {
    fail(`guest view access example missing conformance check ${check}`);
  }
}
if (!example.runtime_boundary.cardity_owns.includes("guest view-only access contract")) {
  fail("guest view access example missing Cardity boundary");
}
if (!example.runtime_boundary.runtime_owns.includes("token validation")) {
  fail("guest view access example missing runtime token validation boundary");
}

console.log("Guest view access contract verification passed");
