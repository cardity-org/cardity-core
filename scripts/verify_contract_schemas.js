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

const schemas = [
  "schemas/agent_manifest_v1.schema.json",
  "schemas/agent_action_contract_v1.schema.json",
  "schemas/production_write_contract_v1.schema.json",
  "schemas/checkpoint_contract_v1.schema.json",
  "schemas/workspace_generation_contract_v1.schema.json",
  "schemas/agent_orchestration_contract_v1.schema.json",
  "schemas/company_operating_contract_v1.schema.json",
  "schemas/capability_runtime_tool_contract_v1.schema.json",
  "schemas/workspace_conversation_scope_contract_v1.schema.json",
  "schemas/task_collaboration_event_contract_v1.schema.json",
  "schemas/guest_view_access_contract_v1.schema.json",
  "schemas/projection_contract_v1_1.schema.json",
  "schemas/diagnostics_v1.schema.json",
  "schemas/runtime_adapter_contract_v1.schema.json",
  "schemas/security_review_v1.schema.json",
  "schemas/protocol_diff_v1.schema.json",
  "schemas/conformance_report_v1.schema.json",
  "schemas/manifest_visualization_v1.schema.json",
  "schemas/explain_result_v1.schema.json",
  "schemas/package_v1.schema.json",
  "schemas/ecosystem_registry_v1.schema.json",
];

const registry = readJson("schemas/registry.json");
if (registry.schema !== "cardity.schema_registry.v1") fail("schema registry has wrong schema");
if (!registry.base_url?.startsWith("https://api.cardity.org/schemas")) fail("schema registry missing API base_url");
if (!Array.isArray(registry.schemas) || registry.schemas.length !== schemas.length) {
  fail(`schema registry expected ${schemas.length} schema entries`);
}

for (const schemaPath of schemas) {
  const schema = readJson(schemaPath);
  if (!schema.$schema) fail(`${schemaPath}: missing $schema`);
  if (!schema.$id?.startsWith("https://cardity.org/schemas/")) fail(`${schemaPath}: missing cardity.org $id`);
  if (!schema.title) fail(`${schemaPath}: missing title`);

  const file = schemaPath.replace("schemas/", "");
  const entry = registry.schemas.find((item) => item.file === file);
  if (!entry) fail(`schema registry missing ${file}`);
  if (entry.schema_id !== schema.$id) fail(`schema registry ${file} schema_id mismatch`);
  if (entry.title !== schema.title) fail(`schema registry ${file} title mismatch`);
  if (entry.url !== `${registry.base_url}/${file}`) fail(`schema registry ${file} URL mismatch`);
}

const actionSchema = readJson("schemas/agent_action_contract_v1.schema.json");
for (const field of [
  "kind",
  "intent_names",
  "intent_examples",
  "input_schema",
  "permission",
  "confirm_required",
  "dry_run_supported",
  "readback_required",
  "idempotency_key",
  "risk_level",
  "side_effects",
  "audit_event",
  "replay_policy",
]) {
  if (!actionSchema.required.includes(field)) fail(`agent action schema missing required ${field}`);
}
for (const kind of ["query", "command", "external_navigation"]) {
  if (!enumValues(actionSchema, "/properties/kind").includes(kind)) fail(`agent action schema missing kind ${kind}`);
}

const manifestSchema = readJson("schemas/agent_manifest_v1.schema.json");
for (const field of ["api", "database", "ui", "workflows", "modules", "external"]) {
  if (!manifestSchema.properties.system.required.includes(field)) fail(`agent manifest schema missing system.${field}`);
}

const projectionSchema = readJson("schemas/projection_contract_v1_1.schema.json");
for (const op of ["insert", "upsert_delta", "upsert_snapshot", "delete", "soft_delete"]) {
  if (!enumValues(projectionSchema, "/$defs/projection_write/properties/operation").includes(op)) {
    fail(`projection schema missing operation ${op}`);
  }
}
for (const source of ["event", "confirmed_readback"]) {
  if (!enumValues(projectionSchema, "/$defs/projection/properties/source").includes(source)) {
    fail(`projection schema missing source ${source}`);
  }
}

