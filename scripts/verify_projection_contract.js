#!/usr/bin/env node
const fs = require("node:fs");

function readJson(path) {
  const payload = JSON.parse(fs.readFileSync(path, "utf8"));
  return payload.manifest || payload;
}

function collectEventRefs(value, refs = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$event\.([A-Za-z_][A-Za-z0-9_]*)/g)) refs.add(match[1]);
  } else if (Array.isArray(value)) {
    for (const item of value) collectEventRefs(item, refs);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectEventRefs(item, refs);
  }
  return refs;
}

function fieldsFor(event) {
  return new Set([...(event.params || []), ...(event.runtime_fields || [])]
    .map((field) => field && field.name)
    .filter(Boolean));
}

function verify(path) {
  const manifest = readJson(path);
  const events = manifest.events || manifest.agent?.events || manifest.system?.database?.events || [];
  const projections = manifest.system?.database?.projections || [];
  const eventFields = new Map(events.map((event) => [event.name, fieldsFor(event)]));

  for (const projection of projections) {
    const refs = collectEventRefs(projection);
    if (refs.size) {
      const eventName = projection.on?.event;
      const declared = eventFields.get(eventName);
      if (!declared) throw new Error(`${path}: ${projection.name} references $event.* without a known trigger event`);
      for (const ref of refs) {
        if (!declared.has(ref)) {
          throw new Error(`${path}: ${projection.name} references undeclared $event.${ref}`);
        }
      }
    }

    if (projection.source === "confirmed_readback" && projection.idempotency?.source_id !== "$event.id") {
      throw new Error(`${path}: ${projection.name} confirmed_readback projection must use idempotency.source_id = $event.id`);
    }
    if (projection.idempotency && projection.idempotency.write_index !== "$event.write_index") {
      throw new Error(`${path}: ${projection.name} must use idempotency.write_index = $event.write_index`);
    }
  }
}

const paths = process.argv.slice(2);
if (!paths.length) {
  console.error("Usage: verify_projection_contract.js <manifest-or-compile-result.json> [...]");
  process.exit(2);
}

for (const path of paths) verify(path);
console.log(`Projection contract verified for ${paths.length} file(s)`);
