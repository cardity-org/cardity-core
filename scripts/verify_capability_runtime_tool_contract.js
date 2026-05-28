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

const schema = readJson("schemas/capability_runtime_tool_contract_v1.schema.json");
const example = readJson("examples/14_capability_runtime_tool_contract_v1.json");

if (schema.properties.schema.const !== "cardity.capability_runtime_tool_contract.v1") {
  fail("capability runtime tool schema has wrong const");
}
for (const field of ["schema", "scope", "visibility_policy", "capability_tools", "conformance", "runtime_boundary"]) {
  if (!schema.required.includes(field)) fail(`capability runtime tool schema missing required ${field}`);
  if (!(field in example)) fail(`capability runtime tool example missing ${field}`);
}
for (const risk of ["low", "medium", "high", "critical"]) {
  if (!enumValues(schema, "/properties/capability_tools/items/properties/risk_level").includes(risk)) {
    fail(`capability runtime tool schema missing risk level ${risk}`);
  }
}
if (example.schema !== "cardity.capability_runtime_tool_contract.v1") {
  fail("capability runtime tool example has wrong schema");
}
if (example.visibility_policy.default_visibility !== "hidden") {
  fail("capability runtime tool example must default to hidden visibility");
}
if (!example.visibility_policy.deny_unknown_tools) {
  fail("capability runtime tool example must deny unknown tools");
}
if (!example.visibility_policy.deny_unlisted_employee_ids) {
  fail("capability runtime tool example must deny unlisted employee ids");
}
if (example.visibility_policy.terminal_tool_policy !== "forbidden") {
  fail("capability runtime tool example must forbid terminal tools");
}

const requiredSkillSlugs = [
  "web.site.build",
  "web.site.iterate",
  "marketing.seo.optimize",
  "marketing.poster.design",
  "visual.brand_system_maintain",
  "sales.outreach_draft"
];
const skillSlugs = new Set(example.capability_tools.map((entry) => entry.skill_slug));
for (const skillSlug of requiredSkillSlugs) {
  if (!skillSlugs.has(skillSlug)) fail(`capability runtime tool example missing ${skillSlug}`);
}
for (const entry of example.capability_tools) {
  if (!entry.employee_role) fail(`${entry.skill_slug} missing employee_role`);
  if (!entry.allowed_runtime_tools.length) fail(`${entry.skill_slug} missing allowed_runtime_tools`);
  if (!entry.forbidden_runtime_tools.includes("terminal.exec")) {
    fail(`${entry.skill_slug} must forbid terminal.exec`);
  }
  if (!entry.forbidden_runtime_tools.includes("shell.exec")) {
    fail(`${entry.skill_slug} must forbid shell.exec`);
  }
  if (!entry.forbidden_runtime_tools.includes("erp.*")) {
    fail(`${entry.skill_slug} must forbid erp.*`);
  }
  if (!entry.allowed_employee_ids.length) fail(`${entry.skill_slug} missing allowed_employee_ids`);
  if (entry.risk_level !== "low" && entry.requires_confirm !== true) {
    fail(`${entry.skill_slug} must require confirmation for ${entry.risk_level} risk`);
  }
  if (!entry.audit_event) fail(`${entry.skill_slug} missing audit_event`);
}
for (const check of ["unknown_tools_denied", "terminal_tools_forbidden", "employee_ids_whitelisted"]) {
  if (!example.conformance.checks.includes(check)) {
    fail(`capability runtime tool example missing conformance check ${check}`);
  }
}
if (!example.runtime_boundary.cardity_owns.includes("capability to runtime tool visibility contract")) {
  fail("capability runtime tool example missing Cardity boundary");
}
if (!example.runtime_boundary.runtime_owns.includes("runtime permission enforcement")) {
  fail("capability runtime tool example missing runtime enforcement boundary");
}

console.log("Capability runtime tool contract verification passed");
