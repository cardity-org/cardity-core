#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function fail(message) {
  throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const nextStageSchemaPaths = [
  "schemas/diagnostics_v1.schema.json",
  "schemas/runtime_adapter_contract_v1.schema.json",
  "schemas/production_write_contract_v1.schema.json",
  "schemas/checkpoint_contract_v1.schema.json",
  "schemas/workspace_generation_contract_v1.schema.json",
  "schemas/agent_orchestration_contract_v1.schema.json",
  "schemas/company_operating_contract_v1.schema.json",
  "schemas/capability_runtime_tool_contract_v1.schema.json",
  "schemas/workspace_conversation_scope_contract_v1.schema.json",
  "schemas/task_collaboration_event_contract_v1.schema.json",
  "schemas/guest_view_access_contract_v1.schema.json",
  "schemas/security_review_v1.schema.json",
  "schemas/protocol_diff_v1.schema.json",
  "schemas/conformance_report_v1.schema.json",
  "schemas/manifest_visualization_v1.schema.json",
  "schemas/package_v1.schema.json",
  "schemas/ecosystem_registry_v1.schema.json",
];

for (const schemaPath of nextStageSchemaPaths) {
  const schema = readJson(schemaPath);
  if (!schema.$id?.startsWith("https://cardity.org/schemas/")) fail(`${schemaPath}: missing public $id`);
  if (!schema.title) fail(`${schemaPath}: missing title`);
}

const registry = readJson("schemas/registry.json");
if (registry.schema !== "cardity.schema_registry.v1") fail("schema registry has wrong schema");
if (registry.schemas.length < 9) fail("schema registry missing contract entries");

const runtimeRegistry = readJson("registry/runtimes.json");
if (runtimeRegistry.schema !== "cardity.runtime_compatibility_registry.v1") {
  fail("runtime compatibility registry has wrong schema");
}
const pmtsoulRuntime = runtimeRegistry.runtimes.find((runtime) => runtime.id === "pmtsoul-agent-os");
if (!pmtsoulRuntime) fail("runtime compatibility registry missing pmtsoul-agent-os");
if (pmtsoulRuntime.production_write_policy?.mode !== "dry_run_only") {
  fail("pmtsoul-agent-os must remain dry_run_only until write permission contract exists");
}

const diagnostics = readJson("schemas/diagnostics_v1.schema.json");
for (const field of ["error_code", "severity", "message", "repair_hint"]) {
  if (!diagnostics.$defs.diagnostic.required.includes(field)) {
    fail(`diagnostics schema missing required ${field}`);
  }
}

const adapter = readJson("schemas/runtime_adapter_contract_v1.schema.json");
if (!adapter.required.includes("production_write_policy")) {
  fail("runtime adapter schema missing production_write_policy");
}
for (const field of [
  "register_actions",
  "permission_gate",
  "dry_run_executor",
  "write_executor",
  "readback_executor",
  "audit_sink",
  "replay_guard",
]) {
  if (!adapter.properties.capabilities.required.includes(field)) {
    fail(`runtime adapter schema missing capability ${field}`);
  }
}

const productionWrite = readJson("schemas/production_write_contract_v1.schema.json");
for (const field of ["permission", "confirm_policy", "confirmation_ui", "readback", "idempotency", "audit", "replay_policy"]) {
  if (!productionWrite.required.includes(field)) {
    fail(`production write schema missing required ${field}`);
  }
}
const productionWriteExample = readJson("examples/04_production_write_contract_v1.json");
if (productionWriteExample.schema !== "cardity.production_write_contract.v1") {
  fail("production write example has wrong schema");
}
for (const field of productionWrite.required) {
  if (!(field in productionWriteExample)) fail(`production write example missing ${field}`);
}

const checkpoint = readJson("schemas/checkpoint_contract_v1.schema.json");
for (const field of ["scope", "checkpoints", "ledger", "recovery_policy"]) {
  if (!checkpoint.required.includes(field)) {
    fail(`checkpoint schema missing required ${field}`);
  }
}
const checkpointExample = readJson("examples/05_checkpoint_contract_v1.json");
if (checkpointExample.schema !== "cardity.checkpoint_contract.v1") {
  fail("checkpoint example has wrong schema");
}
for (const field of checkpoint.required) {
  if (!(field in checkpointExample)) fail(`checkpoint example missing ${field}`);
}

