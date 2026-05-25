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