const productionWriteSchema = readJson("schemas/production_write_contract_v1.schema.json");
for (const field of [
  "schema",
  "permission",
  "confirm_policy",
  "confirmation_ui",
  "readback",
  "idempotency",
  "audit",
  "replay_policy",
  "compensation_policy",
]) {
  if (!productionWriteSchema.required.includes(field)) fail(`production write schema missing required ${field}`);
}
for (const state of ["draft", "preparing", "pending", "approved", "verified", "failed"]) {
  if (!enumValues(productionWriteSchema, "/properties/confirmation_ui/properties/states/items").includes(state)) {
    fail(`production write schema missing confirmation state ${state}`);
  }
}
for (const mode of ["none", "manual", "compensating_action"]) {
  if (!enumValues(productionWriteSchema, "/properties/compensation_policy/properties/mode").includes(mode)) {
    fail(`production write schema missing compensation mode ${mode}`);
  }
}

const checkpointSchema = readJson("schemas/checkpoint_contract_v1.schema.json");
for (const field of ["schema", "scope", "checkpoints", "ledger", "recovery_policy"]) {
  if (!checkpointSchema.required.includes(field)) fail(`checkpoint schema missing required ${field}`);
}
for (const scope of ["action", "workflow", "module", "system"]) {
  if (!enumValues(checkpointSchema, "/properties/scope").includes(scope)) {
    fail(`checkpoint schema missing scope ${scope}`);
  }
}
for (const mode of ["retry", "stop", "manual_review", "compensating_action"]) {
  if (!enumValues(checkpointSchema, "/properties/checkpoints/items/properties/on_failure/properties/mode").includes(mode)) {
    fail(`checkpoint schema missing on_failure mode ${mode}`);
  }
}

const workspaceGenerationSchema = readJson("schemas/workspace_generation_contract_v1.schema.json");
for (const field of ["schema", "tenant_scope", "workspace", "resource_mapping", "role_tool_bindings", "account_conformance"]) {
  if (!workspaceGenerationSchema.required.includes(field)) fail(`workspace generation schema missing required ${field}`);
}
for (const artifact of ["api", "database", "ui", "workflow", "agent_roles", "permissions", "audit", "recovery", "deliverables", "documents", "media", "integrations"]) {
  if (!enumValues(workspaceGenerationSchema, "/properties/workspace/properties/generated_artifacts/items").includes(artifact)) {
    fail(`workspace generation schema missing artifact ${artifact}`);
  }
}
if (!workspaceGenerationSchema.properties.tenant_scope.properties.enterprise_key) {
  fail("workspace generation schema missing tenant_scope.enterprise_key");
}
for (const check of ["tenant_scope_present", "workspace_metadata_present", "actions_mapped", "roles_bound", "enterprise_scope_present", "account_scope_present", "resources_tenant_scoped", "cross_account_leak_check"]) {
  if (!enumValues(workspaceGenerationSchema, "/properties/account_conformance/properties/checks/items").includes(check)) {
    fail(`workspace generation schema missing account conformance check ${check}`);
  }
}

const agentOrchestrationSchema = readJson("schemas/agent_orchestration_contract_v1.schema.json");
for (const field of ["schema", "roles", "authority", "handoffs", "verification", "coordination", "failure_policy"]) {
  if (!agentOrchestrationSchema.required.includes(field)) fail(`agent orchestration schema missing required ${field}`);
}
for (const roleKind of ["planner", "operator", "reviewer", "auditor", "recovery_agent"]) {
  if (!enumValues(agentOrchestrationSchema, "/properties/roles/items/properties/kind").includes(roleKind)) {
    fail(`agent orchestration schema missing role kind ${roleKind}`);
  }
}
for (const mode of ["sequential", "parallel", "hybrid"]) {
  if (!enumValues(agentOrchestrationSchema, "/properties/coordination/properties/mode").includes(mode)) {
    fail(`agent orchestration schema missing coordination mode ${mode}`);
  }
}