const workspaceGeneration = readJson("schemas/workspace_generation_contract_v1.schema.json");
for (const field of ["tenant_scope", "workspace", "resource_mapping", "role_tool_bindings", "account_conformance"]) {
  if (!workspaceGeneration.required.includes(field)) {
    fail(`workspace generation schema missing required ${field}`);
  }
}
const workspaceGenerationExample = readJson("examples/07_workspace_generation_contract_v1.json");
if (workspaceGenerationExample.schema !== "cardity.workspace_generation_contract.v1") {
  fail("workspace generation example has wrong schema");
}
for (const field of workspaceGeneration.required) {
  if (!(field in workspaceGenerationExample)) fail(`workspace generation example missing ${field}`);
}

const agentOrchestration = readJson("schemas/agent_orchestration_contract_v1.schema.json");
for (const field of ["roles", "authority", "handoffs", "verification", "coordination", "failure_policy"]) {
  if (!agentOrchestration.required.includes(field)) {
    fail(`agent orchestration schema missing required ${field}`);
  }
}
const agentOrchestrationExample = readJson("examples/08_agent_orchestration_contract_v1.json");
if (agentOrchestrationExample.schema !== "cardity.agent_orchestration_contract.v1") {
  fail("agent orchestration example has wrong schema");
}
for (const field of agentOrchestration.required) {
  if (!(field in agentOrchestrationExample)) fail(`agent orchestration example missing ${field}`);
}

const companyOperating = readJson("schemas/company_operating_contract_v1.schema.json");
const companyOperatingCanonicalFields = ["schema", "company", "operating_model", "systems", "digital_employees", "ownership_matrix", "governance", "evaluation", "conformance", "runtime_boundary"];
for (const field of companyOperatingCanonicalFields) {
  if (!companyOperating.required.includes(field)) {
    fail(`company operating schema missing required ${field}`);
  }
}
for (const field of ["hiring", "memory", "knowledge_base"]) {
  if (companyOperating.required.includes(field)) {
    fail(`company operating schema should not require top-level ${field}`);
  }
  if (companyOperating.properties[field]) {
    fail(`company operating schema should not define top-level ${field}`);
  }
}
const companyOperatingExample = readJson("examples/12_company_operating_contract_v1.json");
if (companyOperatingExample.schema !== "cardity.company_operating_contract.v1") {
  fail("company operating example has wrong schema");
}
for (const field of Object.keys(companyOperatingExample)) {
  if (!companyOperatingCanonicalFields.includes(field)) {
    fail(`company operating example includes non-canonical top-level ${field}`);
  }
}
for (const key of ["enterprise_id", "account_id", "workspace_id"]) {
  if (!companyOperatingExample.company.scope_keys.includes(key)) {
    fail(`company operating example missing scope key ${key}`);
  }
}
const aiCompanyBootstrapExample = readJson("examples/13_ai_company_bootstrap_contract_v1.json");
if (aiCompanyBootstrapExample.schema !== "cardity.company_operating_contract.v1") {
  fail("AI company bootstrap example has wrong schema");
}
for (const field of Object.keys(aiCompanyBootstrapExample)) {
  if (!companyOperatingCanonicalFields.includes(field)) {
    fail(`AI company bootstrap example includes non-canonical top-level ${field}`);
  }
}
for (const key of ["enterprise_id", "account_id", "company_id"]) {
  if (!aiCompanyBootstrapExample.company.scope_keys.includes(key)) {
    fail(`AI company bootstrap example missing scope key ${key}`);
  }
}
if (!exists("docs/ai_company_bootstrap_reference.md")) fail("missing AI company bootstrap docs");

const capabilityRuntimeTool = readJson("schemas/capability_runtime_tool_contract_v1.schema.json");
for (const field of ["scope", "visibility_policy", "capability_tools", "conformance", "runtime_boundary"]) {
  if (!capabilityRuntimeTool.required.includes(field)) {
    fail(`capability runtime tool schema missing required ${field}`);
  }
}
const capabilityRuntimeToolExample = readJson("examples/14_capability_runtime_tool_contract_v1.json");
if (capabilityRuntimeToolExample.schema !== "cardity.capability_runtime_tool_contract.v1") {
  fail("capability runtime tool example has wrong schema");
}
for (const skillSlug of ["web.site.build", "web.site.iterate", "marketing.seo.optimize", "marketing.poster.design", "visual.brand_system_maintain", "sales.outreach_draft"]) {
  if (!capabilityRuntimeToolExample.capability_tools.find((item) => item.skill_slug === skillSlug)) {
    fail(`capability runtime tool example missing ${skillSlug}`);
  }
}
if (!exists("docs/capability_runtime_tool_contract_v1.md")) {
  fail("missing capability runtime tool contract docs");
}

