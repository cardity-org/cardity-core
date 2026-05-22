#!/usr/bin/env node
const fs = require("node:fs");

function readManifest(path) {
  const payload = JSON.parse(fs.readFileSync(path, "utf8"));
  return payload.manifest || payload;
}

function fail(path, message) {
  throw new Error(`${path}: ${message}`);
}

for (const path of process.argv.slice(2)) {
  const manifest = readManifest(path);
  const actions = manifest.system?.ui?.actions || [];
  if (!Array.isArray(actions) || actions.length === 0) fail(path, "missing system.ui.actions");
  for (const action of actions) {
    for (const field of [
      "kind",
      "intent_names",
      "intent_examples",
      "disambiguation_keys",
      "required_context",
      "input_schema",
      "permission",
      "confirm_required",
      "dry_run_supported",
      "readback_required",
      "readback_query",
      "idempotency_key",
      "risk_level",
      "side_effects",
      "audit_event",
      "replay_policy",
    ]) {
      if (!(field in action)) fail(path, `action ${action.name || "<unnamed>"} missing ${field}`);
    }
    if (!["query", "command", "external_navigation"].includes(action.kind)) {
      fail(path, `action ${action.name || "<unnamed>"} has invalid kind ${action.kind}`);
    }
    if (!Array.isArray(action.intent_names) || action.intent_names.length === 0) {
      fail(path, `action ${action.name || "<unnamed>"} missing intent names`);
    }
    if (!Array.isArray(action.intent_examples) || action.intent_examples.length === 0) {
      fail(path, `action ${action.name || "<unnamed>"} missing intent examples`);
    }
    if (!Array.isArray(action.disambiguation_keys)) {
      fail(path, `action ${action.name || "<unnamed>"} disambiguation_keys must be an array`);
    }
    if (!Array.isArray(action.required_context)) {
      fail(path, `action ${action.name || "<unnamed>"} required_context must be an array`);
    }
    if (!action.output_schema && !action.returns_read_model) {
      fail(path, `action ${action.name || "<unnamed>"} must define output_schema or returns_read_model`);
    }
    if (action.kind === "command") {
      if (!action.dry_run_supported) fail(path, `command ${action.name || "<unnamed>"} must support dry-run planning`);
      if (!action.confirm_required && action.permission) {
        fail(path, `permissioned command ${action.name || "<unnamed>"} must require confirmation`);
      }
    }
    if (!action.replay_policy || typeof action.replay_policy !== "object") {
      fail(path, `action ${action.name || "<unnamed>"} replay_policy must be an object`);
    }
  }
  if (!Array.isArray(manifest.system?.modules) || manifest.system.modules.length === 0) fail(path, "missing system.modules");
  for (const module of manifest.system.modules) {
    if (!Array.isArray(module.intent_names) || module.intent_names.length === 0) {
      fail(path, `module ${module.name || "<unnamed>"} missing intent_names`);
    }
  }
  if (!Array.isArray(manifest.system?.external?.navigation)) fail(path, "missing system.external.navigation");
  if (!Array.isArray(manifest.system?.external?.services)) fail(path, "missing system.external.services");
}

console.log(`Agent manifest contract verified for ${process.argv.length - 2} file(s)`);
