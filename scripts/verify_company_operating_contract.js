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

const schema = readJson("schemas/company_operating_contract_v1.schema.json");
const example = readJson("examples/12_company_operating_contract_v1.json");

if (schema.properties.schema.const !== "cardity.company_operating_contract.v1") {
  fail("company operating schema has wrong const");
}
for (const field of [
  "schema",
  "company",
  "operating_model",
  "systems",
  "digital_employees",
  "ownership_matrix",
  "governance",
  "evaluation",
  "conformance",
  "runtime_boundary"
]) {
  if (!schema.required.includes(field)) fail(`company operating schema missing required ${field}`);
  if (!(field in example)) fail(`company operating example missing ${field}`);
}

if (example.schema !== "cardity.company_operating_contract.v1") {
  fail("company operating example has wrong schema");
}
for (const key of ["enterprise_id", "account_id", "workspace_id"]) {
  if (!example.company.scope_keys.includes(key)) fail(`company example missing scope key ${key}`);
  if (!example.governance.scope_policy.required_scope_keys.includes(key)) {
    fail(`company governance missing required scope key ${key}`);
  }
}
if (example.governance.scope_policy.cross_tenant_policy !== "reject") {
  fail("company operating example must reject cross-tenant operations");
}

const systems = new Set(example.systems.map((system) => system.id));
for (const system of ["public_site", "operations_workspace", "customer_workspace"]) {
  if (!systems.has(system)) fail(`company operating example missing system ${system}`);
}

const employees = new Set(example.digital_employees.map((employee) => employee.id));
for (const employee of ["employee_planner", "employee_engineering", "employee_content", "employee_reviewer"]) {
  if (!employees.has(employee)) fail(`company operating example missing employee ${employee}`);
}
for (const employee of example.digital_employees) {
  if (!Array.isArray(employee.skill_whitelist)) fail(`${employee.id} missing skill_whitelist`);
  if (!employee.scope_authority || typeof employee.scope_authority !== "object") {
    fail(`${employee.id} missing scope_authority`);
  }
}

function requireEmployeeRefs(refs, label) {
  for (const ref of refs) {
    if (!employees.has(ref)) fail(`${label} references unknown digital employee ${ref}`);
  }
}

const publicSite = example.ownership_matrix.find((item) => item.system_id === "public_site");
if (!publicSite) fail("company operating example missing public_site ownership matrix");
for (const owner of ["employee_engineering", "employee_content"]) {
  if (!publicSite.owners.includes(owner)) fail(`public_site ownership missing ${owner}`);
}
if (!publicSite.reviewers.includes("employee_reviewer")) {
  fail("public_site ownership missing reviewer employee");
}
if (!publicSite.checkpoints.includes("production_readback_verified")) {
  fail("public_site ownership missing production readback checkpoint");
}
for (const item of example.ownership_matrix) {
  requireEmployeeRefs(item.owners, `${item.system_id}.owners`);
  requireEmployeeRefs(item.reviewers, `${item.system_id}.reviewers`);
}

if (!example.evaluation.reviewer_roles.includes("employee_reviewer")) {
  fail("company evaluation missing reviewer employee");
}
requireEmployeeRefs(example.evaluation.reviewer_roles, "evaluation.reviewer_roles");
const capabilityGapEmployee = example.digital_employees.find((employee) => (
  employee.responsibilities.includes("capability gap review")
  || (employee.scope_authority.propose || []).includes("capability_gap")
));
if (!capabilityGapEmployee) {
  fail("company example missing capability gap responsibility on a digital employee");
}
for (const event of ["employee.handoff.created", "checkpoint.recorded", "employee.evaluation.recorded", "capability_gap.proposed"]) {
  if (!example.governance.audit_policy.required_events.includes(event)) {
    fail(`company audit policy missing event ${event}`);
  }
}
if (!example.runtime_boundary.cardity_owns.includes("company operating blueprint")) {
  fail("company runtime boundary missing Cardity blueprint ownership");
}
if (!example.runtime_boundary.runtime_owns.includes("employee runtime set")) {
  fail("company runtime boundary missing runtime employee ownership");
}

console.log("Company operating contract verification passed");