const workspaceConversationScope = readJson("schemas/workspace_conversation_scope_contract_v1.schema.json");
for (const field of ["scope", "canonical_fields", "routing_rules", "endpoint_contracts", "repair_policy", "frontend_rules", "conformance", "runtime_boundary"]) {
  if (!workspaceConversationScope.required.includes(field)) {
    fail(`workspace conversation scope schema missing required ${field}`);
  }
}
const workspaceConversationScopeExample = readJson("examples/15_workspace_conversation_scope_contract_v1.json");
if (workspaceConversationScopeExample.schema !== "cardity.workspace_conversation_scope_contract.v1") {
  fail("workspace conversation scope example has wrong schema");
}
for (const scope of ["chat", "workspace"]) {
  if (!workspaceConversationScopeExample.scope.conversation_scopes.includes(scope)) {
    fail(`workspace conversation scope example missing ${scope}`);
  }
}
if (!workspaceConversationScopeExample.endpoint_contracts.find((endpoint) => endpoint.endpoint === "/api/sessions" && endpoint.returns_scope === "chat")) {
  fail("workspace conversation scope example missing chat sessions endpoint");
}
if (!workspaceConversationScopeExample.endpoint_contracts.find((endpoint) => endpoint.endpoint === "/api/v1/workspace/conversation" && endpoint.returns_scope === "workspace")) {
  fail("workspace conversation scope example missing workspace endpoint");
}
if (!exists("docs/workspace_conversation_scope_contract_v1.md")) {
  fail("missing workspace conversation scope contract docs");
}

const taskCollaborationEvent = readJson("schemas/task_collaboration_event_contract_v1.schema.json");
for (const field of ["scope", "task_lead", "collaborator_lanes", "event_contracts", "barrier", "finalization", "failure_policy", "frontend_rules", "conformance", "runtime_boundary"]) {
  if (!taskCollaborationEvent.required.includes(field)) {
    fail(`task collaboration event schema missing required ${field}`);
  }
}
const taskCollaborationEventExample = readJson("examples/16_task_collaboration_event_contract_v1.json");
if (taskCollaborationEventExample.schema !== "cardity.task_collaboration_event_contract.v1") {
  fail("task collaboration event example has wrong schema");
}
for (const event of ["account.task.employee.started", "account.task.employee.progress", "account.task.employee.handoff", "account.task.employee.completed"]) {
  if (!taskCollaborationEventExample.event_contracts.find((item) => item.event === event)) {
    fail(`task collaboration event example missing ${event}`);
  }
}
if (!exists("docs/task_collaboration_event_contract_v1.md")) {
  fail("missing task collaboration event contract docs");
}

const guestViewAccess = readJson("schemas/guest_view_access_contract_v1.schema.json");
for (const field of ["scope", "token_policy", "allowed_read_endpoints", "forbidden_actions", "sse_policy", "audit_policy", "conformance", "runtime_boundary"]) {
  if (!guestViewAccess.required.includes(field)) {
    fail(`guest view access schema missing required ${field}`);
  }
}
const guestViewAccessExample = readJson("examples/17_guest_view_access_contract_v1.json");
if (guestViewAccessExample.schema !== "cardity.guest_view_access_contract.v1") {
  fail("guest view access example has wrong schema");
}
for (const action of ["mutation", "chat.send", "message.send", "task.approve", "task.run", "tool.execute"]) {
  if (!guestViewAccessExample.forbidden_actions.find((item) => item.action === action)) {
    fail(`guest view access example missing forbidden action ${action}`);
  }
}
if (!exists("docs/guest_view_access_contract_v1.md")) {
  fail("missing guest view access contract docs");
}

const benchDemo = readJson("examples/06_cardity_bench_demo.json");
if (benchDemo.schema !== "cardity.bench_demo.v1") {
  fail("bench demo has wrong schema");
}
if (!exists("docs/cardity_bench_demo.md")) fail("missing Cardity bench demo docs");

