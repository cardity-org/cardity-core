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

const schema = readJson("schemas/workspace_conversation_scope_contract_v1.schema.json");
const example = readJson("examples/15_workspace_conversation_scope_contract_v1.json");

if (schema.properties.schema.const !== "cardity.workspace_conversation_scope_contract.v1") {
  fail("workspace conversation scope schema has wrong const");
}
for (const field of [
  "schema",
  "scope",
  "canonical_fields",
  "routing_rules",
  "endpoint_contracts",
  "repair_policy",
  "frontend_rules",
  "conformance",
  "runtime_boundary"
]) {
  if (!schema.required.includes(field)) fail(`workspace conversation scope schema missing required ${field}`);
  if (!(field in example)) fail(`workspace conversation scope example missing ${field}`);
}
for (const scope of ["chat", "workspace"]) {
  if (!enumValues(schema, "/properties/scope/properties/conversation_scopes/items").includes(scope)) {
    fail(`workspace conversation scope schema missing scope ${scope}`);
  }
}
if (example.schema !== "cardity.workspace_conversation_scope_contract.v1") {
  fail("workspace conversation scope example has wrong schema");
}
for (const key of ["enterprise_id", "account_id", "workspace_id", "conversation_id"]) {
  if (!example.scope.scope_keys.includes(key)) {
    fail(`workspace conversation scope example missing scope key ${key}`);
  }
}
for (const scope of ["chat", "workspace"]) {
  if (!example.scope.conversation_scopes.includes(scope)) {
    fail(`workspace conversation scope example missing conversation scope ${scope}`);
  }
}
if (example.canonical_fields.conversation_scope !== "workspace") {
  fail("workspace conversation scope example must show workspace canonical fields");
}
if (example.canonical_fields.mode !== "workspace") {
  fail("workspace conversation scope example must use workspace mode");
}
if (example.canonical_fields.workspace_chat_facade !== true) {
  fail("workspace conversation scope example must set workspace_chat_facade=true");
}

const chatRule = example.routing_rules.find((rule) => rule.conversation_scope === "chat");
const workspaceRule = example.routing_rules.find((rule) => rule.conversation_scope === "workspace");
if (!chatRule) fail("workspace conversation scope example missing chat routing rule");
if (!workspaceRule) fail("workspace conversation scope example missing workspace routing rule");
if (!workspaceRule.required_fields.includes("workspace_chat_facade")) {
  fail("workspace routing rule must require workspace_chat_facade");
}
if (!workspaceRule.required_fields.includes("workspace_id")) {
  fail("workspace routing rule must require workspace_id");
}

const sessionsEndpoint = example.endpoint_contracts.find((endpoint) => endpoint.endpoint === "/api/sessions" && endpoint.method === "GET");
if (!sessionsEndpoint) fail("workspace conversation scope example missing /api/sessions contract");
if (sessionsEndpoint.returns_scope !== "chat") fail("/api/sessions must return chat scope by default");
if (sessionsEndpoint.filter_policy !== "default_chat_only_exclude_workspace") {
  fail("/api/sessions must exclude workspace conversations by default");
}
const workspaceGet = example.endpoint_contracts.find((endpoint) => (
  endpoint.endpoint === "/api/v1/workspace/conversation"
  && endpoint.method === "GET"
));
if (!workspaceGet) fail("workspace conversation scope example missing workspace GET contract");
if (workspaceGet.returns_scope !== "workspace") fail("workspace GET must return workspace scope");
if (workspaceGet.filter_policy !== "workspace_canonical_only") {
  fail("workspace GET must return canonical workspace conversations only");
}
const workspacePost = example.endpoint_contracts.find((endpoint) => (
  endpoint.endpoint === "/api/v1/workspace/conversation"
  && endpoint.method === "POST"
));
if (!workspacePost) fail("workspace conversation scope example missing workspace POST contract");
if (workspacePost.filter_policy !== "create_or_reuse_workspace_canonical") {
  fail("workspace POST must create or reuse canonical workspace conversation");
}

if (example.repair_policy.legacy_conversation_policy !== "lazy_repair") {
  fail("workspace conversation scope example must allow lazy repair");
}
if (!example.repair_policy.lazy_repair_allowed || !example.repair_policy.backfill_allowed) {
  fail("workspace conversation scope example must allow lazy repair and backfill");
}
if (example.repair_policy.repair_audit_event !== "conversation.scope.repaired") {
  fail("workspace conversation scope example must audit repair");
}
if (!example.frontend_rules.must_use_canonical_scope) {
  fail("frontend must use canonical scope");
}
if (!example.frontend_rules.forbid_id_pattern_scope_inference) {
  fail("frontend must not infer scope from id patterns");
}
for (const check of ["api_sessions_chat_only", "workspace_endpoint_workspace_only", "id_pattern_scope_inference_forbidden"]) {
  if (!example.conformance.checks.includes(check)) {
    fail(`workspace conversation scope example missing conformance check ${check}`);
  }
}
if (!example.runtime_boundary.cardity_owns.includes("conversation scope contract")) {
  fail("workspace conversation scope example missing Cardity boundary");
}
if (!example.runtime_boundary.runtime_owns.includes("conversation persistence")) {
  fail("workspace conversation scope example missing runtime persistence boundary");
}

console.log("Workspace conversation scope contract verification passed");