const companyOperatingSchema = readJson("schemas/company_operating_contract_v1.schema.json");
const companyOperatingCanonicalFields = ["schema", "company", "operating_model", "systems", "digital_employees", "ownership_matrix", "governance", "evaluation", "conformance", "runtime_boundary"];
for (const field of companyOperatingCanonicalFields) {
  if (!companyOperatingSchema.required.includes(field)) fail(`company operating schema missing required ${field}`);
}
for (const field of ["hiring", "memory", "knowledge_base"]) {
  if (companyOperatingSchema.required.includes(field)) {
    fail(`company operating schema should not require top-level ${field}`);
  }
  if (companyOperatingSchema.properties[field]) {
    fail(`company operating schema should not define top-level ${field}`);
  }
}
if (companyOperatingSchema.properties.schema.const !== "cardity.company_operating_contract.v1") {
  fail("company operating schema has wrong const");
}

const capabilityRuntimeToolSchema = readJson("schemas/capability_runtime_tool_contract_v1.schema.json");
for (const field of ["schema", "scope", "visibility_policy", "capability_tools", "conformance", "runtime_boundary"]) {
  if (!capabilityRuntimeToolSchema.required.includes(field)) {
    fail(`capability runtime tool schema missing required ${field}`);
  }
}
if (capabilityRuntimeToolSchema.properties.schema.const !== "cardity.capability_runtime_tool_contract.v1") {
  fail("capability runtime tool schema has wrong const");
}
for (const risk of ["low", "medium", "high", "critical"]) {
  if (!enumValues(capabilityRuntimeToolSchema, "/properties/capability_tools/items/properties/risk_level").includes(risk)) {
    fail(`capability runtime tool schema missing risk level ${risk}`);
  }
}

const workspaceConversationScopeSchema = readJson("schemas/workspace_conversation_scope_contract_v1.schema.json");
for (const field of ["schema", "scope", "canonical_fields", "routing_rules", "endpoint_contracts", "repair_policy", "frontend_rules", "conformance", "runtime_boundary"]) {
  if (!workspaceConversationScopeSchema.required.includes(field)) {
    fail(`workspace conversation scope schema missing required ${field}`);
  }
}
if (workspaceConversationScopeSchema.properties.schema.const !== "cardity.workspace_conversation_scope_contract.v1") {
  fail("workspace conversation scope schema has wrong const");
}
for (const scope of ["chat", "workspace"]) {
  if (!enumValues(workspaceConversationScopeSchema, "/properties/scope/properties/conversation_scopes/items").includes(scope)) {
    fail(`workspace conversation scope schema missing scope ${scope}`);
  }
}

const taskCollaborationEventSchema = readJson("schemas/task_collaboration_event_contract_v1.schema.json");
for (const field of ["schema", "scope", "task_lead", "collaborator_lanes", "event_contracts", "barrier", "finalization", "failure_policy", "frontend_rules", "conformance", "runtime_boundary"]) {
  if (!taskCollaborationEventSchema.required.includes(field)) {
    fail(`task collaboration event schema missing required ${field}`);
  }
}
if (taskCollaborationEventSchema.properties.schema.const !== "cardity.task_collaboration_event_contract.v1") {
  fail("task collaboration event schema has wrong const");
}
for (const event of ["account.task.employee.started", "account.task.employee.progress", "account.task.employee.handoff", "account.task.employee.completed"]) {
  if (!enumValues(taskCollaborationEventSchema, "/properties/collaborator_lanes/items/properties/lifecycle_events/items").includes(event)) {
    fail(`task collaboration event schema missing lifecycle event ${event}`);
  }
}

const guestViewAccessSchema = readJson("schemas/guest_view_access_contract_v1.schema.json");
for (const field of ["schema", "scope", "token_policy", "allowed_read_endpoints", "forbidden_actions", "sse_policy", "audit_policy", "conformance", "runtime_boundary"]) {
  if (!guestViewAccessSchema.required.includes(field)) {
    fail(`guest view access schema missing required ${field}`);
  }
}
if (guestViewAccessSchema.properties.schema.const !== "cardity.guest_view_access_contract.v1") {
  fail("guest view access schema has wrong const");
}

