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

for (const schemaPath of [
  "schemas/diagnostics_v1.schema.json",
  "schemas/runtime_adapter_contract_v1.schema.json",
  "schemas/security_review_v1.schema.json",
  "schemas/protocol_diff_v1.schema.json",
  "schemas/conformance_report_v1.schema.json",
  "schemas/manifest_visualization_v1.schema.json",
]) {
  const schema = readJson(schemaPath);
  if (!schema.$id?.startsWith("https://cardity.org/schemas/")) fail(`${schemaPath}: missing public $id`);
  if (!schema.title) fail(`${schemaPath}: missing title`);
}

const registry = readJson("schemas/registry.json");
if (registry.schema !== "cardity.schema_registry.v1") fail("schema registry has wrong schema");
if (registry.schemas.length < 9) fail("schema registry missing contract entries");

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

console.log(`Next-stage assets verified: ${templateNames.length} template(s), 5 prompt(s), 6 schema(s)`);