const pmtsoulAdapter = readJson("examples/runtime_adapter_pmtsoul_agent_os.json");
if (pmtsoulAdapter.schema !== "cardity.runtime_adapter_contract.v1") {
  fail("PMTSoul runtime adapter example has wrong schema");
}
if (!pmtsoulAdapter.supported_projection_contracts.includes("projection_contract_v1_1")) {
  fail("PMTSoul runtime adapter example must support projection_contract_v1_1");
}

const securityReview = readJson("schemas/security_review_v1.schema.json");
for (const field of ["schema", "protocol", "ok", "summary", "findings"]) {
  if (!securityReview.required.includes(field)) fail(`security review schema missing required ${field}`);
}

const protocolDiff = readJson("schemas/protocol_diff_v1.schema.json");
for (const field of ["schema", "old_protocol", "new_protocol", "compatible", "summary", "changes"]) {
  if (!protocolDiff.required.includes(field)) fail(`protocol diff schema missing required ${field}`);
}

const conformance = readJson("schemas/conformance_report_v1.schema.json");
for (const field of ["schema", "target", "ok", "summary", "checks"]) {
  if (!conformance.required.includes(field)) fail(`conformance report schema missing required ${field}`);
}

const visualization = readJson("schemas/manifest_visualization_v1.schema.json");
for (const field of ["schema", "protocol", "summary", "nodes", "edges"]) {
  if (!visualization.required.includes(field)) fail(`manifest visualization schema missing required ${field}`);
}

const packageSchema = readJson("schemas/package_v1.schema.json");
for (const field of ["schema", "package", "format", "files", "checksums"]) {
  if (!packageSchema.required.includes(field)) fail(`package schema missing required ${field}`);
}

const ecosystemRegistrySchema = readJson("schemas/ecosystem_registry_v1.schema.json");
for (const field of ["schema", "collections", "templates", "schemas", "runtime_adapters", "runtimes", "badges", "packages"]) {
  if (!ecosystemRegistrySchema.required.includes(field)) fail(`ecosystem registry schema missing required ${field}`);
}

const ecosystemRegistry = readJson("registry/catalog.json");
if (ecosystemRegistry.schema !== "cardity.ecosystem_registry.v1") {
  fail("ecosystem registry has wrong schema");
}
for (const collection of ["templates", "schemas", "runtime_adapters", "runtimes", "badges", "packages"]) {
  if (!Array.isArray(ecosystemRegistry[collection])) fail(`ecosystem registry missing ${collection}`);
  if (!ecosystemRegistry.collections?.[collection]) fail(`ecosystem registry missing collection URL for ${collection}`);
}
if (!ecosystemRegistry.templates.find((item) => item.id === "member_points")) {
  fail("ecosystem registry missing member_points template");
}
if (!ecosystemRegistry.runtimes.find((item) => item.id === "pmtsoul-agent-os")) {
  fail("ecosystem registry missing pmtsoul-agent-os runtime");
}
if (!ecosystemRegistry.packages.find((item) => item.schema === "cardity.package.v1")) {
  fail("ecosystem registry missing cardity package example");
}

for (const prompt of [
  "prompts/cardity_protocol_author.md",
  "prompts/cardity_diagnostics_repair.md",
  "prompts/cardity_manifest_reviewer.md",
  "prompts/cardity_projection_designer.md",
  "prompts/cardity_security_reviewer.md",
]) {
  if (!exists(prompt)) fail(`missing prompt ${prompt}`);
}

const templateRoot = path.join(root, "templates");
const templateNames = fs.readdirSync(templateRoot)
  .filter((name) => fs.statSync(path.join(templateRoot, name)).isDirectory())
  .sort();
if (templateNames.length < 4) fail("expected at least four templates");

for (const name of templateNames) {
  const metadataPath = `templates/${name}/cardity.template.json`;
  const metadata = readJson(metadataPath);
  if (metadata.name !== name) fail(`${metadataPath}: name must match directory`);
  if (!metadata.entry || !exists(`templates/${name}/${metadata.entry}`)) {
    fail(`${metadataPath}: entry file missing`);
  }
  if (!exists(`templates/${name}/README.md`)) fail(`${name}: README missing`);
}

console.log(`Next-stage assets verified: ${templateNames.length} template(s), 5 prompt(s), ${nextStageSchemaPaths.length} schema(s)`);