const securityReviewSchema = readJson("schemas/security_review_v1.schema.json");
for (const field of ["schema", "protocol", "ok", "summary", "findings"]) {
  if (!securityReviewSchema.required.includes(field)) fail(`security review schema missing required ${field}`);
}
for (const severity of ["error", "warning", "info"]) {
  if (!enumValues(securityReviewSchema, "/properties/findings/items/properties/severity").includes(severity)) {
    fail(`security review schema missing severity ${severity}`);
  }
}

const protocolDiffSchema = readJson("schemas/protocol_diff_v1.schema.json");
for (const field of ["schema", "old_protocol", "new_protocol", "compatible", "summary", "changes"]) {
  if (!protocolDiffSchema.required.includes(field)) fail(`protocol diff schema missing required ${field}`);
}
for (const severity of ["breaking", "warning", "info"]) {
  if (!enumValues(protocolDiffSchema, "/properties/changes/items/properties/severity").includes(severity)) {
    fail(`protocol diff schema missing severity ${severity}`);
  }
}

const conformanceSchema = readJson("schemas/conformance_report_v1.schema.json");
for (const field of ["schema", "target", "ok", "summary", "checks"]) {
  if (!conformanceSchema.required.includes(field)) fail(`conformance report schema missing required ${field}`);
}
for (const status of ["pass", "fail", "warn"]) {
  if (!enumValues(conformanceSchema, "/properties/checks/items/properties/status").includes(status)) {
    fail(`conformance report schema missing status ${status}`);
  }
}

const visualizationSchema = readJson("schemas/manifest_visualization_v1.schema.json");
for (const field of ["schema", "protocol", "summary", "nodes", "edges"]) {
  if (!visualizationSchema.required.includes(field)) fail(`manifest visualization schema missing required ${field}`);
}

const explainSchema = readJson("schemas/explain_result_v1.schema.json");
for (const field of ["schema", "protocol", "counts", "methods", "actions", "database", "permissions", "events", "external"]) {
  if (!explainSchema.required.includes(field)) fail(`explain result schema missing required ${field}`);
}
if (explainSchema.properties.schema.const !== "cardity.explain_result.v1") {
  fail("explain result schema has wrong schema const");
}

const packageSchema = readJson("schemas/package_v1.schema.json");
for (const field of ["schema", "package", "format", "files", "checksums"]) {
  if (!packageSchema.required.includes(field)) fail(`package schema missing required ${field}`);
}
for (const kind of ["protocol_source", "compiled_protocol", "abi", "agent_manifest"]) {
  if (!enumValues(packageSchema, "/$defs/file/properties/kind").includes(kind)) {
    fail(`package schema missing file kind ${kind}`);
  }
}

const ecosystemRegistrySchema = readJson("schemas/ecosystem_registry_v1.schema.json");
for (const field of ["schema", "collections", "templates", "schemas", "runtime_adapters", "runtimes", "badges", "packages"]) {
  if (!ecosystemRegistrySchema.required.includes(field)) fail(`ecosystem registry schema missing required ${field}`);
}

const runtimeAdapterSchema = readJson("schemas/runtime_adapter_contract_v1.schema.json");
for (const field of [
  "schema",
  "runtime",
  "supported_manifest_versions",
  "supported_action_contracts",
  "supported_projection_contracts",
  "capabilities",
  "conformance",
  "production_write_policy",
]) {
  if (!runtimeAdapterSchema.required.includes(field)) fail(`runtime adapter schema missing required ${field}`);
}
for (const mode of ["disabled", "dry_run_only", "permissioned"]) {
  if (!enumValues(runtimeAdapterSchema, "/properties/production_write_policy/properties/mode").includes(mode)) {
    fail(`runtime adapter schema missing production write mode ${mode}`);
  }
}

console.log(`Contract schemas verified for ${schemas.length} file(s)`);
