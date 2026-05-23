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
  "schemas/projection_contract_v1_1.schema.json",
];

for (const schemaPath of schemas) {
  const schema = readJson(schemaPath);
  if (!schema.$schema) fail(`${schemaPath}: missing $schema`);
  if (!schema.$id?.startsWith("https://cardity.org/schemas/")) fail(`${schemaPath}: missing cardity.org $id`);
  if (!schema.title) fail(`${schemaPath}: missing title`);
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

console.log(`Contract schemas verified for ${schemas.length} file(s)`);
